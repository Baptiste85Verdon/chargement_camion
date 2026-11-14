// Le validateur (cahier technique, 4.2) répond à une seule question :
// « ce placement est-il permis ? ». Il renvoie la liste des règles enfreintes,
// vide si le placement est permis.
import { TOLERANCE_CONTACT } from './constantes'
import { type Boite, boiteDe, seChevauchent, trouverUnite } from './geometrie'
import type { Camion, Placement, RegleEnfreinte, Unite } from './types'

/** Règle 1 : l'unité ne dépasse d'aucune paroi, ni du plancher, ni du plafond. */
function estDansLaCaisse(b: Boite, camion: Camion): boolean {
  return (
    b.x0 >= 0 &&
    b.y0 >= 0 &&
    b.z0 >= 0 &&
    b.x1 <= camion.longueur &&
    b.y1 <= camion.largeur &&
    b.z1 <= camion.hauteur
  )
}

/**
 * Règle 3, cas « contre une paroi » : l'unité touche la paroi gauche ou la
 * paroi droite, à `TOLERANCE_CONTACT` près. Sa grande face est tournée vers
 * les côtés (voir `encombrement`) : seules les parois latérales comptent.
 */
function toucheUneParoiLaterale(b: Boite, camion: Camion): boolean {
  return b.y0 <= TOLERANCE_CONTACT || camion.largeur - b.y1 <= TOLERANCE_CONTACT
}

/**
 * Vérifie le placement `p` par rapport au reste du `plan` et à la caisse.
 * `unites` fournit les dimensions et les orientations autorisées de chaque unité.
 * Si `plan` contient déjà un placement de la même unité, il est ignoré.
 */
export function valider(
  p: Placement,
  plan: Placement[],
  unites: Unite[],
  camion: Camion,
): RegleEnfreinte[] {
  const unite = trouverUnite(p.uniteId, unites)
  const boite = boiteDe(p, unite)
  const enfreintes: RegleEnfreinte[] = []

  if (!estDansLaCaisse(boite, camion)) {
    enfreintes.push({ regle: 'RG-06', motif: 'horsCaisse', uniteId: unite.id })
  }

  if (!unite.orientations.includes(p.orientation)) {
    enfreintes.push({ regle: 'RG-04', motif: 'orientationInterdite', uniteId: unite.id })
  } else if (p.orientation === 'contreParoi' && !toucheUneParoiLaterale(boite, camion)) {
    enfreintes.push({ regle: 'RG-04', motif: 'paroiAbsente', uniteId: unite.id })
  }

  for (const autre of plan) {
    if (autre.uniteId === p.uniteId) continue
    const autreBoite = boiteDe(autre, trouverUnite(autre.uniteId, unites))
    if (seChevauchent(boite, autreBoite)) {
      enfreintes.push({
        regle: 'RG-06',
        motif: 'chevauchement',
        uniteId: unite.id,
        autreUniteId: autre.uniteId,
      })
    }
  }

  return enfreintes
}
