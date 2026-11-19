// Aimantation et pas au clavier (cahier technique 5.2, étape 4, et 5.3).
//
// Ces fonctions ne disent pas si une position est permise : c'est le travail
// du validateur, appelé ensuite par `deplacer` ou `remettre`. Elles calculent
// seulement où l'article irait :
// - `aimanter` : une position proche d'une paroi ou de la face d'un article
//   s'y colle, comme l'article qu'on lâche près d'un autre sur le quai ;
// - `avancer` : un pas au clavier sur un axe, raccourci jusqu'au contact
//   quand l'aimantation est active.
//
// Une face « fait face » à l'article sur un axe quand les deux boîtes se
// recouvrent sur les deux autres axes : en avançant sur cet axe, elles finiraient
// par se toucher. Les autres articles ne comptent pas.
import type { Pose, Position } from './ajustement'
import { PAS_CLAVIER, PAS_CLAVIER_GRAND } from './constantes'
import { type Boite, boiteDe, recouvrement, trouverUnite } from './geometrie'
import type { Camion, Placement, Unite } from './types'

/** Un axe du repère : x du fond vers les portes, y depuis la paroi gauche, z depuis le plancher. */
export type Axe = 'x' | 'y' | 'z'

const AXES: Axe[] = ['x', 'y', 'z']

/** Début et fin d'une boîte sur un axe. */
function bornes(b: Boite, axe: Axe): [number, number] {
  if (axe === 'x') return [b.x0, b.x1]
  if (axe === 'y') return [b.y0, b.y1]
  return [b.z0, b.z1]
}

/** Taille de la caisse sur un axe. */
function tailleCaisse(camion: Camion, axe: Axe): number {
  if (axe === 'x') return camion.longueur
  if (axe === 'y') return camion.largeur
  return camion.hauteur
}

/** `autre` fait-il face à `b` sur `axe` : se recouvrent-ils sur les deux autres axes ? */
function faitFace(b: Boite, autre: Boite, axe: Axe): boolean {
  return AXES.filter((a) => a !== axe).every((a) => {
    const [b0, b1] = bornes(b, a)
    const [o0, o1] = bornes(autre, a)
    return recouvrement(b0, b1, o0, o1) > 0
  })
}

/** La boîte de l'unité à la pose donnée, et celles des autres articles du plan. */
function boites(
  plan: Placement[],
  uniteId: string,
  pose: Pose,
  unites: Unite[],
): { boite: Boite; autres: Boite[] } {
  const boite = boiteDe({ uniteId, ...pose, rang: 0 }, trouverUnite(uniteId, unites))
  const autres = plan
    .filter((p) => p.uniteId !== uniteId)
    .map((p) => boiteDe(p, trouverUnite(p.uniteId, unites)))
  return { boite, autres }
}

/**
 * Aimante une position (5.2, étape 4) : sur chaque axe de `axes` (ceux que
 * montre la vue), si l'article arrive à moins de `seuil` mm d'une paroi ou de
 * la face d'un article qui lui fait face, il s'y colle. Les contacts possibles
 * sont : son début contre le début de la caisse ou contre la fin d'un article,
 * sa fin contre la fin de la caisse ou contre le début d'un article. Le plus
 * proche l'emporte ; à égalité, le premier trouvé (les parois d'abord). Les
 * axes non montrés ne changent pas.
 *
 * L'unité peut être dans le plan (déplacement) ou dans la zone « Articles à
 * placer » (remise) : sa place actuelle dans le plan est ignorée.
 */
export function aimanter(
  plan: Placement[],
  uniteId: string,
  pose: Pose,
  axes: Axe[],
  seuil: number,
  unites: Unite[],
  camion: Camion,
): Position {
  const { boite, autres } = boites(plan, uniteId, pose, unites)
  const position: Position = { x: pose.x, y: pose.y, z: pose.z }
  for (const axe of axes) {
    const [debut, fin] = bornes(boite, axe)
    const taille = fin - debut
    // Les débuts possibles de l'article, un par contact.
    const debuts = [0, tailleCaisse(camion, axe) - taille]
    for (const autre of autres) {
      if (!faitFace(boite, autre, axe)) continue
      const [o0, o1] = bornes(autre, axe)
      debuts.push(o1, o0 - taille)
    }
    let retenu = debut
    let meilleurEcart = Infinity
    for (const d of debuts) {
      const ecart = Math.abs(d - debut)
      if (ecart <= seuil && ecart < meilleurEcart) {
        retenu = d
        meilleurEcart = ecart
      }
    }
    position[axe] = retenu
  }
  return position
}

/** Le pas d'une flèche : `PAS_CLAVIER`, ou `PAS_CLAVIER_GRAND` avec Maj (5.3). */
export function pasClavier(grand: boolean): number {
  return grand ? PAS_CLAVIER_GRAND : PAS_CLAVIER
}

/**
 * Un pas au clavier (5.3) : avance l'article de `pas` mm sur `axe`, vers les
 * valeurs croissantes (`sens` = 1) ou décroissantes (-1).
 * - Sans aimantation, le pas est entier, même s'il fait entrer l'article dans
 *   une paroi ou un autre article : le validateur le refusera (RG-09).
 * - Avec l'aimantation, le pas est raccourci à la place libre devant
 *   l'article : il s'arrête au contact de la paroi ou du premier article qui
 *   lui fait face, et ne bouge plus s'il y est déjà.
 */
export function avancer(
  plan: Placement[],
  uniteId: string,
  pose: Pose,
  axe: Axe,
  sens: 1 | -1,
  pas: number,
  aimantation: boolean,
  unites: Unite[],
  camion: Camion,
): Position {
  const position: Position = { x: pose.x, y: pose.y, z: pose.z }
  let longueur = pas
  if (aimantation) {
    const { boite, autres } = boites(plan, uniteId, pose, unites)
    const [debut, fin] = bornes(boite, axe)
    // Place libre devant l'article : jusqu'à la paroi, puis jusqu'à chaque
    // article qui lui fait face et se trouve devant lui dans ce sens.
    let libre = sens === 1 ? tailleCaisse(camion, axe) - fin : debut
    for (const autre of autres) {
      if (!faitFace(boite, autre, axe)) continue
      const [o0, o1] = bornes(autre, axe)
      if (sens === 1 && o0 >= fin) libre = Math.min(libre, o0 - fin)
      if (sens === -1 && o1 <= debut) libre = Math.min(libre, debut - o1)
    }
    longueur = Math.min(pas, Math.max(0, libre))
  }
  position[axe] += sens * longueur
  return position
}
