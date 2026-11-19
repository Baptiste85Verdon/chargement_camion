// Places proposées et placement automatique depuis la zone « Articles à
// placer » (cahier technique 5.3 et 5.7 ; décisions 9 et 10 du prototype 2).
//
// Les deux s'appuient sur le placeur au lieu de refaire sa recherche :
// - `proposerPlaces` essaie les points candidats du placeur autour des autres
//   articles, garde ceux que l'ajustement manuel accepte (validateur, puis
//   ordre de chargement), et les classe avec le score du placeur ;
// - `placerDepuisZone` appelle `placer` avec le plan actuel comme fixes :
//   aucun autre article ne bouge.
//
// Dans les deux cas, chaque place passe par `deplacer` ou `remettre` : une
// place proposée ou choisie automatiquement est exactement une place que
// l'opérateur aurait pu obtenir à la main.
import { deplacer, type Pose, remettre, type ResultatAjustement } from './ajustement'
import { MAX_PLACES_PROPOSEES, SANS_RANG } from './constantes'
import { boiteDe, trouverUnite } from './geometrie'
import {
  classerEssais,
  contexteDe,
  creerEssai,
  type Essai,
  placer,
  poserAuPoint,
  pointsCandidats,
  trierUnites,
} from './placeur'
import type { Camion, Orientation, Placement, Unite } from './types'
import { valider } from './validateur'

export interface OptionsPlaces {
  /**
   * Orientation d'un article de la zone, qui n'en a pas encore. Un article
   * du plan garde toujours son orientation actuelle. Par défaut : la première
   * orientation autorisée.
   */
  orientation?: Orientation
  /** Nombre maximal de places rendues : `MAX_PLACES_PROPOSEES` par défaut. */
  max?: number
}

/**
 * Les places proposées par « Choisir une place » (5.3 ; capture 04h), de la
 * meilleure à la moins bonne, `MAX_PLACES_PROPOSEES` au plus.
 *
 * 1. On prend les points candidats du placeur autour des autres articles du
 *    plan (coins des articles et des parois), sans l'article lui-même.
 * 2. On y pose l'article, dans son orientation actuelle.
 * 3. On garde la place si l'ajustement manuel l'accepte : `deplacer` pour un
 *    article du plan, `remettre` pour un article de la zone. Le validateur
 *    est d'abord consulté seul, plus vite, pour écarter les places évidemment
 *    refusées.
 * 4. On classe les places gardées avec le choix du placeur : la première est
 *    celle qu'il aurait retenue.
 *
 * La place où l'article se trouve déjà n'est pas proposée.
 */
export function proposerPlaces(
  plan: Placement[],
  uniteId: string,
  unites: Unite[],
  camion: Camion,
  options: OptionsPlaces = {},
): Pose[] {
  const unite = trouverUnite(uniteId, unites)
  const actuel = plan.find((p) => p.uniteId === uniteId)
  const orientation = actuel?.orientation ?? options.orientation ?? premiereOrientation(unite)
  const autres = plan.filter((p) => p.uniteId !== uniteId)
  const boites = autres.map((p) => boiteDe(p, trouverUnite(p.uniteId, unites)))
  const contexte = contexteDe(
    boites,
    autres.map((p) => trouverUnite(p.uniteId, unites).poids),
  )

  const essais = new Map<string, Essai>()
  for (const point of pointsCandidats(boites, camion)) {
    const { placement, boite } = poserAuPoint(point, unite, orientation, SANS_RANG)
    const cle = `${placement.x};${placement.y};${placement.z}`
    if (essais.has(cle) || estALaMemePlace(placement, actuel)) continue
    if (valider(placement, autres, unites, camion).length > 0) continue
    if (!essayer(plan, placement, actuel !== undefined, unites, camion).accepte) continue
    essais.set(cle, creerEssai(placement, boite, unite.poids, contexte, camion))
  }

  return classerEssais([...essais.values()])
    .slice(0, options.max ?? MAX_PLACES_PROPOSEES)
    .map(({ placement: { x, y, z, orientation: o } }) => ({ x, y, z, orientation: o }))
}

function premiereOrientation(unite: Unite): Orientation {
  const orientation = unite.orientations[0]
  if (!orientation) throw new Error(`Aucune orientation autorisée : ${unite.id}`)
  return orientation
}

function estALaMemePlace(p: Placement, actuel: Placement | undefined): boolean {
  return actuel !== undefined && p.x === actuel.x && p.y === actuel.y && p.z === actuel.z
}

/** Le chemin de l'ajustement manuel : déplacer un article du plan, ou remettre un article de la zone. */
function essayer(
  plan: Placement[],
  p: Placement,
  dansLePlan: boolean,
  unites: Unite[],
  camion: Camion,
): ResultatAjustement {
  return dansLePlan
    ? deplacer(plan, p.uniteId, p, unites, camion)
    : remettre(plan, p.uniteId, p, unites, camion)
}

/** Ce que rendent « Placer » et « Tout placer ». */
export interface ResultatPlacementZone {
  /** Le nouveau plan, dans l'ordre de chargement. */
  plan: Placement[]
  /** Les articles placés, dans l'ordre où ils l'ont été. */
  places: string[]
  /** Les articles qui n'ont pas trouvé de place : ils restent dans la zone (RG-10). */
  restants: string[]
}

/**
 * « Placer » (un article) et « Tout placer » (5.7 ; décision 9 du prototype 2).
 * Les articles de la zone sont pris dans l'ordre du placeur (4.3, étape 2).
 * Pour chacun :
 * 1. `placer` lui cherche une place, avec les placements actuels comme
 *    fixes : aucun autre article ne bouge ;
 * 2. la place trouvée passe par `remettre`, comme une remise à la main :
 *    contrôle des autres articles et ordre de chargement recalculé (4.8).
 * Un article sans place, ou dont la place est refusée, reste dans la zone.
 */
export function placerDepuisZone(
  plan: Placement[],
  uniteIds: string[],
  unites: Unite[],
  camion: Camion,
): ResultatPlacementZone {
  let courant = plan
  const places: string[] = []
  const restants: string[] = []
  for (const unite of trierUnites(uniteIds.map((id) => trouverUnite(id, unites)))) {
    const dansLePlan = unites.filter((u) => courant.some((p) => p.uniteId === u.id))
    const trouve = placer([...dansLePlan, unite], camion, courant).placements.find(
      (p) => p.uniteId === unite.id,
    )
    const resultat = trouve && remettre(courant, unite.id, trouve, unites, camion)
    if (resultat?.accepte) {
      courant = resultat.plan
      places.push(unite.id)
    } else {
      restants.push(unite.id)
    }
  }
  return { plan: courant, places, restants }
}
