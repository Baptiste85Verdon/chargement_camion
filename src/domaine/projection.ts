// Projections du plan dans les cinq vues 2D (cahier technique, 5.8 et 5.10).
//
// Chaque vue regarde la caisse depuis un côté. On « écrase » chaque boîte
// selon l'axe du regard : il reste un rectangle (ce qu'on dessine) et un
// intervalle de profondeur (à quelle distance de l'observateur elle se trouve).
//
// Coordonnées de vue : celles du SVG, en millimètres, origine en haut à
// gauche, x vers la droite, y vers le bas. Le plancher est donc en bas
// (y = hauteur de la vue) et z s'inverse : y = hauteur - z.
import { type Boite, boiteDe, trouverUnite } from './geometrie'
import type { Camion, Placement, Unite } from './types'

export type Vue = 'dessus' | 'gauche' | 'droite' | 'avant' | 'arriere'

/** Les cinq vues, dans l'ordre du sélecteur. */
export const VUES: readonly Vue[] = ['dessus', 'gauche', 'droite', 'avant', 'arriere']

/** Rectangle en coordonnées de vue (mm) : coin haut gauche, largeur, hauteur. */
export interface Rectangle {
  x: number
  y: number
  largeur: number
  hauteur: number
}

/** Ce que `projeter` renvoie pour une unité dans une vue. */
export interface Projection {
  uniteId: string
  rect: Rectangle
  /**
   * Distances à l'observateur, en mm, mesurées depuis le bord de la caisse
   * de son côté : face la plus proche, face la plus éloignée.
   */
  profondeur: { proche: number; loin: number }
}

/** Une projection dans un plan entier, avec le résultat de la détection. */
export interface ProjectionPlan extends Projection {
  /** Entièrement masquée par les articles placés devant (5.10). */
  cache: boolean
}

/** Taille du `viewBox` de la vue : la caisse vue depuis ce côté. */
export function dimensionsVue(camion: Camion, vue: Vue): { largeur: number; hauteur: number } {
  switch (vue) {
    case 'dessus':
      return { largeur: camion.longueur, hauteur: camion.largeur }
    case 'gauche':
    case 'droite':
      return { largeur: camion.longueur, hauteur: camion.hauteur }
    case 'avant':
    case 'arriere':
      return { largeur: camion.largeur, hauteur: camion.hauteur }
  }
}

/**
 * Projette une boîte de la caisse dans une vue. Le tableau de 5.8 se lit ici :
 * - dessus : x à l'horizontale (fond à gauche), y à la verticale avec la
 *   paroi droite en haut ; l'observateur est au-dessus du plafond ;
 * - gauche : x à l'horizontale (fond à gauche), z à la verticale ;
 *   l'observateur est contre la paroi gauche (y = 0) ;
 * - droite : la même chose en miroir (fond à droite), observateur en y = largeur ;
 * - avant : depuis le fond (x = 0), on voit la paroi gauche à droite ;
 * - arriere : depuis les portes (x = longueur), la paroi gauche est à gauche.
 */
export function projeterBoite(b: Boite, camion: Camion, vue: Vue): Omit<Projection, 'uniteId'> {
  const { longueur: L, largeur: W, hauteur: H } = camion
  // Dans les quatre vues latérales, le plancher est en bas.
  const vertical = { y: H - b.z1, hauteur: b.z1 - b.z0 }
  switch (vue) {
    case 'dessus':
      return {
        rect: { x: b.x0, y: W - b.y1, largeur: b.x1 - b.x0, hauteur: b.y1 - b.y0 },
        profondeur: { proche: H - b.z1, loin: H - b.z0 },
      }
    case 'gauche':
      return {
        rect: { x: b.x0, largeur: b.x1 - b.x0, ...vertical },
        profondeur: { proche: b.y0, loin: b.y1 },
      }
    case 'droite':
      return {
        rect: { x: L - b.x1, largeur: b.x1 - b.x0, ...vertical },
        profondeur: { proche: W - b.y1, loin: W - b.y0 },
      }
    case 'avant':
      return {
        rect: { x: W - b.y1, largeur: b.y1 - b.y0, ...vertical },
        profondeur: { proche: b.x0, loin: b.x1 },
      }
    case 'arriere':
      return {
        rect: { x: b.y0, largeur: b.y1 - b.y0, ...vertical },
        profondeur: { proche: L - b.x1, loin: L - b.x0 },
      }
  }
}

/** Rectangle à dessiner et profondeur d'un placement dans une vue (5.8). */
export function projeter(p: Placement, unite: Unite, camion: Camion, vue: Vue): Projection {
  return { uniteId: p.uniteId, ...projeterBoite(boiteDe(p, unite), camion, vue) }
}

/**
 * Découpe [debut, fin] aux bords qui tombent strictement à l'intérieur :
 * decouper(0, 100, [50, 120]) donne [[0, 50], [50, 100]].
 */
function decouper(debut: number, fin: number, bords: number[]): [number, number][] {
  const coupures = [...new Set(bords.filter((v) => v > debut && v < fin))].sort((a, b) => a - b)
  const intervalles: [number, number][] = []
  let precedent = debut
  for (const bord of [...coupures, fin]) {
    intervalles.push([precedent, bord])
    precedent = bord
  }
  return intervalles
}

/**
 * `cible` est-il entièrement couvert par la réunion des rectangles `devant` ?
 *
 * Méthode : on découpe la cible en une grille dont les lignes passent par
 * tous les bords des rectangles de devant. Dans chaque case de cette grille,
 * aucun bord ne passe : un rectangle couvre donc la case entière ou pas du
 * tout. Il suffit de tester le centre de chaque case. Le calcul est exact,
 * sans pas d'échantillonnage.
 */
export function estRecouvert(cible: Rectangle, devant: Rectangle[]): boolean {
  const colonnes = decouper(
    cible.x,
    cible.x + cible.largeur,
    devant.flatMap((r) => [r.x, r.x + r.largeur]),
  )
  const lignes = decouper(
    cible.y,
    cible.y + cible.hauteur,
    devant.flatMap((r) => [r.y, r.y + r.hauteur]),
  )
  for (const [xa, xb] of colonnes) {
    for (const [ya, yb] of lignes) {
      const cx = (xa + xb) / 2
      const cy = (ya + yb) / 2
      const couverte = devant.some(
        (r) => cx > r.x && cx < r.x + r.largeur && cy > r.y && cy < r.y + r.hauteur,
      )
      if (!couverte) return false
    }
  }
  return true
}

/**
 * Projette tout un plan dans une vue, dans l'ordre de dessin : du plus
 * éloigné au plus proche, si bien que ceux de devant recouvrent ceux de
 * derrière. Chaque projection dit si l'article est entièrement caché.
 *
 * Pourquoi trier sur la face la plus proche suffit : deux boîtes du plan ne
 * se chevauchent pas (RG-06). Si leurs rectangles se recouvrent dans la vue,
 * leurs intervalles de profondeur sont donc disjoints : celle dont la face
 * proche est la plus proche est entièrement devant l'autre.
 *
 * Seuls les placements reçus comptent : l'appelant retire d'abord les
 * articles masqués par le filtre de profondeur ou montrés en silhouette,
 * qui ne cachent rien (5.9, 5.10).
 */
export function projeterPlan(
  plan: Placement[],
  unites: Unite[],
  camion: Camion,
  vue: Vue,
): ProjectionPlan[] {
  const projections = plan
    .map((p) => projeter(p, trouverUnite(p.uniteId, unites), camion, vue))
    .sort((a, b) => b.profondeur.proche - a.profondeur.proche)
  return projections.map((p) => {
    const devant = projections
      .filter((autre) => autre.profondeur.proche < p.profondeur.proche)
      .map((autre) => autre.rect)
    return { ...p, cache: estRecouvert(p.rect, devant) }
  })
}

/** Les vues où l'unité est visible, pour proposer « Voir dans la vue … » (5.10). */
export function vuesOuVisible(
  uniteId: string,
  plan: Placement[],
  unites: Unite[],
  camion: Camion,
): Vue[] {
  return VUES.filter((vue) =>
    projeterPlan(plan, unites, camion, vue).some((p) => p.uniteId === uniteId && !p.cache),
  )
}
