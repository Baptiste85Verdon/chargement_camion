-- Version de plan ajustée à la main (prototype 2, étape P2-4 ; cahier
-- technique 3, 5.18 et 7.1).
--
-- Au prototype 2, le préparateur corrige à la main le plan calculé :
-- déplacement, rotation, retrait, remise, placement automatique d'un article
-- de la zone « Articles à placer ». Chaque changement accepté s'enregistre
-- aussitôt dans la version actuelle du plan, qui est alors marquée « ajustée
-- à la main ». Les versions précédentes ne changent plus : seule la dernière
-- version d'une tournée s'ajuste.
--
-- Un changement touche plusieurs placements à la fois (positions, rangs
-- recalculés par ordonnerChargement, unités retirées ou remises) et la marque
-- de la version : il se fait dans une fonction PostgreSQL, donc en une seule
-- transaction, « tout ou rien », comme enregistrer_commande.
--
-- SECURITY INVOKER (le défaut) : la fonction s'exécute avec les droits du
-- rôle anon, et les politiques RLS s'appliquent comme pour une requête
-- ordinaire. Rien n'est contourné.

-- ---------------------------------------------------------------------------
-- Marque « ajustée à la main »
-- ---------------------------------------------------------------------------
alter table public.plan_chargement
  add column ajuste_a_la_main boolean not null default false;

comment on column public.plan_chargement.ajuste_a_la_main is
  'Vrai quand la disposition calculée a été modifiée à la main (déplacement, rotation, retrait, remise).';

-- Le rôle anon ne pouvait modifier que la colonne a_recalculer d'une version
-- (migration du 16 novembre) : on lui accorde aussi celle-ci, pas les autres.
-- La politique de modification plan_chargement_modification existe déjà.
-- V1 sans compte (RG-17) : politique ouverte, à durcir avec les comptes.
grant update (ajuste_a_la_main) on public.plan_chargement to anon;

-- Recalculer l'ordre de chargement échange des rangs entre placements : la
-- contrainte d'unicité du rang n'est vérifiée qu'à la fin de la transaction
-- (DEFERRABLE), pas après chaque mise à jour. Sinon, donner le rang 1 à
-- l'unité qui avait le rang 2 heurterait l'unité qui a encore le rang 1.
alter table public.placement drop constraint placement_rang_unique;
alter table public.placement
  add constraint placement_rang_unique unique (plan_id, rang)
  deferrable initially deferred;

-- Les autres droits utiles existent déjà : anon peut ajouter, modifier et
-- supprimer des placements (migrations du 15 et du 16 novembre).

-- ---------------------------------------------------------------------------
-- ajuster_plan
-- ---------------------------------------------------------------------------
--
-- p_placements : tableau JSON de la disposition complète de la version après
-- le changement, aux noms de colonnes de la table placement (sans plan_id).
-- - Un placement avec « id » est gardé : seuls sa position (x, y, z), son
--   orientation et son rang changent ; il reste la même unité, avec son
--   statut et ses signalements.
-- - Un placement sans « id » est ajouté : une unité remise dans le camion.
-- - Un placement de la version absent du tableau est supprimé : une unité
--   retirée vers la zone « Articles à placer ».
-- La version est ensuite marquée « ajustée à la main ».
--
-- Rend { plan, placements } : la version et ses placements par rang.
--
-- Refus (rien n'est changé) :
-- - version absente, placement qui n'est pas de cette version, ligne qui
--   n'est pas de la tournée : P0002 ;
-- - version qui n'est pas la dernière de sa tournée : 23514 (traduit en
--   « contrainte » par les dépôts, comme un CHECK) ;
-- - deux placements au même rang ou pour la même unité : 23505 (unicité,
--   vérifiée en fin de transaction pour le rang).
create function public.ajuster_plan(p_plan_id uuid, p_placements jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_plan public.plan_chargement;
  v_gardes uuid[];
  v_placement jsonb;
begin
  -- Verrou sur la version : deux ajustements simultanés passent l'un après
  -- l'autre, sans se mélanger.
  select * into v_plan from public.plan_chargement where id = p_plan_id for update;
  if not found then
    raise exception 'plan_introuvable' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from public.plan_chargement
    where tournee_id = v_plan.tournee_id and version > v_plan.version
  ) then
    raise exception 'plan_pas_dernier' using errcode = '23514';
  end if;

  -- Les placements gardés doivent tous appartenir à cette version.
  select coalesce(array_agg((p ->> 'id')::uuid), '{}')
    into v_gardes
    from jsonb_array_elements(p_placements) as p
    where p ->> 'id' is not null;
  if exists (
    select 1 from unnest(v_gardes) as g(id)
    where not exists (
      select 1 from public.placement pl where pl.id = g.id and pl.plan_id = p_plan_id
    )
  ) then
    raise exception 'placement_introuvable' using errcode = 'P0002';
  end if;

  -- Les unités remises doivent être des lignes d'une commande de la tournée.
  if exists (
    select 1 from jsonb_array_elements(p_placements) as p
    where p ->> 'id' is null
      and not exists (
        select 1
        from public.ligne_commande l
        join public.commande c on c.id = l.commande_id
        where l.id = (p ->> 'ligne_commande_id')::uuid
          and c.tournee_id = v_plan.tournee_id
      )
  ) then
    raise exception 'ligne_introuvable' using errcode = 'P0002';
  end if;

  -- Unités retirées (leurs signalements suivent par cascade).
  delete from public.placement
    where plan_id = p_plan_id and not (id = any (v_gardes));

  for v_placement in select value from jsonb_array_elements(p_placements) loop
    if v_placement ->> 'id' is null then
      insert into public.placement (
        plan_id, ligne_commande_id, numero_unite, x, y, z, orientation, rang, statut
      ) values (
        p_plan_id,
        (v_placement ->> 'ligne_commande_id')::uuid,
        (v_placement ->> 'numero_unite')::integer,
        (v_placement ->> 'x')::integer,
        (v_placement ->> 'y')::integer,
        (v_placement ->> 'z')::integer,
        v_placement ->> 'orientation',
        (v_placement ->> 'rang')::integer,
        coalesce(v_placement ->> 'statut', 'a_faire')
      );
    else
      update public.placement set
        x = (v_placement ->> 'x')::integer,
        y = (v_placement ->> 'y')::integer,
        z = (v_placement ->> 'z')::integer,
        orientation = v_placement ->> 'orientation',
        rang = (v_placement ->> 'rang')::integer
      where id = (v_placement ->> 'id')::uuid;
    end if;
  end loop;

  -- Le rang est vérifié maintenant plutôt qu'à la validation de la
  -- transaction : l'erreur remonte ainsi de la fonction, avec son code.
  set constraints public.placement_rang_unique immediate;

  update public.plan_chargement set ajuste_a_la_main = true where id = p_plan_id;

  return jsonb_build_object(
    'plan', (select to_jsonb(pc) from public.plan_chargement pc where pc.id = p_plan_id),
    'placements', (
      select coalesce(jsonb_agg(to_jsonb(pl) order by pl.rang), '[]'::jsonb)
      from public.placement pl where pl.plan_id = p_plan_id
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Droits d'exécution
-- ---------------------------------------------------------------------------
-- PostgreSQL accorde EXECUTE à tout le monde (PUBLIC) par défaut : on le
-- retire, puis on l'accorde au seul rôle anon (V1 sans compte, RG-17 ; à
-- passer au rôle authenticated quand les comptes arriveront).
revoke execute on function public.ajuster_plan(uuid, jsonb) from public;
grant execute on function public.ajuster_plan(uuid, jsonb) to anon;
