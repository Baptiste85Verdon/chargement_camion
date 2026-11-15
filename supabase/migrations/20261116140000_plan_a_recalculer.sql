-- Plan « à recalculer » (étape 9, RG-22).
--
-- Changer le camion d'une tournée dont le plan est déjà calculé demande
-- confirmation, puis marque ce plan « à recalculer » : il reste lisible
-- (historique des versions), mais il ne correspond plus à la caisse.
-- Un nouveau calcul crée une nouvelle version, qui part à faux.

alter table public.plan_chargement
  add column a_recalculer boolean not null default false;

comment on column public.plan_chargement.a_recalculer is
  'Vrai quand le camion de la tournée a changé depuis le calcul : un nouveau calcul est attendu.';

-- Une version de plan ne se modifiait pas (migration initiale) : on accorde
-- au rôle anon la seule modification de cette colonne, pas des autres.
-- V1 sans compte (RG-17) : politique ouverte, à durcir avec les comptes.
grant update (a_recalculer) on public.plan_chargement to anon;
create policy plan_chargement_modification on public.plan_chargement
  for update to anon using (true) with check (true);
