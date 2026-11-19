// Types du domaine (cahier technique, sections 3 et 4.7).
// Dimensions en millimètres entiers, poids en kilogrammes.
// Repère : x du fond vers les portes, y depuis la paroi gauche, z depuis le plancher.

/**
 * Pose d'une unité dans la caisse (RG-04).
 * - `aPlat` : l'unité repose sur sa face « longueur × largeur » ;
 * - `debout` : l'unité est posée sur la tranche, sa grande face tournée vers les côtés ;
 * - `contreParoi` : debout, et en contact avec une paroi latérale.
 */
export type Orientation = 'aPlat' | 'debout' | 'contreParoi'

/** Trois dimensions : longueur (l, selon x), largeur (w, selon y), hauteur (h, selon z). */
export interface Dimensions {
  l: number
  w: number
  h: number
}

/**
 * Une unité physique à charger : une ligne de commande éclatée selon sa quantité.
 * `dims` est la boîte englobante (RG-18) dans la pose « à plat » du catalogue.
 */
export interface Unite {
  id: string
  /** Rang de livraison de la commande : 1 = livrée en premier. */
  commandeRang: number
  dims: Dimensions
  poids: number
  fragile: boolean
  /** Le dessus peut-il porter un autre article ? (RG-18) */
  porteur: boolean
  /** Orientations autorisées pour cette unité (RG-04). */
  orientations: Orientation[]
}

/**
 * La position d'une unité dans la caisse. (x, y, z) est le coin de l'unité
 * le plus proche de l'origine. `rang` est le rang de chargement.
 */
export interface Placement {
  uniteId: string
  x: number
  y: number
  z: number
  orientation: Orientation
  rang: number
}

/**
 * Ce que le domaine retient d'un article du catalogue pour le placer
 * (cahier technique, section 3). Dimensions de la boîte englobante (RG-18).
 */
export interface Article {
  id: string
  dimsEmballees: Dimensions
  /** Taille nue, pour un article qui peut être livré nu (RG-02). */
  dimsNues?: Dimensions
  poids: number
  fragile: boolean
  porteur: boolean
  orientations: Orientation[]
}

/** Une ligne de commande : un article, une quantité, et ses valeurs propres (RG-03). */
export interface LigneCommande {
  id: string
  articleId: string
  quantite: number
  /** Livré nu plutôt qu'emballé (RG-02). */
  nu: boolean
  /** Dimensions propres à cette commande : elles ne modifient jamais le catalogue. */
  dimsPropres?: Dimensions
  /** Poids propre à cette commande, saisi ou estimé au prorata (RG-03). */
  poidsPropre?: number
}

/** Une commande de la tournée, avec son rang de livraison (RG-07). */
export interface CommandeAPlacer {
  id: string
  /** 1 = livrée en premier. */
  rangLivraison: number
  lignes: LigneCommande[]
}

/**
 * Une unité préparée à partir d'une ligne de commande : c'est une `Unite`,
 * plus de quoi retrouver sa ligne et sa commande (tableau des placements,
 * articles en trop, RG-10).
 */
export interface UnitePreparee extends Unite {
  commandeId: string
  ligneCommandeId: string
  /** Numéro de l'unité dans sa ligne : 1 à la quantité. */
  numero: number
}

/** Dimensions utiles de la caisse. */
export interface Camion {
  longueur: number
  largeur: number
  hauteur: number
}

/** Numéro de la règle de gestion enfreinte. */
export type NumeroRegle = 'RG-04' | 'RG-06' | 'RG-07' | 'RG-08' | 'RG-09' | 'RG-18' | 'RG-19'

/**
 * Motif précis, sous forme de code : l'interface le traduit en message
 * grâce au fichier de textes.
 */
export type MotifRegle =
  | 'horsCaisse'
  | 'chevauchement'
  | 'orientationInterdite'
  | 'paroiAbsente'
  | 'appuiInsuffisant'
  | 'surFragile'
  | 'surNonPorteur'
  | 'surPlusLeger'
  | 'fragileCharge'
  | 'nonPorteurCharge'
  | 'sousPlusLourd'
  | 'accesBloque'
  | 'bloqueAcces'
  | 'deboutNonCale'
  | 'deboutHorsPlancher'
  | 'surDebout'
  | 'deboutCharge'
  | 'lourdEnHauteur'
  // Ajustement manuel (RG-08) : ni le validateur ni le placeur ne les rendent.
  | 'orientationUnique'
  | 'ordreImpossible'

/** Une règle enfreinte par un placement : ce que renvoie le validateur. */
export interface RegleEnfreinte {
  regle: NumeroRegle
  motif: MotifRegle
  /** L'unité dont le placement est refusé. */
  uniteId: string
  /** L'autre unité en cause, pour un chevauchement par exemple. */
  autreUniteId?: string
}
