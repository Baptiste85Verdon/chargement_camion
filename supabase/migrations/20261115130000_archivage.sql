-- Archivage des articles et des modèles de camions (RG-21, décision de
-- l'étape 6).
--
-- Un article ou un camion déjà utilisé ne se supprime pas : il s'archive.
-- Il quitte les listes et les choix, mais reste lisible par les commandes,
-- les tournées et les plans qui le citent. La suppression reste possible
-- pour un élément jamais utilisé : les clés étrangères ON DELETE RESTRICT de
-- la migration initiale refusent déjà les autres.
--
-- Les droits du rôle anon (GRANT update) et les politiques RLS de la
-- migration initiale couvrent la nouvelle colonne : rien à ajouter.

alter table public.article add column archive_le timestamptz;
alter table public.modele_camion add column archive_le timestamptz;

comment on column public.article.archive_le is
  'Date d''archivage ; vide pour un article actif, proposé dans le catalogue et la saisie express.';
comment on column public.modele_camion.archive_le is
  'Date d''archivage ; vide pour un modèle actif, proposé à la préparation des tournées.';

-- La référence d'article n'est unique que parmi les articles actifs : un
-- article archivé peut laisser sa référence à son remplaçant.
alter table public.article drop constraint article_reference_key;
create unique index article_reference_actif_key
  on public.article (reference)
  where archive_le is null;

-- RG-21 : un camion utilisé par une tournée en préparation, prête ou en
-- chargement ne peut pas être archivé. Une contrainte CHECK ne peut pas
-- regarder une autre table : un déclencheur le vérifie avant la modification.
create function public.refuser_archivage_camion_en_cours()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.archive_le is not null and old.archive_le is null and exists (
    select 1
    from public.tournee t
    where t.modele_camion_id = new.id
      and t.statut in ('en_preparation', 'prete', 'en_chargement')
  ) then
    -- Le message sert de code : les dépôts le reconnaissent et le traduisent.
    raise exception 'modele_camion_en_cours';
  end if;
  return new;
end;
$$;

create trigger modele_camion_archivage
  before update of archive_le on public.modele_camion
  for each row
  execute function public.refuser_archivage_camion_en_cours();
