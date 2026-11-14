// Le validateur (cahier technique, 4.2) répond à une seule question :
// « ce placement est-il permis ? ». Il renvoie la liste des règles enfreintes,
// vide si le placement est permis.
import { SEUIL_APPUI, TOLERANCE_CONTACT } from './constantes'
import {
  type Boite,
  boiteDe,
  estPoseSur,
  seChevauchent,
  surfaceCommuneXY,
  surfaceCommuneYZ,
  trouverUnite,
} from './geometrie'
import type { Camion, Placement, RegleEnfreinte, Unite } from './types'

/** Un autre article du plan, avec ce qu'il faut savoir de lui pour le comparer. */
interface Voisin {
  unite: Unite
  boite: Boite
}

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
 * Règle 4 : une unité qui n'est pas au plancher repose, sur au moins
 * `SEUIL_APPUI` de sa base, sur les unités qu'elle touche par-dessous.
 * Ces unités ne peuvent pas se chevaucher entre elles : leurs surfaces
 * d'appui s'additionnent sans double compte.
 */
function estBienAppuyee(b: Boite, dessous: Voisin[]): boolean {
  if (b.z0 <= 0) return true
  const base = (b.x1 - b.x0) * (b.y1 - b.y0)
  const appui = dessous.reduce((somme, v) => somme + surfaceCommuneXY(b, v.boite), 0)
  return appui >= SEUIL_APPUI * base
}

/**
 * Règle 7 (RG-07) : `b` gêne la sortie de `a` par les portes. C'est le cas
 * s'il est entre `a` et les portes dans le même couloir, c'est-à-dire plus
 * près des portes et en recouvrement avec `a` en largeur et en hauteur, ou
 * s'il est posé sur `a`.
 */
function gene(b: Boite, a: Boite): boolean {
  const devant = b.x0 >= a.x1 && surfaceCommuneYZ(a, b) > 0
  return devant || estPoseSur(b, a)
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
  const voisins: Voisin[] = plan
    .filter((autre) => autre.uniteId !== p.uniteId)
    .map((autre) => {
      const u = trouverUnite(autre.uniteId, unites)
      return { unite: u, boite: boiteDe(autre, u) }
    })
  const enfreintes: RegleEnfreinte[] = []

  if (!estDansLaCaisse(boite, camion)) {
    enfreintes.push({ regle: 'RG-06', motif: 'horsCaisse', uniteId: unite.id })
  }

  if (!unite.orientations.includes(p.orientation)) {
    enfreintes.push({ regle: 'RG-04', motif: 'orientationInterdite', uniteId: unite.id })
  } else if (p.orientation === 'contreParoi' && !toucheUneParoiLaterale(boite, camion)) {
    enfreintes.push({ regle: 'RG-04', motif: 'paroiAbsente', uniteId: unite.id })
  }

  for (const v of voisins) {
    if (seChevauchent(boite, v.boite)) {
      enfreintes.push({
        regle: 'RG-06',
        motif: 'chevauchement',
        uniteId: unite.id,
        autreUniteId: v.unite.id,
      })
    }
  }

  const dessous = voisins.filter((v) => estPoseSur(boite, v.boite))
  if (!estBienAppuyee(boite, dessous)) {
    enfreintes.push({ regle: 'RG-04', motif: 'appuiInsuffisant', uniteId: unite.id })
  }

  // Règles 5 et 6 : on regarde ce qui porte `p`. Ce que `p` porte lui-même
  // sera contrôlé en validant chacun de ces articles du dessus.
  for (const v of dessous) {
    const autreUniteId = v.unite.id
    if (v.unite.fragile) {
      enfreintes.push({ regle: 'RG-04', motif: 'surFragile', uniteId: unite.id, autreUniteId })
    }
    if (!v.unite.porteur) {
      enfreintes.push({ regle: 'RG-18', motif: 'surNonPorteur', uniteId: unite.id, autreUniteId })
    }
    // Lourds en bas (RG-04) : le poids ne sert qu'au placement (RG-05).
    if (v.unite.poids < unite.poids) {
      enfreintes.push({ regle: 'RG-04', motif: 'surPlusLeger', uniteId: unite.id, autreUniteId })
    }
  }

  // Règle 7 : on regarde dans les deux sens, car `p` peut aussi bien être
  // bloqué par un article déjà placé que bloquer lui-même un article.
  for (const v of voisins) {
    const autreUniteId = v.unite.id
    if (gene(v.boite, boite) && v.unite.commandeRang > unite.commandeRang) {
      enfreintes.push({ regle: 'RG-07', motif: 'accesBloque', uniteId: unite.id, autreUniteId })
    }
    if (gene(boite, v.boite) && unite.commandeRang > v.unite.commandeRang) {
      enfreintes.push({ regle: 'RG-07', motif: 'bloqueAcces', uniteId: unite.id, autreUniteId })
    }
  }

  return enfreintes
}
