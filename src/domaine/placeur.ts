// Le placeur (cahier technique, 4.3) : une méthode gloutonne. Il range les
// unités une par une, dans un ordre réfléchi, chacune à la meilleure place que
// le validateur accepte parmi une liste de points candidats. Il ne revient
// jamais sur une unité déjà placée.
import { ECART_COMPACITE, TOLERANCE_CONTACT } from './constantes'
import { encombrement } from './encombrement'
import {
  type Boite,
  boiteDe,
  estPoseSur,
  surfaceCommuneXY,
  surfaceCommuneXZ,
  surfaceCommuneYZ,
  trouverUnite,
} from './geometrie'
import type { Camion, Orientation, Placement, Unite } from './types'
import { valider } from './validateur'

/** Sens de parcours en largeur : depuis la paroi gauche ou depuis la paroi droite. */
export type Sens = 'gaucheDroite' | 'droiteGauche'

/** Résultat du placeur : l'ordre des placements est l'ordre de chargement. */
export interface ResultatPlaceur<U extends Unite = Unite> {
  placements: Placement[]
  /** Unités qui n'ont trouvé aucune place (RG-10). */
  enTrop: U[]
}

/**
 * Un coin où l'on peut essayer de poser une unité. Son ancrage dit quel bord
 * de l'unité vient sur ce coin : avec l'ancrage `gauche`, l'unité part du
 * point vers la droite (son y vaut celui du point) ; avec l'ancrage `droite`,
 * elle s'étend vers la gauche et son bord droit vient sur le point.
 */
export interface PointCandidat {
  x: number
  y: number
  z: number
  ancrage: 'gauche' | 'droite'
}

/** Un essai accepté par le validateur, avec les quatre critères de son score. */
export interface Essai {
  placement: Placement
  boite: Boite
  /** Compacité : bord avant de toute la charge, côté portes. Plus petit, mieux c'est. */
  front: number
  /** Appui complet : au plancher, ou posée sur d'autres articles par toute sa base. */
  appuiComplet: boolean
  /** Calage : surface de contact latérale avec les parois et les articles. */
  contact: number
  /** Équilibre : écart du centre de gravité à l'axe du camion. */
  ecartAxe: number
}

const volume = (u: Unite) => u.dims.l * u.dims.w * u.dims.h

/**
 * Ordre de placement (4.3, étape 2) : la commande livrée en dernier d'abord,
 * puisqu'elle va au fond (RG-07) ; dans une commande, les plus lourds d'abord
 * pour qu'ils soient en bas (RG-04, RG-05) ; à poids égal, les plus
 * volumineux. Le tri est stable : à égalité, l'ordre reçu est gardé.
 */
export function trierUnites<U extends Unite>(unites: U[]): U[] {
  return [...unites].sort(
    (a, b) => b.commandeRang - a.commandeRang || b.poids - a.poids || volume(b) - volume(a),
  )
}

/** Le coin du fond, au plancher, du côté où commence le parcours. */
function coinDeDepart(sens: Sens, camion: Camion): PointCandidat {
  return sens === 'gaucheDroite'
    ? { x: 0, y: 0, z: 0, ancrage: 'gauche' }
    : { x: 0, y: camion.largeur, z: 0, ancrage: 'droite' }
}

/**
 * Les trois nouveaux points autour d'une unité qu'on vient de placer (4.3,
 * étape 5) : devant elle côté portes, à côté d'elle dans le sens de parcours,
 * et au-dessus. En sens droite-gauche, tout est vu en miroir.
 */
function pointsAutourDe(b: Boite, sens: Sens): PointCandidat[] {
  if (sens === 'gaucheDroite') {
    return [
      { x: b.x1, y: b.y0, z: b.z0, ancrage: 'gauche' },
      { x: b.x0, y: b.y1, z: b.z0, ancrage: 'gauche' },
      { x: b.x0, y: b.y0, z: b.z1, ancrage: 'gauche' },
    ]
  }
  return [
    { x: b.x1, y: b.y1, z: b.z0, ancrage: 'droite' },
    { x: b.x0, y: b.y0, z: b.z0, ancrage: 'droite' },
    { x: b.x0, y: b.y1, z: b.z1, ancrage: 'droite' },
  ]
}

/**
 * Le quatrième point, en option (4.3, étape 5) : le point « à côté », poussé
 * jusqu'à la paroi d'en face. Il garde le x et le z de l'unité posée, mais
 * se place contre la paroi opposée au sens de parcours, ancré de ce côté-là.
 * Sans lui, le placeur ne crée de points qu'au bord des unités posées et
 * n'atteint jamais la paroi d'en face : la charge penche d'un côté.
 */
function pointParoiOpposee(b: Boite, sens: Sens, camion: Camion): PointCandidat {
  return sens === 'gaucheDroite'
    ? { x: b.x0, y: camion.largeur, z: b.z0, ancrage: 'droite' }
    : { x: b.x0, y: 0, z: b.z0, ancrage: 'gauche' }
}

/** Les options d'une variante du placeur qui ne dépendent pas du rang. */
export interface OptionsPlaceur {
  /** Ajouter, après chaque unité, le point contre la paroi opposée. */
  pointParoiOpposee?: boolean
}

const cleDe = (p: PointCandidat) => `${p.x};${p.y};${p.z};${p.ancrage}`

/**
 * Parcours des points (4.3, étape 4) : du fond vers les portes, puis du bas
 * vers le haut, puis en largeur dans le sens de parcours.
 */
function ordonner(points: PointCandidat[], sens: Sens): PointCandidat[] {
  const signe = sens === 'gaucheDroite' ? 1 : -1
  return [...points].sort((a, b) => a.x - b.x || a.z - b.z || signe * (a.y - b.y))
}

/**
 * Surface des faces verticales de `b` en contact, à `TOLERANCE_CONTACT` près,
 * avec le fond, les parois latérales et les autres articles. Le plancher et
 * le dessus ne comptent pas : le calage empêche de glisser sur les côtés.
 */
function surfaceDeContact(b: Boite, autres: Boite[], camion: Camion): number {
  const longueur = b.x1 - b.x0
  const largeur = b.y1 - b.y0
  const hauteur = b.z1 - b.z0
  let surface = 0
  if (b.x0 <= TOLERANCE_CONTACT) surface += largeur * hauteur
  if (b.y0 <= TOLERANCE_CONTACT) surface += longueur * hauteur
  if (camion.largeur - b.y1 <= TOLERANCE_CONTACT) surface += longueur * hauteur
  for (const a of autres) {
    const ecartX = Math.max(b.x0 - a.x1, a.x0 - b.x1)
    const ecartY = Math.max(b.y0 - a.y1, a.y0 - b.y1)
    if (ecartX >= 0 && ecartX <= TOLERANCE_CONTACT) surface += surfaceCommuneYZ(b, a)
    if (ecartY >= 0 && ecartY <= TOLERANCE_CONTACT) surface += surfaceCommuneXZ(b, a)
  }
  return surface
}

/**
 * L'unité posée en `b` repose-t-elle par toute sa base, au plancher ou sur
 * les articles qu'elle touche par-dessous ? Ceux-ci ne se chevauchent pas :
 * leurs surfaces communes s'additionnent sans double compte.
 */
function estEnAppuiComplet(b: Boite, autres: Boite[]): boolean {
  if (b.z0 <= 0) return true
  const base = (b.x1 - b.x0) * (b.y1 - b.y0)
  const appui = autres
    .filter((a) => estPoseSur(b, a))
    .reduce((somme, a) => somme + surfaceCommuneXY(b, a), 0)
  return appui >= base
}

/**
 * Ce que le score d'un essai doit savoir de la charge déjà posée : ses boîtes,
 * son bord avant côté portes, et de quoi calculer son centre de gravité en y.
 */
export interface ContexteEssai {
  boites: Boite[]
  front: number
  sommePoids: number
  sommePoidsY: number
}

/** Le contexte d'une charge posée : `boites[i]` est la boîte de `poids[i]`. */
export function contexteDe(boites: Boite[], poids: number[]): ContexteEssai {
  let sommePoids = 0
  let sommePoidsY = 0
  for (const [i, b] of boites.entries()) {
    const p = poids[i] ?? 0
    sommePoids += p
    sommePoidsY += p * ((b.y0 + b.y1) / 2)
  }
  return { boites, front: Math.max(0, ...boites.map((b) => b.x1)), sommePoids, sommePoidsY }
}

/**
 * L'unité posée au point candidat, dans l'orientation donnée : son placement
 * et sa boîte. Avec l'ancrage `droite`, son bord droit vient sur le point.
 */
export function poserAuPoint(
  point: PointCandidat,
  unite: Unite,
  orientation: Orientation,
  rang: number,
): { placement: Placement; boite: Boite } {
  const { l, w, h } = encombrement(unite.dims, orientation)
  const y = point.ancrage === 'gauche' ? point.y : point.y - w
  return {
    placement: { uniteId: unite.id, x: point.x, y, z: point.z, orientation, rang },
    boite: { x0: point.x, x1: point.x + l, y0: y, y1: y + w, z0: point.z, z1: point.z + h },
  }
}

/** Note un essai déjà accepté par le validateur : les quatre critères de 4.3, étape 4. */
export function creerEssai(
  placement: Placement,
  boite: Boite,
  poids: number,
  contexte: ContexteEssai,
  camion: Camion,
): Essai {
  const cgY =
    (contexte.sommePoidsY + poids * ((boite.y0 + boite.y1) / 2)) / (contexte.sommePoids + poids)
  return {
    placement,
    boite,
    front: Math.max(contexte.front, boite.x1),
    appuiComplet: estEnAppuiComplet(boite, contexte.boites),
    contact: surfaceDeContact(boite, contexte.boites, camion),
    ecartAxe: Math.abs(cgY - camion.largeur / 2),
  }
}

/**
 * Tous les points candidats autour d'une charge déjà posée, comme le placeur
 * les crée (4.3, étapes 3 et 5) : les deux coins de départ, puis, autour de
 * chaque boîte, les trois points de chaque sens de parcours et le point
 * contre la paroi opposée. Sans doublon, du fond vers les portes, puis du bas
 * vers le haut.
 */
export function pointsCandidats(boites: Boite[], camion: Camion): PointCandidat[] {
  const points = new Map<string, PointCandidat>()
  const ajouter = (p: PointCandidat) => points.set(cleDe(p), p)
  for (const sens of ['gaucheDroite', 'droiteGauche'] as const) {
    ajouter(coinDeDepart(sens, camion))
    for (const b of boites) {
      for (const p of pointsAutourDe(b, sens)) ajouter(p)
      ajouter(pointParoiOpposee(b, sens, camion))
    }
  }
  return ordonner([...points.values()], 'gaucheDroite')
}

/**
 * Classe des essais du meilleur au moins bon, avec le choix du placeur
 * (`meilleurEssai`) : on prend le meilleur, on le met de côté, et on
 * recommence avec les autres. Le premier est donc celui que le placeur
 * aurait retenu.
 */
export function classerEssais(essais: Essai[]): Essai[] {
  const restants = [...essais]
  const classes: Essai[] = []
  while (restants.length > 0) {
    const meilleur = meilleurEssai(restants)
    classes.push(meilleur)
    restants.splice(restants.indexOf(meilleur), 1)
  }
  return classes
}

/** `e` passe-t-il avant `retenu`, à compacité proche ? Appui complet, puis calage, puis équilibre. */
function estMieuxQue(e: Essai, retenu: Essai): boolean {
  if (e.appuiComplet !== retenu.appuiComplet) return e.appuiComplet
  if (e.contact !== retenu.contact) return e.contact > retenu.contact
  return e.ecartAxe < retenu.ecartAxe
}

/**
 * Choisit le meilleur essai (4.3, étape 4) : on garde ceux dont la compacité
 * est à moins de `ECART_COMPACITE` de la meilleure, puis celui en appui
 * complet, puis le mieux calé, puis le mieux équilibré. À égalité complète,
 * le premier dans l'ordre de parcours.
 *
 * L'appui complet passe avant le calage : une unité qui enjambe un vide
 * (permis dès `SEUIL_APPUI`) le ferme par-dessus, et un article long qui
 * viendrait plus tard ne pourrait plus s'y glisser au plancher.
 */
export function meilleurEssai(essais: Essai[]): Essai {
  const meilleurFront = Math.min(...essais.map((e) => e.front))
  return essais
    .filter((e) => e.front - meilleurFront < ECART_COMPACITE)
    .reduce((retenu, e) => (estMieuxQue(e, retenu) ? e : retenu))
}

/**
 * Le placeur, pour une variante donnée (4.4) : les unités sont placées dans
 * l'ordre reçu, sans nouveau tri, et `sensDe` donne le sens de parcours en
 * largeur pour chaque rang de livraison. `options` active le point contre la
 * paroi opposée.
 *
 * `unites` contient toutes les unités, y compris celles des placements
 * `fixes` : celles-ci gardent leur place et servent d'obstacles.
 */
export function placerVariante<U extends Unite>(
  unites: U[],
  camion: Camion,
  fixes: Placement[],
  sensDe: (rang: number) => Sens,
  options: OptionsPlaceur = {},
): ResultatPlaceur<U> {
  const plan: Placement[] = [...fixes]
  const boites: Boite[] = fixes.map((p) => boiteDe(p, trouverUnite(p.uniteId, unites)))
  const points = new Map<string, PointCandidat>()
  const ajouterPoints = (nouveaux: PointCandidat[]) => {
    for (const p of nouveaux) points.set(cleDe(p), p)
  }
  /** Les points autour d'une unité posée : trois, plus le quatrième en option. */
  const pointsApres = (b: Boite, sens: Sens): PointCandidat[] =>
    options.pointParoiOpposee
      ? [...pointsAutourDe(b, sens), pointParoiOpposee(b, sens, camion)]
      : pointsAutourDe(b, sens)
  // Les placements fixes ont pu être trouvés dans un sens ou dans l'autre.
  for (const b of boites)
    ajouterPoints([...pointsApres(b, 'gaucheDroite'), ...pointsApres(b, 'droiteGauche')])

  const contexte = contexteDe(
    boites,
    fixes.map((p) => trouverUnite(p.uniteId, unites).poids),
  )
  let rang = Math.max(0, ...fixes.map((p) => p.rang)) + 1

  const dejaPlacees = new Set(fixes.map((p) => p.uniteId))
  const enTrop: U[] = []

  for (const unite of unites) {
    if (dejaPlacees.has(unite.id)) continue
    const sens = sensDe(unite.commandeRang)
    const candidats = ordonner([...points.values(), coinDeDepart(sens, camion)], sens)

    const essais: Essai[] = []
    for (const point of candidats) {
      for (const orientation of unite.orientations) {
        const { placement, boite } = poserAuPoint(point, unite, orientation, rang)
        if (valider(placement, plan, unites, camion).length > 0) continue
        essais.push(creerEssai(placement, boite, unite.poids, contexte, camion))
      }
    }

    if (essais.length === 0) {
      enTrop.push(unite) // RG-10 : aucune place trouvée
      continue
    }
    const retenu = meilleurEssai(essais)
    plan.push(retenu.placement)
    boites.push(retenu.boite)
    ajouterPoints(pointsApres(retenu.boite, sens))
    contexte.front = retenu.front
    contexte.sommePoids += unite.poids
    contexte.sommePoidsY += unite.poids * ((retenu.boite.y0 + retenu.boite.y1) / 2)
    rang++
  }

  return { placements: plan, enTrop }
}

/**
 * Calcule un plan de chargement (cahier technique, 4.3 et 4.7) : tri des
 * unités, puis placement glouton en partant de la paroi gauche, avec les
 * trois points de base. Le point contre la paroi opposée n'est essayé que
 * par les variantes d'`optimiser`.
 */
export function placer<U extends Unite>(
  unites: U[],
  camion: Camion,
  fixes: Placement[] = [],
): ResultatPlaceur<U> {
  return placerVariante(trierUnites(unites), camion, fixes, () => 'gaucheDroite')
}
