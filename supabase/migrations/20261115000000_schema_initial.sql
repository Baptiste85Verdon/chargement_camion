-- Schéma initial (cahier technique, section 3, et 6.1 « Seconde barrière dans la base »).
--
-- Unités : dimensions en millimètres entiers, poids en kilogrammes.
-- Repère du camion : x du fond vers les portes, y depuis la paroi gauche,
-- z depuis le plancher.
--
-- Les contraintes ci-dessous doublent les règles de saisie de RG-21
-- (src/domaine/validation.ts) : l'application vérifie d'abord, la base refuse
-- ensuite ce qui aurait échappé à l'interface. Une erreur de la base est
-- traduite en message de champ par les dépôts, jamais affichée brute.
--
-- Accès : le projet Supabase a « l'exposition automatique des nouvelles
-- tables » désactivée et le RLS automatique activé. Chaque table reçoit donc
-- ici ses GRANT explicites au rôle anon et ses politiques RLS (fin du fichier).

-- Orientations (RG-04) et autres listes fermées : du texte contrôlé par CHECK,
-- plus simple à faire évoluer qu'un type énuméré PostgreSQL.

-- ---------------------------------------------------------------------------
-- Catalogue des articles (RG-02, RG-04, RG-18)
-- ---------------------------------------------------------------------------
create table public.article (
  id uuid primary key default gen_random_uuid(),
  -- Référence commerciale facultative (FEN-PVC-2V), unique quand elle existe.
  reference text unique check (reference is null or btrim(reference) <> ''),
  nom text not null check (btrim(nom) <> ''),
  famille text not null check (famille in (
    'Fenêtres', 'Fenêtres de toit', 'Plaques de plâtre', 'Planches et panneaux',
    'Poutres et charpente', 'Maçonnerie', 'Couverture', 'Isolation', 'Quincaillerie'
  )),
  -- Boîte englobante en pose « à plat » (RG-18, cahier technique 4.7).
  longueur_emballee integer not null check (longueur_emballee > 0),
  largeur_emballee integer not null check (largeur_emballee > 0),
  hauteur_emballee integer not null check (hauteur_emballee > 0),
  -- Taille nue (RG-02) : les trois dimensions ou aucune.
  longueur_nue integer check (longueur_nue > 0),
  largeur_nue integer check (largeur_nue > 0),
  hauteur_nue integer check (hauteur_nue > 0),
  -- Poids maximal connu (RG-05), virgule acceptée à la saisie.
  poids numeric(8, 1) not null check (poids > 0),
  fragile boolean not null default false,
  orientations text[] not null check (
    cardinality(orientations) > 0
    and orientations <@ array['a_plat', 'debout', 'contre_paroi']
  ),
  forme text not null default 'rectangulaire'
    check (forme in ('rectangulaire', 'cylindrique', 'irreguliere')),
  dessus_porteur boolean not null default true,
  cree_le timestamptz not null default now(),

  constraint article_taille_nue_complete check (
    (longueur_nue is null and largeur_nue is null and hauteur_nue is null)
    or (longueur_nue is not null and largeur_nue is not null and hauteur_nue is not null)
  ),
  constraint article_nue_au_plus_emballee check (
    longueur_nue is null
    or (longueur_nue <= longueur_emballee
        and largeur_nue <= largeur_emballee
        and hauteur_nue <= hauteur_emballee)
  )
);

comment on table public.article is
  'Catalogue : boîte englobante emballée (et nue) en pose à plat, en mm ; poids en kg.';

-- ---------------------------------------------------------------------------
-- Modèles de camions (RG-01)
-- ---------------------------------------------------------------------------
create table public.modele_camion (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (btrim(nom) <> ''),
  -- Dimensions utiles de la caisse, à l'intérieur des parois.
  longueur integer not null check (longueur > 0),
  largeur integer not null check (largeur > 0),
  hauteur integer not null check (hauteur > 0),
  cree_le timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Tournées
-- ---------------------------------------------------------------------------
create table public.tournee (
  id uuid primary key default gen_random_uuid(),
  -- Référence affichée : T-2026-118.
  reference text not null unique check (btrim(reference) <> ''),
  -- Une tournée en préparation peut attendre sa date et son camion (capture 02e).
  date_livraison date,
  -- RESTRICT : un camion utilisé par une tournée ne se supprime pas en base.
  -- RG-21 ne l'interdit que pour une tournée en préparation, prête ou en
  -- chargement ; garder le camion des tournées chargées préserve leur plan.
  modele_camion_id uuid references public.modele_camion (id) on delete restrict,
  statut text not null default 'en_preparation'
    check (statut in ('en_preparation', 'prete', 'en_chargement', 'chargee')),
  cree_le timestamptz not null default now(),

  constraint tournee_date_et_camion_hors_preparation check (
    statut = 'en_preparation'
    or (date_livraison is not null and modele_camion_id is not null)
  )
);

create index tournee_modele_camion_idx on public.tournee (modele_camion_id);

-- ---------------------------------------------------------------------------
-- Commandes et lignes de commande (RG-03, RG-07)
-- ---------------------------------------------------------------------------
create table public.commande (
  id uuid primary key default gen_random_uuid(),
  -- Vide quand la commande est dans la liste d'attente (RG-11).
  -- CASCADE : supprimer une tournée, après confirmation (RG-22), supprime ses commandes.
  tournee_id uuid references public.tournee (id) on delete cascade,
  numero text not null check (btrim(numero) <> ''),
  -- Client ou destination.
  destination text not null check (btrim(destination) <> ''),
  ville text,
  -- 1 = livrée en premier ; fixe l'ordre de chargement (RG-07).
  rang_livraison integer check (rang_livraison > 0),
  cree_le timestamptz not null default now(),

  -- Numéro unique dans la tournée (RG-21).
  constraint commande_numero_unique_dans_tournee unique (tournee_id, numero),
  -- Un rang de livraison seulement dans une tournée.
  constraint commande_rang_si_tournee check ((tournee_id is null) = (rang_livraison is null))
);

create index commande_tournee_idx on public.commande (tournee_id);

create table public.ligne_commande (
  id uuid primary key default gen_random_uuid(),
  commande_id uuid not null references public.commande (id) on delete cascade,
  -- RESTRICT : un article utilisé par une commande ne se supprime pas en base.
  article_id uuid not null references public.article (id) on delete restrict,
  quantite integer not null check (quantite >= 1),
  nu boolean not null default false,
  -- Dimensions propres à la commande (RG-03) : les trois ou aucune.
  longueur_propre integer check (longueur_propre > 0),
  largeur_propre integer check (largeur_propre > 0),
  hauteur_propre integer check (hauteur_propre > 0),
  poids_propre numeric(8, 1) check (poids_propre > 0),
  -- Poids proposé au prorata du volume (RG-03).
  poids_estime boolean not null default false,

  constraint ligne_taille_propre_complete check (
    (longueur_propre is null and largeur_propre is null and hauteur_propre is null)
    or (longueur_propre is not null and largeur_propre is not null and hauteur_propre is not null)
  ),
  constraint ligne_poids_estime_a_un_poids check (not poids_estime or poids_propre is not null)
);

create index ligne_commande_commande_idx on public.ligne_commande (commande_id);
create index ligne_commande_article_idx on public.ligne_commande (article_id);

-- ---------------------------------------------------------------------------
-- Plans de chargement et placements
-- ---------------------------------------------------------------------------
create table public.plan_chargement (
  id uuid primary key default gen_random_uuid(),
  tournee_id uuid not null references public.tournee (id) on delete cascade,
  -- Une nouvelle version à chaque simulation, pour garder l'historique.
  version integer not null check (version > 0),
  calcule_le timestamptz not null default now(),

  constraint plan_version_unique unique (tournee_id, version)
);

create table public.placement (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plan_chargement (id) on delete cascade,
  ligne_commande_id uuid not null references public.ligne_commande (id) on delete cascade,
  -- Numéro de l'unité dans sa ligne : 1 à la quantité.
  numero_unite integer not null check (numero_unite > 0),
  -- Coin de l'unité le plus proche de l'origine (fond, paroi gauche, plancher).
  x integer not null check (x >= 0),
  y integer not null check (y >= 0),
  z integer not null check (z >= 0),
  orientation text not null check (orientation in ('a_plat', 'debout', 'contre_paroi')),
  -- Rang de chargement : le placement sert aussi d'étape au quai.
  rang integer not null check (rang > 0),
  statut text not null default 'a_faire' check (statut in ('a_faire', 'charge', 'en_probleme')),

  constraint placement_unite_unique unique (plan_id, ligne_commande_id, numero_unite),
  constraint placement_rang_unique unique (plan_id, rang)
);

create index placement_ligne_commande_idx on public.placement (ligne_commande_id);

-- ---------------------------------------------------------------------------
-- Signalements (RG-12 à RG-16), utilisés au prototype 4
-- ---------------------------------------------------------------------------
create table public.signalement (
  id uuid primary key default gen_random_uuid(),
  placement_id uuid not null references public.placement (id) on delete cascade,
  type text not null check (type in ('manquant', 'plus_grand', 'abime', 'emplacement')),
  commentaire text,
  -- Dimensions mesurées (RG-12) : les trois ou aucune.
  longueur_mesuree integer check (longueur_mesuree > 0),
  largeur_mesuree integer check (largeur_mesuree > 0),
  hauteur_mesuree integer check (hauteur_mesuree > 0),
  action text not null check (action in (
    'annuler_chargement', 'retirer_article', 'retirer_commande', 'conserver'
  )),
  resultat_reverification text,
  cree_le timestamptz not null default now(),

  constraint signalement_mesure_complete check (
    (longueur_mesuree is null and largeur_mesuree is null and hauteur_mesuree is null)
    or (longueur_mesuree is not null and largeur_mesuree is not null and hauteur_mesuree is not null)
  )
);

create index signalement_placement_idx on public.signalement (placement_id);

-- ---------------------------------------------------------------------------
-- Liste d'attente (RG-11, RG-13)
-- ---------------------------------------------------------------------------
create table public.element_attente (
  id uuid primary key default gen_random_uuid(),
  commande_id uuid not null references public.commande (id) on delete cascade,
  -- Vide quand toute la commande est reportée.
  ligne_commande_id uuid references public.ligne_commande (id) on delete cascade,
  tournee_origine_id uuid references public.tournee (id) on delete set null,
  motif text not null check (motif in ('depassement', 'signalement')),
  cree_le timestamptz not null default now()
);

create index element_attente_commande_idx on public.element_attente (commande_id);
create index element_attente_ligne_idx on public.element_attente (ligne_commande_id);
create index element_attente_tournee_idx on public.element_attente (tournee_origine_id);

-- ===========================================================================
-- Accès : GRANT et sécurité au niveau des lignes (RLS)
-- ===========================================================================
--
-- V1 SANS COMPTE (RG-17) : l'application s'exécute dans le navigateur avec la
-- clé publique, c'est-à-dire le rôle anon. Les politiques ci-dessous
-- l'autorisent donc sur toutes les lignes (using (true)), et seules les
-- opérations utiles à chaque table lui sont accordées.
--
-- À DURCIR QUAND LES COMPTES ARRIVERONT : retirer ces droits au rôle anon,
-- les accorder au rôle authenticated, et remplacer « true » par une condition
-- liée à l'utilisateur ou à son profil (auth.uid(), dépôt de rattachement…).
-- En attendant, la base ne contient que des données fictives et son adresse
-- n'est pas diffusée (cahier technique, section 10).

alter table public.article enable row level security;
alter table public.modele_camion enable row level security;
alter table public.tournee enable row level security;
alter table public.commande enable row level security;
alter table public.ligne_commande enable row level security;
alter table public.plan_chargement enable row level security;
alter table public.placement enable row level security;
alter table public.signalement enable row level security;
alter table public.element_attente enable row level security;

-- Référentiels, tournées et commandes : lecture, création, modification, suppression.
grant select, insert, update, delete on public.article to anon;
grant select, insert, update, delete on public.modele_camion to anon;
grant select, insert, update, delete on public.tournee to anon;
grant select, insert, update, delete on public.commande to anon;
grant select, insert, update, delete on public.ligne_commande to anon;

-- Plans : une version ne se modifie pas, on en calcule une nouvelle ; on peut
-- supprimer une version devenue inutile (ses placements suivent par cascade).
grant select, insert, delete on public.plan_chargement to anon;
-- Placements : créés avec leur plan, puis leur statut évolue au quai.
grant select, insert, update on public.placement to anon;
-- Signalements : créés au quai, complétés par le résultat de la revérification.
grant select, insert, update on public.signalement to anon;
-- Liste d'attente : un élément est ajouté au report, retiré à l'affectation.
grant select, insert, delete on public.element_attente to anon;

-- Une politique par opération accordée, toutes ouvertes au rôle anon (RG-17).
create policy article_lecture on public.article for select to anon using (true);
create policy article_creation on public.article for insert to anon with check (true);
create policy article_modification on public.article for update to anon using (true) with check (true);
create policy article_suppression on public.article for delete to anon using (true);

create policy modele_camion_lecture on public.modele_camion for select to anon using (true);
create policy modele_camion_creation on public.modele_camion for insert to anon with check (true);
create policy modele_camion_modification on public.modele_camion for update to anon using (true) with check (true);
create policy modele_camion_suppression on public.modele_camion for delete to anon using (true);

create policy tournee_lecture on public.tournee for select to anon using (true);
create policy tournee_creation on public.tournee for insert to anon with check (true);
create policy tournee_modification on public.tournee for update to anon using (true) with check (true);
create policy tournee_suppression on public.tournee for delete to anon using (true);

create policy commande_lecture on public.commande for select to anon using (true);
create policy commande_creation on public.commande for insert to anon with check (true);
create policy commande_modification on public.commande for update to anon using (true) with check (true);
create policy commande_suppression on public.commande for delete to anon using (true);

create policy ligne_commande_lecture on public.ligne_commande for select to anon using (true);
create policy ligne_commande_creation on public.ligne_commande for insert to anon with check (true);
create policy ligne_commande_modification on public.ligne_commande for update to anon using (true) with check (true);
create policy ligne_commande_suppression on public.ligne_commande for delete to anon using (true);

create policy plan_chargement_lecture on public.plan_chargement for select to anon using (true);
create policy plan_chargement_creation on public.plan_chargement for insert to anon with check (true);
create policy plan_chargement_suppression on public.plan_chargement for delete to anon using (true);

create policy placement_lecture on public.placement for select to anon using (true);
create policy placement_creation on public.placement for insert to anon with check (true);
create policy placement_modification on public.placement for update to anon using (true) with check (true);

create policy signalement_lecture on public.signalement for select to anon using (true);
create policy signalement_creation on public.signalement for insert to anon with check (true);
create policy signalement_modification on public.signalement for update to anon using (true) with check (true);

create policy element_attente_lecture on public.element_attente for select to anon using (true);
create policy element_attente_creation on public.element_attente for insert to anon with check (true);
create policy element_attente_suppression on public.element_attente for delete to anon using (true);
