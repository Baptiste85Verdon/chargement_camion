import type { Dimensions, Orientation } from './types'

/**
 * Place occupée dans la caisse par une unité selon son orientation (RG-04).
 *
 * Les dimensions du catalogue décrivent la pose « à plat ». Mettre l'unité
 * debout revient à la faire pivoter d'un quart de tour autour de sa longueur :
 * la longueur reste selon x, la largeur et la hauteur s'échangent.
 * « Contre une paroi » est la même pose que « debout » ; seul le contact
 * avec une paroi change, et c'est le validateur qui le vérifie.
 */
export function encombrement(dims: Dimensions, orientation: Orientation): Dimensions {
  if (orientation === 'aPlat') {
    return { l: dims.l, w: dims.w, h: dims.h }
  }
  return { l: dims.l, w: dims.h, h: dims.w }
}
