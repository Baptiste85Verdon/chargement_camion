// Calculs géométriques sur les boîtes occupées dans la caisse, partagés par
// le validateur et le diagnostic de calage. Repère : x du fond vers les
// portes, y depuis la paroi gauche, z depuis le plancher.
import { encombrement } from './encombrement'
import type { Placement, Unite } from './types'

/** Boîte occupée dans la caisse : de (x0, y0, z0) à (x1, y1, z1), bornes exclues. */
export interface Boite {
  x0: number
  x1: number
  y0: number
  y1: number
  z0: number
  z1: number
}

export function trouverUnite(uniteId: string, unites: Unite[]): Unite {
  const unite = unites.find((u) => u.id === uniteId)
  if (!unite) throw new Error(`Unité inconnue : ${uniteId}`)
  return unite
}

export function boiteDe(p: Placement, unite: Unite): Boite {
  const { l, w, h } = encombrement(unite.dims, p.orientation)
  return { x0: p.x, x1: p.x + l, y0: p.y, y1: p.y + w, z0: p.z, z1: p.z + h }
}

/**
 * Longueur commune de deux segments [a0, a1) et [b0, b1) ; 0 s'ils ne font
 * que se toucher ou sont disjoints.
 */
export function recouvrement(a0: number, a1: number, b0: number, b1: number): number {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0))
}

/**
 * Deux boîtes se chevauchent si elles se recouvrent sur les trois axes à la
 * fois. Des faces qui se touchent (a.x1 === b.x0) ne se chevauchent pas.
 */
export function seChevauchent(a: Boite, b: Boite): boolean {
  return (
    recouvrement(a.x0, a.x1, b.x0, b.x1) > 0 &&
    recouvrement(a.y0, a.y1, b.y0, b.y1) > 0 &&
    recouvrement(a.z0, a.z1, b.z0, b.z1) > 0
  )
}

/** Surface commune des projections de deux boîtes sur le plancher (plan x, y). */
export function surfaceCommuneXY(a: Boite, b: Boite): number {
  return recouvrement(a.x0, a.x1, b.x0, b.x1) * recouvrement(a.y0, a.y1, b.y0, b.y1)
}

/** Surface commune des projections sur une face latérale (plan x, z). */
export function surfaceCommuneXZ(a: Boite, b: Boite): number {
  return recouvrement(a.x0, a.x1, b.x0, b.x1) * recouvrement(a.z0, a.z1, b.z0, b.z1)
}

/** Surface commune des projections sur le fond ou les portes (plan y, z). */
export function surfaceCommuneYZ(a: Boite, b: Boite): number {
  return recouvrement(a.y0, a.y1, b.y0, b.y1) * recouvrement(a.z0, a.z1, b.z0, b.z1)
}

/** `dessus` est posé directement sur `dessous` : contact franc et surface commune. */
export function estPoseSur(dessus: Boite, dessous: Boite): boolean {
  return dessus.z0 === dessous.z1 && surfaceCommuneXY(dessus, dessous) > 0
}
