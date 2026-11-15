-- Correctif de affecter_element_attente (étape 9, RG-11).
--
-- La première version lisait l'élément avec « select … for update ». Ce
-- verrou demande le droit UPDATE sur element_attente, que le rôle anon n'a
-- pas (il peut seulement lire, ajouter et supprimer) : l'appel était refusé
-- (42501, permission denied), constaté en vérifiant sur la vraie base.
--
-- L'élément est désormais « pris » en le supprimant d'abord, avec
-- « delete … returning ». Deux affectations simultanées du même élément ne
-- peuvent donc pas réussir toutes les deux : la seconde ne trouve plus rien
-- et est refusée. Comme tout se passe dans la même transaction, un échec plus
-- loin annule aussi la suppression. Aucun droit supplémentaire n'est accordé.
create or replace function public.affecter_element_attente(p_element_id uuid, p_tournee_id uuid)
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
  select statut into v_statut from public.tournee where id = p_tournee_id;
  if v_statut is null then
    raise exception 'tournee_introuvable' using errcode = 'P0002';
  end if;
  if v_statut <> 'en_preparation' then
    raise exception 'tournee_hors_preparation' using errcode = '23514';
  end if;

  delete from public.element_attente where id = p_element_id returning * into v_element;
  if not found then
    raise exception 'element_introuvable' using errcode = 'P0002';
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

  return v_cible;
end;
$$;

-- « create or replace » garde les droits : EXECUTE reste au seul rôle anon.
