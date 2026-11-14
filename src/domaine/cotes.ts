// Lignes de cote (cahier technique, 5.13).
//
// Les segments sont donnés en coordonnées de vue (mm), sur le bord de ce
// qu'ils mesurent : sur le bord bas pour une cote horizontale, sur le bord
// gauche pour une cote verticale. Le calque de libellés les décale ensuite
// de quelques pixels vers l'extérieur et y ajoute flèches et valeur, à
// taille fixe : ce décalage dépend de l'écran, pas du domaine.
import { boiteDe } from './geometrie'
import { type Rectangle, type Vue, dimensionsVue, projeter } from './projection'
import type { Camion, Placement, Unite } from './types'

export interface Point {
  x: number
  y: number
}

export type Mesure = 'longueur' | 'largeur' | 'hauteur' | 'distanceFond'

export interface Cote {
  mesure: Mesure
  /** Valeur affichée, en millimètres. */
  valeur: number
  /**
   * Segment à tracer, ou `null` quand la mesure est dans l'axe du regard :
   * la distance au fond en vue avant ou arrière s'affiche alors en texte.
   */
  segment: { debut: Point; fin: Point } | null
}

/** Ce que mesurent l'horizontale et la verticale de chaque vue. */
const AXES: Record<Vue, { horizontal: Mesure; vertical: Mesure }> = {
  dessus: { horizontal: 'longueur', vertical: 'largeur' },
  gauche: { horizontal: 'longueur', vertical: 'hauteur' },
  droite: { horizontal: 'longueur', vertical: 'hauteur' },
  avant: { horizontal: 'largeur', vertical: 'hauteur' },
  arriere: { horizontal: 'largeur', vertical: 'hauteur' },
}

/** Les deux cotes d'un rectangle : sa largeur sous lui, sa hauteur à sa gauche. */
function coterRectangle(r: Rectangle, vue: Vue): Cote[] {
  const bas = r.y + r.hauteur
  return [
    {
      mesure: AXES[vue].horizontal,
      valeur: r.largeur,
      segment: { debut: { x: r.x, y: bas }, fin: { x: r.x + r.largeur, y: bas } },
    },
    {
      mesure: AXES[vue].vertical,
      valeur: r.hauteur,
      segment: { debut: { x: r.x, y: r.y }, fin: { x: r.x, y: bas } },
    },
  ]
}

/** Cotes de la caisse : longueur (ou largeur) sous la vue, l'autre sur le côté. */
export function coterCaisse(camion: Camion, vue: Vue): Cote[] {
  const { largeur, hauteur } = dimensionsVue(camion, vue)
  return coterRectangle({ x: 0, y: 0, largeur, hauteur }, vue)
}

/**
 * Cotes de l'article sélectionné : ses dimensions telles qu'il est posé, puis
 * sa distance au fond. Celle-ci va du bord « fond » de la vue (à gauche, ou à
 * droite dans la vue en miroir) jusqu'à la face de l'article côté fond, à
 * mi-hauteur du bloc.
 */
export function coter(p: Placement, unite: Unite, camion: Camion, vue: Vue): Cote[] {
  const { rect } = projeter(p, unite, camion, vue)
  const distance = boiteDe(p, unite).x0
  const milieu = rect.y + rect.hauteur / 2

  let segment: Cote['segment'] = null
  if (vue === 'dessus' || vue === 'gauche') {
    segment = { debut: { x: 0, y: milieu }, fin: { x: distance, y: milieu } }
  } else if (vue === 'droite') {
    const fond = camion.longueur
    segment = { debut: { x: fond, y: milieu }, fin: { x: fond - distance, y: milieu } }
  }

  return [...coterRectangle(rect, vue), { mesure: 'distanceFond', valeur: distance, segment }]
}
