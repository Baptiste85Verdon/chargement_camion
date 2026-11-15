// Cadrage d'une vue du plan : la partie de la caisse visible, en mm, qui
// devient le `viewBox` du SVG (cahier technique, 5.11). Zoomer, c'est
// réduire le cadrage ; rien n'est redessiné et les coordonnées restent en
// millimètres. Le cadrage garde les proportions de la caisse, et ne sort
// jamais de la caisse.

export interface Point {
  x: number
  y: number
}

export interface Taille {
  largeur: number
  hauteur: number
}

/** Partie visible de la vue, en mm : coin haut gauche et taille. */
export interface Cadrage extends Point, Taille {}

/** Crans des boutons Zoom + et Zoom − : 100 % à 800 %. */
export const CRANS_ZOOM = [1, 1.5, 2, 3, 4, 6, 8] as const
export const ZOOM_MAX = 8

const borner = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)

/** Le cadrage d'un zoom donné, centré sur `centre` (le milieu de la caisse par défaut). */
export function cadrer(
  taille: Taille,
  zoom: number,
  centre: Point = { x: taille.largeur / 2, y: taille.hauteur / 2 },
): Cadrage {
  const z = borner(zoom, 1, ZOOM_MAX)
  const largeur = taille.largeur / z
  const hauteur = taille.hauteur / z
  return {
    x: borner(centre.x - largeur / 2, 0, taille.largeur - largeur),
    y: borner(centre.y - hauteur / 2, 0, taille.hauteur - hauteur),
    largeur,
    hauteur,
  }
}

export const centreDe = (c: Cadrage): Point => ({
  x: c.x + c.largeur / 2,
  y: c.y + c.hauteur / 2,
})

export const zoomDe = (c: Cadrage, taille: Taille) => taille.largeur / c.largeur

/** Fait glisser la zone visible de (dx, dy) mm. */
export function deplacerCadrage(c: Cadrage, taille: Taille, dx: number, dy: number): Cadrage {
  const centre = centreDe(c)
  return cadrer(taille, zoomDe(c, taille), { x: centre.x + dx, y: centre.y + dy })
}

/** Cran suivant (`sens` 1) ou précédent (-1), depuis le cran le plus proche. */
export function zoomSuivant(zoom: number, sens: 1 | -1): number {
  if (sens === 1) return CRANS_ZOOM.find((c) => c > zoom + 1e-9) ?? ZOOM_MAX
  return [...CRANS_ZOOM].reverse().find((c) => c < zoom - 1e-9) ?? 1
}

/**
 * Change le zoom en gardant `point` immobile à l'écran : celui que vise le
 * pointeur, pour la molette. Le point reste à la même place relative dans
 * le cadrage, donc le nouveau centre s'en rapproche (ou s'en éloigne) dans
 * le rapport des deux zooms.
 */
export function zoomAutour(
  c: Cadrage,
  taille: Taille,
  zoomAvant: number,
  zoomApres: number,
  point: Point,
): Cadrage {
  const centre = centreDe(c)
  const rapport = zoomAvant / zoomApres
  return cadrer(taille, zoomApres, {
    x: point.x + (centre.x - point.x) * rapport,
    y: point.y + (centre.y - point.y) * rapport,
  })
}
