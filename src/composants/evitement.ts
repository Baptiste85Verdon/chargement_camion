// Cotes du plan qui évitent les libellés des autres articles (cahier
// technique, 5.13).
//
// La cote « distance au fond » de l'article sélectionné part du fond et
// traverse les articles posés entre le fond et lui. Tracée à mi-hauteur de
// l'article, elle passait sur leurs codes (C4 A02), centrés dans leur bloc.
// On cherche donc, dans la hauteur de l'article sélectionné, l'ordonnée la
// plus proche du milieu où la cote ne croise aucun libellé. S'il n'y en a
// aucune, la cote reste au milieu et les libellés traversés sont masqués
// tant que l'article est sélectionné.
//
// Tout est en millimètres de vue. La taille des libellés et l'épaisseur de
// la cote, fixes à l'écran, sont converties en mm par l'appelant.

export interface Boite {
  x: number
  y: number
  largeur: number
  hauteur: number
}

/** Une cote horizontale à placer : de x0 à x1, entre `haut` et `bas`. */
export interface BandeCote {
  x0: number
  x1: number
  haut: number
  bas: number
}

const chevaucheEnX = (b: Boite, x0: number, x1: number) =>
  b.x < Math.max(x0, x1) && b.x + b.largeur > Math.min(x0, x1)

/**
 * Ordonnée de la cote la plus proche du milieu de la bande, à au moins
 * `demiEpaisseur` de tout libellé qu'elle croise en longueur et des bords de
 * la bande ; `null` si aucune ne convient.
 */
export function ordonneeLibre(
  bande: BandeCote,
  libelles: Boite[],
  demiEpaisseur: number,
): number | null {
  const min = bande.haut + demiEpaisseur
  const max = bande.bas - demiEpaisseur
  const milieu = (bande.haut + bande.bas) / 2
  // Intervalles interdits : chaque libellé, élargi de la demi-épaisseur.
  const interdits = libelles
    .filter((b) => chevaucheEnX(b, bande.x0, bande.x1))
    .map((b) => [b.y - demiEpaisseur, b.y + b.hauteur + demiEpaisseur] as const)
  const libre = (y: number) =>
    y >= min && y <= max && interdits.every(([debut, fin]) => y <= debut || y >= fin)

  // Candidats : le milieu, puis les bords des intervalles interdits.
  const candidats = [milieu, ...interdits.flat()].filter(libre)
  if (candidats.length === 0) return null
  return candidats.reduce((meilleur, y) =>
    Math.abs(y - milieu) < Math.abs(meilleur - milieu) ? y : meilleur,
  )
}

/** Identifiants des libellés qu'une cote tracée à l'ordonnée `y` traverse. */
export function libellesTraverses(
  cote: { x0: number; x1: number; y: number },
  libelles: { id: string; boite: Boite }[],
  demiEpaisseur: number,
): string[] {
  return libelles
    .filter(
      ({ boite }) =>
        chevaucheEnX(boite, cote.x0, cote.x1) &&
        cote.y > boite.y - demiEpaisseur &&
        cote.y < boite.y + boite.hauteur + demiEpaisseur,
    )
    .map(({ id }) => id)
}
