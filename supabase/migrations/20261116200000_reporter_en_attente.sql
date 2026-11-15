-- Report en liste d'attente depuis le plan de chargement (étape 10b, RG-10, RG-11).
--
-- Quand tout ne rentre pas dans la caisse, l'utilisateur reporte soit les
-- articles en trop, soit la commande entière. Chaque report touche plusieurs
-- tables (lignes, placements, commandes, liste d'attente) : il se fait dans
-- une fonction PostgreSQL, donc en une seule transaction, « tout ou rien »,
-- comme enregistrer_commande (migration du 16 novembre).
--
-- Deux fonctions :
-- - reporter_articles : des unités sans place rejoignent la liste d'attente ;
--   une ligne reportée en partie est scindée en deux ;
-- - reporter_commande : une commande entière quitte la tournée.
--
-- Une ligne reportée seule reste dans sa commande d'origine, citée par un
-- élément en attente, jusqu'à son affectation à une autre tournée
-- (affecter_element_attente) : c'est l'application qui l'ignore au calcul.
--
-- SECURITY INVOKER (le défaut) : les fonctions s'exécutent avec les droits du
-- rôle anon, et les politiques RLS s'appliquent. V1 sans compte (RG-17) : ces
-- politiques sont ouvertes, à durcir quand les comptes arriveront. Aucun
-- nouveau droit sur les tables n'est nécessaire : anon peut déjà ajouter des
-- lignes et des éléments en attente, modifier lignes, commandes et
-- placements, et marquer un plan « à recalculer ».

-- ---------------------------------------------------------------------------
-- reporter_articles
-- ---------------------------------------------------------------------------
--
-- p_reports : tableau JSON [{ "ligne_commande_id": …, "quantite": … }].
-- Pour chaque ligne, « quantite » unités sans placement sont reportées :
-- - toute la ligne : un élément en attente la cite ;
-- - une partie : une nouvelle ligne, copie de l'originale avec la quantité
--   reportée, est ajoutée à la fin de la commande et citée par l'élément ;
--   l'originale garde le reste. Ses placements sont renumérotés 1, 2… dans
--   chaque version du plan : les unités d'une ligne sont identiques, seul
--   leur nombre compte, et aucune ne bouge.
--
-- Refus (rien n'est changé) :
-- - tournée absente, ligne hors d'une commande de la tournée : P0002 ;
-- - tournée qui n'est plus en préparation, quantité hors de 1 à la quantité
--   de la ligne : 23514 (violation de contrainte).
create or replace function public.reporter_articles(
  p_tournee_id uuid,
  p_reports jsonb,
  p_motif text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_statut text;
  v_report jsonb;
  v_ligne public.ligne_commande;
  v_rang integer;
  v_quantite integer;
  v_citee uuid;
begin
  select statut into v_statut from public.tournee where id = p_tournee_id;
  if v_statut is null then
    raise exception 'tournee_introuvable' using errcode = 'P0002';
  end if;
  if v_statut <> 'en_preparation' then
    raise exception 'tournee_hors_preparation' using errcode = '23514';
  end if;

  for v_report in select * from jsonb_array_elements(p_reports) loop
    v_quantite := (v_report ->> 'quantite')::integer;

    select l.* into v_ligne
      from public.ligne_commande l
      join public.commande c on c.id = l.commande_id
      where l.id = (v_report ->> 'ligne_commande_id')::uuid
        and c.tournee_id = p_tournee_id;
    if not found then
      raise exception 'ligne_introuvable' using errcode = 'P0002';
    end if;
    if v_quantite is null or v_quantite < 1 or v_quantite > v_ligne.quantite then
      raise exception 'quantite_a_reporter_invalide' using errcode = '23514';
    end if;

    select rang_livraison into v_rang from public.commande where id = v_ligne.commande_id;

    if v_quantite = v_ligne.quantite then
      v_citee := v_ligne.id;
    else
      -- La partie reportée devient une ligne à part, à la fin de la commande.
      insert into public.ligne_commande (
        commande_id, article_id, quantite, nu,
        longueur_propre, largeur_propre, hauteur_propre,
        poids_propre, poids_estime, numero_ligne
      )
      values (
        v_ligne.commande_id, v_ligne.article_id, v_quantite, v_ligne.nu,
        v_ligne.longueur_propre, v_ligne.largeur_propre, v_ligne.hauteur_propre,
        v_ligne.poids_propre, v_ligne.poids_estime,
        (select max(numero_ligne) + 1 from public.ligne_commande
          where commande_id = v_ligne.commande_id)
      )
      returning id into v_citee;

      update public.ligne_commande
        set quantite = v_ligne.quantite - v_quantite
        where id = v_ligne.id;

      -- Renumérotation en deux temps : la contrainte placement_unite_unique
      -- est vérifiée à chaque ligne modifiée. On écarte d'abord les numéros,
      -- puis on les ramène à 1, 2… dans l'ordre d'origine, plan par plan.
      update public.placement
        set numero_unite = numero_unite + 1000000
        where ligne_commande_id = v_ligne.id;
      update public.placement p
        set numero_unite = n.nouveau
        from (
          select id, row_number() over (partition by plan_id order by numero_unite) as nouveau
          from public.placement
          where ligne_commande_id = v_ligne.id
        ) n
        where p.id = n.id;
    end if;

    insert into public.element_attente (
      commande_id, ligne_commande_id, tournee_origine_id, rang_origine, motif
    )
    values (v_ligne.commande_id, v_citee, p_tournee_id, v_rang, p_motif);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- reporter_commande
-- ---------------------------------------------------------------------------
--
-- La commande quitte sa tournée (tournee_id et rang vides) et rejoint la liste
-- d'attente avec son rang d'origine. Les commandes livrées après elle avancent
-- d'un rang : C1, C3, C4 deviennent C1, C2, C3, et l'ordre de livraison ne
-- change pas. Les éléments qui citaient déjà une de ses lignes sont remplacés
-- par la commande entière. Si la dernière version du plan plaçait un de ses
-- articles, elle est marquée « à recalculer » : l'application relance le
-- calcul juste après, et le plan reste juste même si ce calcul échoue.
--
-- Refus : commande absente ou hors tournée (P0002), tournée qui n'est plus en
-- préparation (23514).
create or replace function public.reporter_commande(p_commande_id uuid, p_motif text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_commande public.commande;
  v_statut text;
  v_plan uuid;
begin
  select * into v_commande from public.commande where id = p_commande_id;
  if not found or v_commande.tournee_id is null then
    raise exception 'commande_introuvable' using errcode = 'P0002';
  end if;
  select statut into v_statut from public.tournee where id = v_commande.tournee_id;
  if v_statut <> 'en_preparation' then
    raise exception 'tournee_hors_preparation' using errcode = '23514';
  end if;

  delete from public.element_attente where commande_id = p_commande_id;
  insert into public.element_attente (
    commande_id, ligne_commande_id, tournee_origine_id, rang_origine, motif
  )
  values (p_commande_id, null, v_commande.tournee_id, v_commande.rang_livraison, p_motif);

  update public.commande
    set tournee_id = null, rang_livraison = null
    where id = p_commande_id;
  update public.commande
    set rang_livraison = rang_livraison - 1
    where tournee_id = v_commande.tournee_id
      and rang_livraison > v_commande.rang_livraison;

  select id into v_plan from public.plan_chargement
    where tournee_id = v_commande.tournee_id
    order by version desc
    limit 1;
  if v_plan is not null and exists (
    select 1 from public.placement p
      join public.ligne_commande l on l.id = p.ligne_commande_id
      where p.plan_id = v_plan and l.commande_id = p_commande_id
  ) then
    update public.plan_chargement set a_recalculer = true where id = v_plan;
  end if;
end;
$$;

-- Seul le rôle anon (l'application, V1 sans compte, RG-17) peut les appeler.
revoke execute on function public.reporter_articles(uuid, jsonb, text) from public;
revoke execute on function public.reporter_commande(uuid, text) from public;
grant execute on function public.reporter_articles(uuid, jsonb, text) to anon;
grant execute on function public.reporter_commande(uuid, text) to anon;
