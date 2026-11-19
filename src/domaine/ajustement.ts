// Ajustement manuel du plan (cahier technique 5.2, 5.5 et 5.7 ; RG-08, RG-09).
// Chaque changement proposé à la main (déplacer, changer d'orientation,
// retirer vers la zone « Articles à placer », remettre) suit le même chemin :
//
// 1. on construit le plan tel qu'il serait après le changement ;
// 2. on le passe au validateur : l'article changé est validé entièrement à
//    sa nouvelle place, et pour les autres articles, une règle qui n'était
//    pas enfreinte avant le changement le fait refuser (RG-08) ; un chevauchement ou
//    une sortie de la caisse est cité seul, car il est toujours bloqué (RG-09) ;
// 3. on recalcule l'ordre de chargement (4.8) : s'il n'en existe aucun, le
//    changement est refusé aussi (RG-08) ;
// 4. sinon on rend le nouveau plan, rangs renumérotés.
//
// Fonctions pures : le plan reçu n'est jamais modifié.
import { SANS_RANG, TOLERANCE_CONTACT } from './constantes'
import { boiteDe, estPoseSur, recouvrement, trouverUnite } from './geometrie'
import { ordonnerChargement } from './ordre-chargement'
import type { Camion, NumeroRegle, Orientation, Placement, RegleEnfreinte, Unite } from './types'
import { validerPlan } from './validateur'

/** Coin de l'unité le plus proche de l'origine, en millimètres. */
export interface Position {
  x: number
  y: number
  z: number
}

/** Une position et une orientation : de quoi poser une unité. */
export interface Pose extends Position {
  orientation: Orientation
}

/** Le changement est accepté : voici le plan, dans l'ordre de chargement. */
export interface Accepte {
  accepte: true
  plan: Placement[]
}

/** Le changement est refusé : voici les règles qu'il enfreindrait. */
export interface Refus {
  accepte: false
  enfreintes: RegleEnfreinte[]
}

/** Un retrait refusé dit en plus quels articles retirer avec lui (5.7). */
export interface RefusRetrait extends Refus {
  aRetirerAussi: string[]
}

export type ResultatAjustement = Accepte | Refus
export type ResultatRetrait = Accepte | RefusRetrait

/** Ordre dans lequel « Changer d'orientation » parcourt les poses (5.5). */
const ORDRE_ORIENTATIONS: Orientation[] = ['aPlat', 'debout', 'contreParoi']

/**
 * Les règles à citer dans le message de refus (capture 04f) : la règle de
 * placement enfreinte, puis la règle de l'ajustement manuel. Un chevauchement
 * ou une sortie de la caisse relève de RG-09 ; tout le reste, de RG-08.
 */
export function reglesCitees(e: RegleEnfreinte): NumeroRegle[] {
  if (e.regle === 'RG-08') return ['RG-08']
  return [e.regle, e.regle === 'RG-06' ? 'RG-09' : 'RG-08']
}

/** Clé qui identifie une règle enfreinte, pour comparer deux listes. */
function cle(e: RegleEnfreinte): string {
  return `${e.regle}|${e.motif}|${e.uniteId}|${e.autreUniteId ?? ''}`
}

/**
 * Les règles que `nouveau` enfreint et qui font refuser le changement.
 * - L'article changé (`uniteId`) est toujours validé entièrement à sa
 *   nouvelle place : un défaut qu'il avait déjà ne l'excuse pas.
 * - Pour les autres articles, on ne garde que ce que `ancien` n'enfreignait
 *   pas : un défaut déjà présent ailleurs ne bloque pas un changement qui
 *   n'y touche pas.
 * Pour un retrait, il n'y a pas d'article changé dans `nouveau` : seule la
 * comparaison compte.
 */
function nouvellesEnfreintes(
  ancien: Placement[],
  nouveau: Placement[],
  unites: Unite[],
  camion: Camion,
  uniteId?: string,
): RegleEnfreinte[] {
  const avant = new Set(validerPlan(ancien, unites, camion).map(cle))
  return validerPlan(nouveau, unites, camion).filter(
    (e) => e.uniteId === uniteId || !avant.has(cle(e)),
  )
}

/**
 * Étapes 2 à 4 du chemin commun. `uniteId` est l'article changé : ses
 * propres règles enfreintes sont citées en premier, les autres articles
 * touchés ensuite (« fragile chargé » après « posé sur un fragile »).
 */
function controler(
  ancien: Placement[],
  nouveau: Placement[],
  uniteId: string,
  unites: Unite[],
  camion: Camion,
): ResultatAjustement {
  const enfreintes = nouvellesEnfreintes(ancien, nouveau, unites, camion, uniteId)
  if (enfreintes.length > 0) {
    // RG-09 : un chevauchement ou une sortie de la caisse est cité seul ;
    // les autres règles qu'il entraîne n'apporteraient que du bruit. Seul
    // l'article changé peut sortir de la caisse, et un chevauchement se lit
    // des deux côtés : on ne garde que le sien.
    const toujoursBloque = enfreintes.filter((e) => e.regle === 'RG-06' && e.uniteId === uniteId)
    const citees = toujoursBloque.length > 0 ? toujoursBloque : enfreintes
    const lesSiennes = citees.filter((e) => e.uniteId === uniteId)
    const lesAutres = citees.filter((e) => e.uniteId !== uniteId)
    return { accepte: false, enfreintes: [...lesSiennes, ...lesAutres] }
  }
  const ordonne = ordonnerChargement(nouveau, unites)
  if (ordonne === null) {
    return { accepte: false, enfreintes: [{ regle: 'RG-08', motif: 'ordreImpossible', uniteId }] }
  }
  return { accepte: true, plan: ordonne }
}

/** Le placement de `uniteId` dans le plan ; une erreur de programmation s'il n'y est pas. */
function placementDe(plan: Placement[], uniteId: string): Placement {
  const p = plan.find((q) => q.uniteId === uniteId)
  if (!p) throw new Error(`Unité absente du plan : ${uniteId}`)
  return p
}

/** Le plan où le placement de `p.uniteId` est remplacé par `p`. */
function remplacer(plan: Placement[], p: Placement): Placement[] {
  return plan.map((q) => (q.uniteId === p.uniteId ? p : q))
}

/**
 * Déplace une unité du plan vers `position`, dans son orientation actuelle
 * (5.2, étape 5). L'unité garde son ancien rang pour le départage de l'ordre
 * de chargement (4.8).
 */
export function deplacer(
  plan: Placement[],
  uniteId: string,
  position: Position,
  unites: Unite[],
  camion: Camion,
): ResultatAjustement {
  const avant = placementDe(plan, uniteId)
  const apres = { ...avant, x: position.x, y: position.y, z: position.z }
  return controler(plan, remplacer(plan, apres), uniteId, unites, camion)
}

/**
 * Hauteur à laquelle poser une unité déplacée en vue de dessus (5.2, étape 1 ;
 * décision 2 du prototype 2) : le dessus le plus haut des articles situés sous
 * son emprise, ou le plancher s'il n'y en a aucun. Un simple calcul, sans
 * simulation physique. L'unité elle-même est ignorée.
 */
export function poserAuPlusBas(
  plan: Placement[],
  uniteId: string,
  position: { x: number; y: number },
  orientation: Orientation,
  unites: Unite[],
): number {
  const emprise = boiteDe(
    { uniteId, ...position, z: 0, orientation, rang: SANS_RANG },
    trouverUnite(uniteId, unites),
  )
  let z = 0
  for (const autre of plan) {
    if (autre.uniteId === uniteId) continue
    const b = boiteDe(autre, trouverUnite(autre.uniteId, unites))
    const sousEmprise =
      recouvrement(emprise.x0, emprise.x1, b.x0, b.x1) > 0 &&
      recouvrement(emprise.y0, emprise.y1, b.y0, b.y1) > 0
    if (sousEmprise) z = Math.max(z, b.z1)
  }
  return z
}

/**
 * L'orientation autorisée qui suit `actuelle`, dans l'ordre à plat, debout,
 * contre une paroi, en revenant au début (5.5). `null` si l'unité n'a pas
 * d'autre orientation autorisée.
 */
export function orientationSuivante(unite: Unite, actuelle: Orientation): Orientation | null {
  const depart = ORDRE_ORIENTATIONS.indexOf(actuelle)
  for (let pas = 1; pas < ORDRE_ORIENTATIONS.length; pas++) {
    const candidate = ORDRE_ORIENTATIONS[(depart + pas) % ORDRE_ORIENTATIONS.length] as Orientation
    if (unite.orientations.includes(candidate)) return candidate
  }
  return null
}

/**
 * Passe une unité à l'orientation autorisée suivante, à la même position
 * (bouton « Changer d'orientation » et touche R, 5.5). Contrôlé comme un
 * déplacement.
 */
export function changerOrientation(
  plan: Placement[],
  uniteId: string,
  unites: Unite[],
  camion: Camion,
): ResultatAjustement {
  const avant = placementDe(plan, uniteId)
  const orientation = orientationSuivante(trouverUnite(uniteId, unites), avant.orientation)
  if (orientation === null) {
    return {
      accepte: false,
      enfreintes: [{ regle: 'RG-04', motif: 'orientationUnique', uniteId }],
    }
  }
  return controler(plan, remplacer(plan, { ...avant, orientation }), uniteId, unites, camion)
}

/**
 * Remet dans le camion, à la pose donnée, une unité de la zone « Articles à
 * placer » (5.7). Elle n'a pas d'ancien rang : elle est chargée le plus tard
 * possible (4.8).
 */
export function remettre(
  plan: Placement[],
  uniteId: string,
  pose: Pose,
  unites: Unite[],
  camion: Camion,
): ResultatAjustement {
  if (plan.some((p) => p.uniteId === uniteId)) {
    throw new Error(`Unité déjà dans le plan : ${uniteId}`)
  }
  const nouveau = [...plan, { uniteId, ...pose, rang: SANS_RANG }]
  return controler(plan, nouveau, uniteId, unites, camion)
}

/**
 * Retire des unités du plan vers la zone « Articles à placer » (5.7 ;
 * décision 12 du prototype 2). Le retrait est contrôlé comme un déplacement :
 * s'il laisse un article sans appui ou un article debout sans calage, il est
 * refusé. Le refus nomme, pour chaque article en cause, l'article retiré qui
 * le portait ou le calait, et dit quels articles retirer aussi pour que le
 * retrait passe.
 */
export function retirer(
  plan: Placement[],
  uniteIds: string[],
  unites: Unite[],
  camion: Camion,
): ResultatRetrait {
  for (const id of uniteIds) placementDe(plan, id)
  const sans = (ids: string[]) => plan.filter((p) => !ids.includes(p.uniteId))

  const enfreintes = nouvellesEnfreintes(plan, sans(uniteIds), unites, camion)
  if (enfreintes.length === 0) {
    // Retirer ne peut pas créer de cycle : l'ordre existe toujours.
    return { accepte: true, plan: ordonnerChargement(sans(uniteIds), unites) ?? [] }
  }

  return {
    accepte: false,
    enfreintes: enfreintes.map((e) => ({
      ...e,
      autreUniteId: causeDuRetrait(e.uniteId, uniteIds, plan, unites),
    })),
    aRetirerAussi: aRetirerAvec(uniteIds, plan, unites, camion),
  }
}

/**
 * L'article retiré qui portait ou calait `uniteId` : celui sur lequel il était
 * posé, sinon celui qui le touchait par le côté, sinon le premier demandé
 * (le calage d'un groupe d'articles debout se perd parfois de proche en proche).
 */
function causeDuRetrait(
  uniteId: string,
  retires: string[],
  plan: Placement[],
  unites: Unite[],
): string | undefined {
  const boite = (id: string) => boiteDe(placementDe(plan, id), trouverUnite(id, unites))
  const b = boite(uniteId)
  const portait = retires.find((id) => estPoseSur(b, boite(id)))
  if (portait) return portait
  const calait = retires.find((id) => {
    const r = boite(id)
    const ecart = Math.max(r.y0 - b.y1, b.y0 - r.y1)
    return ecart >= 0 && ecart <= TOLERANCE_CONTACT && recouvrement(b.x0, b.x1, r.x0, r.x1) > 0
  })
  return calait ?? retires[0]
}

/**
 * Les articles à retirer avec `uniteIds` pour que le retrait passe, calculés
 * de proche en proche (5.7) : on ajoute au retrait les articles en cause,
 * puis ceux que ce nouveau retrait met en cause, jusqu'à ce que plus aucune
 * règle ne soit enfreinte. Cela s'arrête toujours : chaque tour retire au
 * moins un article de plus, et un plan vide n'enfreint rien.
 */
function aRetirerAvec(
  uniteIds: string[],
  plan: Placement[],
  unites: Unite[],
  camion: Camion,
): string[] {
  const retires = [...uniteIds]
  for (;;) {
    const restant = plan.filter((p) => !retires.includes(p.uniteId))
    const enCause = nouvellesEnfreintes(plan, restant, unites, camion)
      .map((e) => e.uniteId)
      .filter((id) => !retires.includes(id))
    if (enCause.length === 0) return retires.slice(uniteIds.length)
    for (const id of enCause) if (!retires.includes(id)) retires.push(id)
  }
}
