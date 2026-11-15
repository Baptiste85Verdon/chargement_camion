// Tri des tableaux (catalogue, modèles de camions) : fonctions pures,
// utilisées par `TableauTriable.vue` et testées sans interface.

/** Ce qu'une colonne donne pour trier : un texte, un nombre, ou une liste. */
export type ValeurTri = string | number | boolean | readonly (string | number)[]

export type SensTri = 'croissant' | 'decroissant'

export interface EtatTri {
  /** Clé de la colonne triée. */
  cle: string
  sens: SensTri
}

/**
 * Compare les textes « à la française » : sans tenir compte de la casse ni
 * des accents (`sensitivity: 'base'`), et les nombres qu'ils contiennent
 * comme des nombres (`numeric`) : « Porteur 8,5 m » avant « Porteur 12 m ».
 */
const textes = new Intl.Collator('fr', { sensitivity: 'base', numeric: true })

/** Négatif si `a` vient avant `b`, positif après, 0 si égaux. */
export function comparerValeurs(a: ValeurTri, b: ValeurTri): number {
  if (Array.isArray(a) && Array.isArray(b)) {
    // Élément par élément : la longueur d'abord, puis la largeur…
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      const ecart = comparerValeurs(a[i] as ValeurTri, b[i] as ValeurTri)
      if (ecart !== 0) return ecart
    }
    return a.length - b.length
  }
  if (typeof a === 'string' && typeof b === 'string') return textes.compare(a, b)
  return Number(a) - Number(b)
}

/**
 * Une copie triée de `lignes`. Le tri de JavaScript est stable : deux lignes
 * égales gardent leur ordre d'origine, dans un sens comme dans l'autre.
 */
export function trierLignes<T>(
  lignes: readonly T[],
  valeur: (ligne: T) => ValeurTri,
  sens: SensTri,
): T[] {
  const signe = sens === 'croissant' ? 1 : -1
  return [...lignes].sort((a, b) => signe * comparerValeurs(valeur(a), valeur(b)))
}

/** Clic sur l'en-tête `cle` : croissant d'abord, puis le sens inverse à chaque clic. */
export function sensSuivant(actuel: EtatTri | null, cle: string): EtatTri {
  if (actuel?.cle !== cle) return { cle, sens: 'croissant' }
  return { cle, sens: actuel.sens === 'croissant' ? 'decroissant' : 'croissant' }
}
