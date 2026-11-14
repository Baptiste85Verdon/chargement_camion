// Le validateur (cahier technique, 4.2) répond à une seule question :
// « ce placement est-il permis ? ». Il renvoie la liste des règles enfreintes,
// vide si le placement est permis.
import { estDebout, estDeboutCale, type Occupation, occupationDe } from './calage'
import { SEUIL_APPUI, TOLERANCE_CONTACT } from './constantes'
import {
  type Boite,
  estPoseSur,
  seChevauchent,
  surfaceCommuneXY,
  surfaceCommuneYZ,
} from './geometrie'
import type { Camion, MotifRegle, NumeroRegle, Placement, RegleEnfreinte, Unite } from './types'

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
function estBienAppuyee(b: Boite, dessous: Occupation[]): boolean {
  if (b.z0 <= 0) return true
  const base = (b.x1 - b.x0) * (b.y1 - b.y0)
  const appui = dessous.reduce((somme, v) => somme + surfaceCommuneXY(b, v.boite), 0)
  return appui >= SEUIL_APPUI * base
}

/** Ce qui ne va pas quand un article est posé sur un autre (règles 5 et 6). */
type DefautPile = 'dessousFragile' | 'dessousNonPorteur' | 'dessousPlusLeger'

/**
 * Règles 5 et 6 pour une pile de deux articles : rien sur un fragile (RG-04)
 * ni sur un dessus non porteur (RG-18), pas de lourd sur un léger (RG-04 ;
 * le poids ne sert qu'au placement, RG-05).
 */
function defautsDePile(dessus: Unite, dessous: Unite): DefautPile[] {
  const defauts: DefautPile[] = []
  if (dessous.fragile) defauts.push('dessousFragile')
  if (!dessous.porteur) defauts.push('dessousNonPorteur')
  if (dessous.poids < dessus.poids) defauts.push('dessousPlusLeger')
  return defauts
}

/**
 * Un même défaut se dit de deux façons selon l'article validé : celui du
 * dessus (« posé sur un fragile ») ou celui du dessous (« fragile chargé »).
 */
const MOTIFS_PILE: Record<
  DefautPile,
  { regle: NumeroRegle; vuDuDessus: MotifRegle; vuDuDessous: MotifRegle }
> = {
  dessousFragile: { regle: 'RG-04', vuDuDessus: 'surFragile', vuDuDessous: 'fragileCharge' },
  dessousNonPorteur: {
    regle: 'RG-18',
    vuDuDessus: 'surNonPorteur',
    vuDuDessous: 'nonPorteurCharge',
  },
  dessousPlusLeger: { regle: 'RG-04', vuDuDessus: 'surPlusLeger', vuDuDessous: 'sousPlusLourd' },
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
  const cible = occupationDe(p, unites)
  const { unite, boite } = cible
  const voisins = plan
    .filter((autre) => autre.uniteId !== p.uniteId)
    .map((autre) => occupationDe(autre, unites))
  const enfreintes: RegleEnfreinte[] = []

  if (!estDansLaCaisse(boite, camion)) {
    enfreintes.push({ regle: 'RG-06', motif: 'horsCaisse', uniteId: unite.id })
  }

  if (!unite.orientations.includes(p.orientation)) {
    enfreintes.push({ regle: 'RG-04', motif: 'orientationInterdite', uniteId: unite.id })
  } else if (p.orientation === 'contreParoi' && !toucheUneParoiLaterale(boite, camion)) {
    enfreintes.push({ regle: 'RG-04', motif: 'paroiAbsente', uniteId: unite.id })
  } else if (estDebout(cible) && !estDeboutCale(cible, [cible, ...voisins], camion)) {
    // Règle 8 : calage des articles debout.
    enfreintes.push({ regle: 'RG-19', motif: 'deboutNonCale', uniteId: unite.id })
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

  // Règles 5 et 6, dans les deux sens : les articles qui portent `p`, puis
  // ceux que `p` porte. Le second cas arrive quand on glisse `p` sous un
  // article déjà posé (déplacement manuel, échange d'`optimiser`).
  for (const v of dessous) {
    for (const defaut of defautsDePile(unite, v.unite)) {
      const { regle, vuDuDessus } = MOTIFS_PILE[defaut]
      enfreintes.push({ regle, motif: vuDuDessus, uniteId: unite.id, autreUniteId: v.unite.id })
    }
  }
  for (const v of voisins.filter((v) => estPoseSur(v.boite, boite))) {
    for (const defaut of defautsDePile(v.unite, unite)) {
      const { regle, vuDuDessous } = MOTIFS_PILE[defaut]
      enfreintes.push({ regle, motif: vuDuDessous, uniteId: unite.id, autreUniteId: v.unite.id })
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
