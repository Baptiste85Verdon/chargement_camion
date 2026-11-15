// Contenu d'une vue du plan (cahier technique, 5.8 à 5.10).
//
// `projeterPlan` sait dessiner un plan dans une vue. Ce module décide
// d'abord QUOI lui donner, selon les réglages du cadre :
// - la vue par étape (5.9) : les articles déjà chargés, celui de l'étape en
//   cours, et les suivants en silhouette ou pas du tout ;
// - le filtre de profondeur (5.10) : seulement une tranche de la caisse.
// Les silhouettes et les articles masqués par le filtre ne cachent rien et
// ne sont jamais comptés comme cachés : seuls les articles affichés passent
// par `projeterPlan`.
import { TOLERANCE_CONTACT } from './constantes'
import { boiteDe, estPoseSur, trouverUnite } from './geometrie'
import {
  type Projection,
  type ProjectionPlan,
  type Rectangle,
  type Vue,
  projeter,
  plusGrandeZoneVisible,
  projeterPlan,
} from './projection'
import type { Camion, Orientation, Placement, Unite } from './types'

/** Repère d'un article dans le plan : « A07 » pour le 7e chargé. */
export function repereArticle(rang: number): string {
  return `A${String(rang).padStart(2, '0')}`
}

/** Profondeur de la caisse dans l'axe du regard de la vue, en mm. */
export function profondeurVue(camion: Camion, vue: Vue): number {
  switch (vue) {
    case 'dessus':
      return camion.hauteur
    case 'gauche':
    case 'droite':
      return camion.largeur
    case 'avant':
    case 'arriere':
      return camion.longueur
  }
}

/** Tranche de profondeur, en mm depuis le côté de l'observateur. */
export interface Tranche {
  debut: number
  fin: number
}

/**
 * Un article est dans la tranche si une partie de son épaisseur y tombe :
 * en vue de côté gauche, la tranche « 0 à 1 m » garde un article posé entre
 * 0,9 et 1,9 m de la paroi. Un article qui ne fait que toucher la tranche
 * n'y est pas.
 */
export function dansTranche(profondeur: Projection['profondeur'], tranche: Tranche): boolean {
  return Math.min(profondeur.loin, tranche.fin) - Math.max(profondeur.proche, tranche.debut) > 0
}

/**
 * État d'un bloc dans la vue :
 * - `normal` : article chargé (ou plan complet) ;
 * - `enCours` : l'article de l'étape affichée ;
 * - `silhouette` : une étape à venir, montrée en pointillés.
 */
export type EtatBloc = 'normal' | 'enCours' | 'silhouette'

export interface BlocVue extends ProjectionPlan {
  rang: number
  etat: EtatBloc
}

export interface OptionsVue {
  /** Étape affichée, de 0 (camion vide) au nombre d'articles ; absente : plan complet. */
  etape?: number | null
  /** En vue par étape, montrer les étapes suivantes en silhouette. */
  silhouettes?: boolean
  /** Filtre de profondeur ; absent : toute la caisse. */
  tranche?: Tranche | null
}

export interface ContenuVue {
  /** Blocs dans l'ordre de dessin : silhouettes, puis du plus loin au plus proche. */
  blocs: BlocVue[]
  /** Articles affichés mais entièrement cachés par ceux de devant, par rang. */
  caches: string[]
  /** Articles qui seraient affichés sans le filtre de profondeur. */
  masquesParFiltre: number
}

/** Compose le contenu d'un cadre de vue, selon l'étape et le filtre. */
export function composerVue(
  plan: Placement[],
  unites: Unite[],
  camion: Camion,
  vue: Vue,
  options: OptionsVue = {},
): ContenuVue {
  const { etape = null, silhouettes = false, tranche = null } = options
  const etatDe = (rang: number): EtatBloc | null => {
    if (etape === null || rang < etape) return 'normal'
    if (rang === etape) return 'enCours'
    return silhouettes ? 'silhouette' : null
  }

  // 1. Ce que l'étape laisse voir, puis ce que le filtre garde.
  const montres = plan.flatMap((p) => {
    const etat = etatDe(p.rang)
    if (etat === null) return []
    const projection = projeter(p, trouverUnite(p.uniteId, unites), camion, vue)
    return [{ placement: p, etat, projection }]
  })
  const gardes = tranche
    ? montres.filter((m) => dansTranche(m.projection.profondeur, tranche))
    : montres

  // 2. Les articles affichés passent par projeterPlan ; les silhouettes, non.
  const rangDe = new Map(plan.map((p) => [p.uniteId, p.rang]))
  const etatParId = new Map(gardes.map((m) => [m.placement.uniteId, m.etat]))
  const affiches = gardes.filter((m) => m.etat !== 'silhouette').map((m) => m.placement)
  const projetes: BlocVue[] = projeterPlan(affiches, unites, camion, vue).map((p) => ({
    ...p,
    rang: rangDe.get(p.uniteId) ?? 0,
    etat: etatParId.get(p.uniteId) ?? 'normal',
  }))
  const formes: BlocVue[] = gardes
    .filter((m) => m.etat === 'silhouette')
    .map((m): BlocVue => ({
      ...m.projection,
      cache: false,
      rang: m.placement.rang,
      etat: 'silhouette',
    }))
    // Entre elles aussi, de la plus éloignée à la plus proche.
    .sort((a, b) => b.profondeur.proche - a.profondeur.proche)

  return {
    blocs: [...formes, ...projetes],
    caches: projetes
      .filter((b) => b.cache)
      .sort((a, b) => a.rang - b.rang)
      .map((b) => b.uniteId),
    masquesParFiltre: montres.length - gardes.length,
  }
}

/**
 * Articles affichés devant `uniteId` qui le recouvrent en partie : au survol
 * ou au focus, ils deviennent semi-transparents (5.10). Les silhouettes ne
 * recouvrent rien.
 */
export function recouvrants(uniteId: string, blocs: BlocVue[]): string[] {
  const cible = blocs.find((b) => b.uniteId === uniteId)
  if (!cible) return []
  const r = cible.rect
  return blocs
    .filter(
      (b) =>
        b.etat !== 'silhouette' &&
        b.uniteId !== uniteId &&
        b.profondeur.proche < cible.profondeur.proche &&
        Math.min(r.x + r.largeur, b.rect.x + b.rect.largeur) - Math.max(r.x, b.rect.x) > 0 &&
        Math.min(r.y + r.hauteur, b.rect.y + b.rect.hauteur) - Math.max(r.y, b.rect.y) > 0,
    )
    .map((b) => b.uniteId)
}

/**
 * La plus grande partie visible d'un bloc, où poser son code de commande
 * (5.1) : centré sur le bloc entier, le code d'un article en partie
 * recouvert tomberait sur celui de devant. `null` si rien ne se voit.
 * Une silhouette est dessinée sous tous les articles affichés, et sous les
 * silhouettes plus proches qu'elle.
 */
export function zoneVisible(uniteId: string, blocs: BlocVue[]): Rectangle | null {
  const cible = blocs.find((b) => b.uniteId === uniteId)
  if (!cible) return null
  const devant = blocs
    .filter(
      (b) =>
        b.uniteId !== uniteId &&
        (b.etat === 'silhouette'
          ? cible.etat === 'silhouette' && b.profondeur.proche < cible.profondeur.proche
          : cible.etat === 'silhouette' || b.profondeur.proche < cible.profondeur.proche),
    )
    .map((b) => b.rect)
  return plusGrandeZoneVisible(cible.rect, devant)
}

/** Position approximative d'un article dans la caisse, pour son nom accessible (6). */
export interface Situation {
  /** Tiers de la longueur : près du fond, au milieu, près des portes. */
  longueur: 'fond' | 'milieu' | 'portes'
  /** Tiers de la largeur : côté paroi gauche, dans l'axe, côté paroi droite. */
  largeur: 'gauche' | 'axe' | 'droite'
}

/**
 * Situe un article en découpant la caisse en tiers, d'après son centre :
 * « au milieu à gauche ». Assez précis pour se repérer à l'oreille ; les
 * cotes exactes sont dans le tableau des placements.
 */
export function situer(p: Placement, unite: Unite, camion: Camion): Situation {
  const b = boiteDe(p, unite)
  const tiers = (centre: number, total: number) => Math.min(2, Math.floor((3 * centre) / total))
  const longueurs = ['fond', 'milieu', 'portes'] as const
  const largeurs = ['gauche', 'axe', 'droite'] as const
  return {
    longueur: longueurs[tiers((b.x0 + b.x1) / 2, camion.longueur)] ?? 'milieu',
    largeur: largeurs[tiers((b.y0 + b.y1) / 2, camion.largeur)] ?? 'axe',
  }
}

/** Ce que dit la description d'une étape (5.9), avant sa mise en texte. */
export interface DescriptionEtape {
  orientation: Orientation
  /** Distance au fond de la caisse, en mm. */
  distanceFond: number
  /** Paroi latérale touchée, à `TOLERANCE_CONTACT` près. */
  paroi: 'gauche' | 'droite' | null
  /** Articles sur lesquels il repose ; vide : posé au plancher. */
  poseSur: string[]
}

/**
 * Description d'une étape : « à plat, à 2 400 mm du fond, contre la paroi
 * gauche, posé sur A06 ». Le texte est composé par l'interface.
 */
export function decrireEtape(
  p: Placement,
  plan: Placement[],
  unites: Unite[],
  camion: Camion,
): DescriptionEtape {
  const boite = boiteDe(p, trouverUnite(p.uniteId, unites))
  let paroi: DescriptionEtape['paroi'] = null
  if (boite.y0 <= TOLERANCE_CONTACT) paroi = 'gauche'
  else if (camion.largeur - boite.y1 <= TOLERANCE_CONTACT) paroi = 'droite'
  const poseSur =
    boite.z0 === 0
      ? []
      : plan
          .filter(
            (autre) =>
              autre.uniteId !== p.uniteId &&
              estPoseSur(boite, boiteDe(autre, trouverUnite(autre.uniteId, unites))),
          )
          .sort((a, b) => a.rang - b.rang)
          .map((autre) => autre.uniteId)
  return { orientation: p.orientation, distanceFond: boite.x0, paroi, poseSur }
}
