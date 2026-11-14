// Choisir le meilleur plan (cahier technique, 4.4). Un seul passage du
// placeur ne regarde l'équilibre qu'en dernier recours ; `optimiser` :
// 1. lance le placeur en plusieurs variantes ;
// 2. garde la meilleure, selon un ordre de critères fixé ;
// 3. l'améliore par des échanges qui rapprochent la charge de l'axe.
import { diagnostiquerCalage } from './calage'
import { ECART_ENCOMBREMENT_ECHANGE, ECART_POIDS_PROCHE, MAX_ESSAIS_ECHANGES } from './constantes'
import { mesurerEquilibre } from './equilibre'
import { type Boite, boiteDe, trouverUnite } from './geometrie'
import { placerVariante, type ResultatPlaceur, type Sens, trierUnites } from './placeur'
import type { Camion, Placement, Unite } from './types'
import { validerPlan } from './validateur'

/** Ce qui change d'une variante du placeur à l'autre. */
export interface Variante {
  /** Sens de parcours en largeur pour chaque rang de livraison. */
  sensDe: (rang: number) => Sens
  /** Inverser l'ordre des unités de même rang et de poids proche. */
  permuterPoidsProches: boolean
}

/**
 * Les huit variantes : quatre sens de parcours (tout depuis la gauche, tout
 * depuis la droite, puis en alternant commande par commande dans un sens et
 * dans l'autre), chacun avec l'ordre normal et l'ordre permuté.
 */
export function variantes(): Variante[] {
  const sens: ((rang: number) => Sens)[] = [
    () => 'gaucheDroite',
    () => 'droiteGauche',
    (rang) => (rang % 2 === 0 ? 'gaucheDroite' : 'droiteGauche'),
    (rang) => (rang % 2 === 0 ? 'droiteGauche' : 'gaucheDroite'),
  ]
  return sens.flatMap((sensDe) =>
    [false, true].map((permuter) => ({ sensDe, permuterPoidsProches: permuter })),
  )
}

/**
 * Inverse l'ordre de chaque groupe d'unités consécutives de même rang et de
 * poids proche : une unité rejoint le groupe si elle pèse au moins
 * (1 − `ECART_POIDS_PROCHE`) fois la première du groupe. La liste reçue doit
 * déjà être triée par `trierUnites`.
 */
export function permuterPoidsProches<U extends Unite>(triees: U[]): U[] {
  const resultat: U[] = []
  let groupe: U[] = []
  for (const u of triees) {
    const tete = groupe[0]
    const proche =
      tete !== undefined &&
      tete.commandeRang === u.commandeRang &&
      u.poids >= (1 - ECART_POIDS_PROCHE) * tete.poids
    if (proche) {
      groupe.push(u)
    } else {
      resultat.push(...groupe.reverse())
      groupe = [u]
    }
  }
  resultat.push(...groupe.reverse())
  return resultat
}

/** Les critères de comparaison d'un plan, dans l'ordre où ils comptent. */
export interface Evaluation {
  enTrop: number
  malCales: number
  /** Plus grand écart de la part gauche à 50 %, sur toute la tournée (0 à 0,5). */
  pireEcart: number
  /** Compacité : bord avant de la charge, côté portes, en mm. */
  front: number
}

function pireEcartDe(plan: Placement[], unites: Unite[], camion: Camion): number {
  const { etapes } = mesurerEquilibre(plan, unites, camion)
  return Math.max(0, ...etapes.map((e) => Math.abs(e.partGauche - 0.5)))
}

export function evaluer(resultat: ResultatPlaceur, unites: Unite[], camion: Camion): Evaluation {
  const { placements } = resultat
  return {
    enTrop: resultat.enTrop.length,
    malCales: diagnostiquerCalage(placements, unites, camion).length,
    pireEcart: pireEcartDe(placements, unites, camion),
    front: Math.max(0, ...placements.map((p) => boiteDe(p, trouverUnite(p.uniteId, unites)).x1)),
  }
}

/**
 * `a` est-il meilleur que `b` ? Le moins d'articles en trop, puis le moins
 * d'articles mal calés, puis le meilleur équilibre au pire moment, puis la
 * compacité. Une fois que tout rentre, l'équilibre passe avant la compacité.
 */
export function estMeilleur(a: Evaluation, b: Evaluation): boolean {
  if (a.enTrop !== b.enTrop) return a.enTrop < b.enTrop
  if (a.malCales !== b.malCales) return a.malCales < b.malCales
  if (a.pireEcart !== b.pireEcart) return a.pireEcart < b.pireEcart
  return a.front < b.front
}

/** Un échange : des paires d'unités qui prennent chacune la place de l'autre. */
type Echange = [string, string][]

interface Occupe {
  placement: Placement
  boite: Boite
}

function memeEncombrement(a: Boite, b: Boite): boolean {
  const proche = (u: number, v: number) => Math.abs(u - v) <= ECART_ENCOMBREMENT_ECHANGE
  return (
    proche(a.x1 - a.x0, b.x1 - b.x0) &&
    proche(a.y1 - a.y0, b.y1 - b.y0) &&
    proche(a.z1 - a.z0, b.z1 - b.z0)
  )
}

/** De part et d'autre de l'axe : les deux centres en largeur sont de côtés opposés. */
function deCotesOpposes(centreA: number, centreB: number, camion: Camion): boolean {
  const axe = camion.largeur / 2
  return (centreA - axe) * (centreB - axe) < 0
}

/** Échanges d'unités seules : même encombrement, de part et d'autre de l'axe. */
function echangesDUnites(occupes: Occupe[], camion: Camion): Echange[] {
  const echanges: Echange[] = []
  for (const [i, a] of occupes.entries()) {
    for (const b of occupes.slice(i + 1)) {
      const centreA = (a.boite.y0 + a.boite.y1) / 2
      const centreB = (b.boite.y0 + b.boite.y1) / 2
      if (deCotesOpposes(centreA, centreB, camion) && memeEncombrement(a.boite, b.boite)) {
        echanges.push([[a.placement.uniteId, b.placement.uniteId]])
      }
    }
  }
  return echanges
}

/**
 * Échanges de couloirs entiers. Un couloir est ici l'ensemble des unités qui
 * occupent exactement la même bande en largeur. Deux couloirs s'échangent
 * s'ils sont de part et d'autre de l'axe et de même forme : autant d'unités,
 * de même encombrement, aux mêmes positions relatives (à
 * `ECART_ENCOMBREMENT_ECHANGE` près). Chaque unité prend alors la place de
 * son homologue : un couloir de même longueur, empilements compris.
 */
function echangesDeCouloirs(occupes: Occupe[], fixes: Set<string>, camion: Camion): Echange[] {
  const parBande = new Map<string, Occupe[]>()
  for (const o of occupes) {
    const cle = `${o.boite.y0};${o.boite.y1}`
    parBande.set(cle, [...(parBande.get(cle) ?? []), o])
  }
  const couloirs = [...parBande.values()]
    .filter((c) => c.length >= 2 && c.every((o) => !fixes.has(o.placement.uniteId)))
    .map((c) => [...c].sort((a, b) => a.boite.x0 - b.boite.x0 || a.boite.z0 - b.boite.z0))

  const echanges: Echange[] = []
  for (const [i, a] of couloirs.entries()) {
    for (const b of couloirs.slice(i + 1)) {
      const premierA = a[0] as Occupe
      const premierB = b[0] as Occupe
      const centreA = (premierA.boite.y0 + premierA.boite.y1) / 2
      const centreB = (premierB.boite.y0 + premierB.boite.y1) / 2
      if (a.length !== b.length || !deCotesOpposes(centreA, centreB, camion)) continue
      const homologues = a.every((oa, k) => {
        const ob = b[k] as Occupe
        const decalageX = oa.boite.x0 - premierA.boite.x0 - (ob.boite.x0 - premierB.boite.x0)
        const decalageZ = oa.boite.z0 - ob.boite.z0
        return (
          memeEncombrement(oa.boite, ob.boite) &&
          Math.abs(decalageX) <= ECART_ENCOMBREMENT_ECHANGE &&
          Math.abs(decalageZ) <= ECART_ENCOMBREMENT_ECHANGE
        )
      })
      if (homologues) {
        echanges.push(a.map((oa, k) => [oa.placement.uniteId, (b[k] as Occupe).placement.uniteId]))
      }
    }
  }
  return echanges
}

/**
 * Applique un échange : les positions, orientations et rangs de chargement
 * restent où ils sont, seules les unités changent de place. L'ordre de
 * chargement reste donc réalisable.
 */
function appliquer(plan: Placement[], echange: Echange): Placement[] {
  const remplacant = new Map<string, string>()
  for (const [a, b] of echange) {
    remplacant.set(a, b)
    remplacant.set(b, a)
  }
  return plan.map((p) => ({ ...p, uniteId: remplacant.get(p.uniteId) ?? p.uniteId }))
}

/**
 * Améliore l'équilibre d'un plan par échanges (4.4, étape 3). Un échange est
 * gardé si le validateur accepte tout le plan, s'il ne crée aucun nouvel
 * article mal calé et s'il diminue l'écart à l'axe au pire moment. On
 * recommence jusqu'à ne plus rien améliorer, dans la limite de
 * `MAX_ESSAIS_ECHANGES` essais. Les unités de `fixes` ne bougent jamais.
 */
export function ameliorerParEchanges(
  plan: Placement[],
  unites: Unite[],
  camion: Camion,
  fixes: Set<string> = new Set(),
): Placement[] {
  let courant = plan
  let pireEcart = pireEcartDe(courant, unites, camion)
  let malCales = new Set(diagnostiquerCalage(courant, unites, camion))
  let essais = 0
  let ameliore = true

  while (ameliore && essais < MAX_ESSAIS_ECHANGES) {
    ameliore = false
    const occupes: Occupe[] = courant
      .filter((p) => !fixes.has(p.uniteId))
      .map((p) => ({ placement: p, boite: boiteDe(p, trouverUnite(p.uniteId, unites)) }))
    const echanges = [
      ...echangesDUnites(occupes, camion),
      ...echangesDeCouloirs(occupes, fixes, camion),
    ]

    for (const echange of echanges) {
      if (essais >= MAX_ESSAIS_ECHANGES) break
      essais++
      const candidat = appliquer(courant, echange)
      const ecart = pireEcartDe(candidat, unites, camion)
      if (ecart >= pireEcart) continue
      if (validerPlan(candidat, unites, camion).length > 0) continue
      const malCalesCandidat = diagnostiquerCalage(candidat, unites, camion)
      if (malCalesCandidat.some((id) => !malCales.has(id))) continue
      courant = candidat
      pireEcart = ecart
      malCales = new Set(malCalesCandidat)
      ameliore = true
      break
    }
  }
  return courant
}

/**
 * Calcule le meilleur plan (cahier technique, 4.4 et 4.7) : huit variantes du
 * placeur, la meilleure selon `estMeilleur`, puis l'amélioration par échanges.
 * Les placements `fixes` gardent leur place.
 */
export function optimiser<U extends Unite>(
  unites: U[],
  camion: Camion,
  fixes: Placement[] = [],
): ResultatPlaceur<U> {
  const triees = trierUnites(unites)
  let meilleur: { resultat: ResultatPlaceur<U>; evaluation: Evaluation } | undefined
  for (const v of variantes()) {
    const ordre = v.permuterPoidsProches ? permuterPoidsProches(triees) : triees
    const resultat = placerVariante(ordre, camion, fixes, v.sensDe)
    const evaluation = evaluer(resultat, unites, camion)
    if (!meilleur || estMeilleur(evaluation, meilleur.evaluation))
      meilleur = { resultat, evaluation }
  }
  // Il y a toujours au moins une variante : `meilleur` est défini.
  const { placements, enTrop } = (meilleur as { resultat: ResultatPlaceur<U> }).resultat
  const idsFixes = new Set(fixes.map((p) => p.uniteId))
  return { placements: ameliorerParEchanges(placements, unites, camion, idsFixes), enTrop }
}
