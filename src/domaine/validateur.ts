// Le validateur (cahier technique, 4.2) répond à une seule question :
// « ce placement est-il permis ? ». Il renvoie la liste des règles enfreintes,
// vide si le placement est permis.
import { encombrement } from './encombrement'
import type { Camion, Placement, RegleEnfreinte, Unite } from './types'

/** Boîte occupée dans la caisse : de (x0, y0, z0) à (x1, y1, z1), bornes exclues. */
interface Boite {
  x0: number
  x1: number
  y0: number
  y1: number
  z0: number
  z1: number
}

function trouverUnite(uniteId: string, unites: Unite[]): Unite {
  const unite = unites.find((u) => u.id === uniteId)
  if (!unite) throw new Error(`Unité inconnue : ${uniteId}`)
  return unite
}

function boiteDe(p: Placement, unite: Unite): Boite {
  const { l, w, h } = encombrement(unite.dims, p.orientation)
  return { x0: p.x, x1: p.x + l, y0: p.y, y1: p.y + w, z0: p.z, z1: p.z + h }
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
 * Règle 2 : deux boîtes se chevauchent si elles se recouvrent sur les trois
 * axes à la fois. Des faces qui se touchent (a.x1 === b.x0) ne se chevauchent
 * pas : d'où les inégalités strictes.
 */
function seChevauchent(a: Boite, b: Boite): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1 && a.z0 < b.z1 && b.z0 < a.z1
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
