-- Commandes et liste d'attente en opérations « tout ou rien » (étape 9).
--
-- Jusqu'ici, enregistrer une commande demandait trois requêtes (la commande,
-- la suppression de ses lignes, l'insertion des nouvelles) : si la dernière
-- échouait, la commande restait sans lignes. Et remplacer toutes les lignes
-- faisait perdre au plan tous leurs placements, même pour une ligne inchangée.
--
-- Une fonction PostgreSQL s'exécute dans une seule transaction : si une
-- instruction échoue, tout ce qu'elle a déjà fait est annulé. Le dépôt
-- l'appelle avec `client.rpc(...)`. Trois fonctions :
-- - enregistrer_commande : la commande et ses lignes, modifiées en place ;
--   seules les lignes vraiment changées perdent leurs placements ;
-- - reordonner_commandes : le nouvel ordre de livraison (RG-07) ;
-- - affecter_element_attente : un élément de la liste d'attente rejoint une
--   tournée en préparation (RG-11).
--
-- Les fonctions sont en SECURITY INVOKER (le défaut) : elles s'exécutent avec
-- les droits de l'appelant, le rôle anon, et les politiques RLS s'appliquent
-- comme pour une requête ordinaire. Rien n'est contourné.

-- ---------------------------------------------------------------------------
-- Ajustements du schéma
-- ---------------------------------------------------------------------------

-- Rang de la commande dans sa tournée d'origine : le code (C5) affiché dans
-- la liste d'attente (capture 10). Une commande entière en attente perd son
-- rang (contrainte commande_rang_si_tournee) : on le garde ici.
alter table public.element_attente
  add column rang_origine integer check (rang_origine > 0);

-- Réordonner les lignes d'une commande échange leurs numéros : la contrainte
-- d'unicité n'est vérifiée qu'à la fin de la transaction (DEFERRABLE), pas
-- après chaque mise à jour.
alter table public.ligne_commande drop constraint ligne_numero_unique;
alter table public.ligne_commande
  add constraint ligne_numero_unique unique (commande_id, numero_ligne)
  deferrable initially deferred;

-- Une ligne changée perd ses placements, et une ligne affectée à une autre
-- tournée quitte le plan d'origine : le rôle anon doit pouvoir supprimer des
-- placements. V1 sans compte (RG-17) : politique ouverte, à durcir avec les
-- comptes, comme toutes les autres (voir la migration initiale).
grant delete on public.placement to anon;
create policy placement_suppression on public.placement for delete to anon using (true);

-- ---------------------------------------------------------------------------
-- enregistrer_commande
-- ---------------------------------------------------------------------------
--
-- p_commande : objet JSON aux noms de colonnes de la table commande ; sans
--   « id », la commande est créée.
-- p_lignes : tableau JSON, dans l'ordre voulu, aux noms de colonnes de
--   ligne_commande (sans commande_id ni numero_ligne). Une ligne avec « id »
--   est modifiée en place ; sans « id », elle est ajoutée. Les lignes de la
--   commande absentes du tableau sont supprimées (leurs placements suivent
--   par cascade).
--
-- Une ligne est « vraiment changée » si son article, sa quantité, sa
-- livraison nue, ses dimensions propres ou son poids propre changent : elle
-- perd alors ses placements. Le seul marquage « estimé » ne compte pas. C'est
-- la règle de `ligneModifiee` (src/domaine/saisie-commande.ts).
--
-- Rend { commande, lignes, lignes_changees } : la commande, ses lignes dans
-- l'ordre, et les identifiants des lignes ajoutées ou changées.
create function public.enregistrer_commande(p_commande jsonb, p_lignes jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := (p_commande ->> 'id')::uuid;
  v_ligne jsonb;
  v_ligne_id uuid;
  v_avant public.ligne_commande;
  v_numero integer := 0;
  v_gardees uuid[];
  v_changees uuid[] := '{}';
begin
  if v_id is null then
    insert into public.commande (tournee_id, numero, destination, ville, rang_livraison)
    values (
      (p_commande ->> 'tournee_id')::uuid,
      p_commande ->> 'numero',
      p_commande ->> 'destination',
      nullif(p_commande ->> 'ville', ''),
      (p_commande ->> 'rang_livraison')::integer
    )
    returning id into v_id;
  else
    update public.commande set
      tournee_id = (p_commande ->> 'tournee_id')::uuid,
      numero = p_commande ->> 'numero',
      destination = p_commande ->> 'destination',
      ville = nullif(p_commande ->> 'ville', ''),
      rang_livraison = (p_commande ->> 'rang_livraison')::integer
    where id = v_id;
    if not found then
      raise exception 'commande_introuvable' using errcode = 'P0002';
    end if;
  end if;

  -- Les lignes citées doivent toutes appartenir à cette commande.
  select coalesce(array_agg((l ->> 'id')::uuid), '{}')
    into v_gardees
    from jsonb_array_elements(p_lignes) as l
    where l ->> 'id' is not null;
  if exists (
    select 1 from unnest(v_gardees) as g(id)
    where not exists (
      select 1 from public.ligne_commande lc where lc.id = g.id and lc.commande_id = v_id
    )
  ) then
    raise exception 'ligne_introuvable' using errcode = 'P0002';
  end if;

  delete from public.ligne_commande
    where commande_id = v_id and not (id = any (v_gardees));

  for v_ligne in select value from jsonb_array_elements(p_lignes) loop
    v_numero := v_numero + 1;
    v_ligne_id := (v_ligne ->> 'id')::uuid;

    if v_ligne_id is null then
      insert into public.ligne_commande (
        commande_id, numero_ligne, article_id, quantite, nu,
        longueur_propre, largeur_propre, hauteur_propre, poids_propre, poids_estime
      ) values (
        v_id, v_numero,
        (v_ligne ->> 'article_id')::uuid,
        (v_ligne ->> 'quantite')::integer,
        (v_ligne ->> 'nu')::boolean,
        (v_ligne ->> 'longueur_propre')::integer,
        (v_ligne ->> 'largeur_propre')::integer,
        (v_ligne ->> 'hauteur_propre')::integer,
        (v_ligne ->> 'poids_propre')::numeric,
        (v_ligne ->> 'poids_estime')::boolean
      )
      returning id into v_ligne_id;
      v_changees := v_changees || v_ligne_id;
    else
      select * into v_avant from public.ligne_commande where id = v_ligne_id;

      -- IS DISTINCT FROM compare aussi les valeurs vides (null) sans surprise.
      if row(v_avant.article_id, v_avant.quantite, v_avant.nu,
             v_avant.longueur_propre, v_avant.largeur_propre, v_avant.hauteur_propre,
             v_avant.poids_propre)
         is distinct from
         row((v_ligne ->> 'article_id')::uuid, (v_ligne ->> 'quantite')::integer,
             (v_ligne ->> 'nu')::boolean,
             (v_ligne ->> 'longueur_propre')::integer, (v_ligne ->> 'largeur_propre')::integer,
             (v_ligne ->> 'hauteur_propre')::integer,
             (v_ligne ->> 'poids_propre')::numeric(8, 1))
      then
        delete from public.placement where ligne_commande_id = v_ligne_id;
        v_changees := v_changees || v_ligne_id;
      end if;

      update public.ligne_commande set
        numero_ligne = v_numero,
        article_id = (v_ligne ->> 'article_id')::uuid,
        quantite = (v_ligne ->> 'quantite')::integer,
        nu = (v_ligne ->> 'nu')::boolean,
        longueur_propre = (v_ligne ->> 'longueur_propre')::integer,
        largeur_propre = (v_ligne ->> 'largeur_propre')::integer,
        hauteur_propre = (v_ligne ->> 'hauteur_propre')::integer,
        poids_propre = (v_ligne ->> 'poids_propre')::numeric,
        poids_estime = (v_ligne ->> 'poids_estime')::boolean
      where id = v_ligne_id;
    end if;
  end loop;

  return jsonb_build_object(
    'commande', (select to_jsonb(c) from public.commande c where c.id = v_id),
    'lignes', (
      select coalesce(jsonb_agg(to_jsonb(lc) order by lc.numero_ligne), '[]'::jsonb)
      from public.ligne_commande lc where lc.commande_id = v_id
    ),
    'lignes_changees', to_jsonb(v_changees)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- reordonner_commandes (RG-07)
-- ---------------------------------------------------------------------------
--
-- p_ids : toutes les commandes de la tournée, dans le nouvel ordre ; la
-- première reçoit le rang 1. Une liste incomplète ou étrangère est refusée.
create function public.reordonner_commandes(p_tournee_id uuid, p_ids uuid[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  if cardinality(p_ids) <> (select count(*) from public.commande where tournee_id = p_tournee_id)
     or cardinality(p_ids) <> (select count(distinct id) from unnest(p_ids) as i(id))
     or exists (
       select 1 from unnest(p_ids) as i(id)
       where not exists (
         select 1 from public.commande c where c.id = i.id and c.tournee_id = p_tournee_id
       )
     )
  then
    -- 23514 : traduit en « contrainte » par les dépôts, comme un CHECK.
    raise exception 'ordre_incomplet' using errcode = '23514';
  end if;

  update public.commande c
    set rang_livraison = o.rang
    from unnest(p_ids) with ordinality as o(id, rang)
    where c.id = o.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- affecter_element_attente (RG-11)
-- ---------------------------------------------------------------------------
--
-- L'élément rejoint la tournée, livré en dernier (rang suivant) :
-- - une commande entière entre dans la tournée ;
-- - des articles reportés (une ligne) rejoignent la commande de même numéro
--   dans la tournée, créée au besoin avec le client et la ville d'origine ;
--   la commande d'origine garde ce qui a été livré. La ligne quitte le plan
--   de sa tournée d'origine.
-- L'élément est ensuite retiré de la liste. Rend l'id de la commande cible.
create function public.affecter_element_attente(p_element_id uuid, p_tournee_id uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_element public.element_attente;
  v_origine public.commande;
  v_statut text;
  v_rang integer;
  v_cible uuid;
begin
  select * into v_element from public.element_attente where id = p_element_id for update;
  if not found then
    raise exception 'element_introuvable' using errcode = 'P0002';
  end if;
  select statut into v_statut from public.tournee where id = p_tournee_id;
  if v_statut is null then
    raise exception 'tournee_introuvable' using errcode = 'P0002';
  end if;
  if v_statut <> 'en_preparation' then
    raise exception 'tournee_hors_preparation' using errcode = '23514';
  end if;

  select * into v_origine from public.commande where id = v_element.commande_id;
  select coalesce(max(rang_livraison), 0) + 1 into v_rang
    from public.commande where tournee_id = p_tournee_id;

  if v_element.ligne_commande_id is null then
    update public.commande
      set tournee_id = p_tournee_id, rang_livraison = v_rang
      where id = v_origine.id
      returning id into v_cible;
  else
    select id into v_cible from public.commande
      where tournee_id = p_tournee_id and numero = v_origine.numero;
    if v_cible is null then
      insert into public.commande (tournee_id, numero, destination, ville, rang_livraison)
      values (p_tournee_id, v_origine.numero, v_origine.destination, v_origine.ville, v_rang)
      returning id into v_cible;
    end if;

    delete from public.placement where ligne_commande_id = v_element.ligne_commande_id;
    update public.ligne_commande
      set commande_id = v_cible,
          numero_ligne = (
            select coalesce(max(numero_ligne), 0) + 1
            from public.ligne_commande where commande_id = v_cible
          )
      where id = v_element.ligne_commande_id;
  end if;

  delete from public.element_attente where id = p_element_id;
  return v_cible;
end;
$$;

-- ---------------------------------------------------------------------------
-- Droits d'exécution
-- ---------------------------------------------------------------------------
-- PostgreSQL accorde EXECUTE à tout le monde (PUBLIC) par défaut : on le
-- retire, puis on l'accorde au seul rôle anon (V1 sans compte, RG-17 ; à
-- passer au rôle authenticated quand les comptes arriveront).
revoke execute on function public.enregistrer_commande(jsonb, jsonb) from public;
revoke execute on function public.reordonner_commandes(uuid, uuid[]) from public;
revoke execute on function public.affecter_element_attente(uuid, uuid) from public;
grant execute on function public.enregistrer_commande(jsonb, jsonb) to anon;
grant execute on function public.reordonner_commandes(uuid, uuid[]) to anon;
grant execute on function public.affecter_element_attente(uuid, uuid) to anon;
