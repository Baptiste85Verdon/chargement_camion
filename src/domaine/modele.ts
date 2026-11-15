// Modèle de données (cahier technique, section 3) : les objets métier tels
// qu'ils sont enregistrés. Les dépôts (`src/donnees/`) lisent et écrivent ces
// types ; le placeur, lui, ne voit que les types de `types.ts`.
// Dimensions en millimètres entiers, poids en kilogrammes.
import type { Camion, Dimensions, Orientation } from './types'

/** Familles du catalogue (RG-01, capture 07). */
export const FAMILLES = [
  'Fenêtres',
  'Fenêtres de toit',
  'Plaques de plâtre',
  'Planches et panneaux',
  'Poutres et charpente',
  'Maçonnerie',
  'Couverture',
  'Isolation',
  'Quincaillerie',
] as const

export type Famille = (typeof FAMILLES)[number]

/** Forme réelle d'un article, indiquée à titre d'information (RG-18). */
export type Forme = 'rectangulaire' | 'cylindrique' | 'irreguliere'

/** Un article du catalogue, tel que l'affiche sa fiche. */
export interface FicheArticle {
  id: string
  /** Référence commerciale facultative, unique quand elle existe (FEN-PVC-2V). */
  reference?: string
  nom: string
  famille: Famille
  /** Boîte englobante en pose « à plat » (RG-18, cahier technique 4.7). */
  dimsEmballees: Dimensions
  /** Taille nue, pour un article qui peut être livré nu (RG-02). */
  dimsNues?: Dimensions
  /** Poids maximal connu (RG-05). */
  poids: number
  fragile: boolean
  orientations: Orientation[]
  forme: Forme
  /** Le dessus peut-il porter un autre article ? (RG-18) */
  porteur: boolean
  /**
   * Date d'archivage, au format ISO. Un article déjà utilisé ne se supprime
   * pas, il s'archive : il quitte le catalogue et la saisie express, mais
   * reste dans les commandes et les plans qui l'utilisent (RG-21).
   */
  archiveLe?: string
}

/** Un modèle de camion : nom et dimensions utiles de la caisse. */
export interface ModeleCamion extends Camion {
  id: string
  nom: string
  /** Date d'archivage, au format ISO : voir `FicheArticle.archiveLe`. */
  archiveLe?: string
}

/** Vrai pour un article ou un camion qui n'est pas archivé. */
export const estActif = (element: { archiveLe?: string }) => element.archiveLe === undefined

/** Statuts d'une tournée (section 3). */
export type StatutTournee = 'enPreparation' | 'prete' | 'enChargement' | 'chargee'

export interface Tournee {
  id: string
  /** Référence affichée, unique : T-2026-118. */
  reference: string
  /** Date de livraison au format AAAA-MM-JJ ; vide tant qu'elle est à fixer. */
  date: string | null
  /** Vide tant que le camion n'est pas choisi. */
  modeleCamionId: string | null
  statut: StatutTournee
}

/** Une commande, dans une tournée ou en attente. */
export interface Commande {
  id: string
  /** Vide quand la commande attend dans la liste d'attente. */
  tourneeId: string | null
  /** Numéro de la commande, unique dans sa tournée (CMD-2026-0432). */
  numero: string
  /** Client ou destination. */
  destination: string
  ville?: string
  /** 1 = livrée en premier (RG-07) ; vide hors tournée. */
  rangLivraison: number | null
}

/** Une ligne de commande enregistrée (RG-02, RG-03). */
export interface LigneDeCommande {
  id: string
  commandeId: string
  articleId: string
  quantite: number
  /** Livrée nue plutôt qu'emballée (RG-02). */
  nu: boolean
  /** Dimensions propres à cette commande ; elles ne modifient jamais le catalogue. */
  dimsPropres?: Dimensions
  /** Poids propre à cette commande. */
  poidsPropre?: number
  /** Le poids propre a été proposé au prorata du volume (RG-03). */
  poidsEstime: boolean
}

/** Une version de plan calculée pour une tournée. */
export interface PlanChargement {
  id: string
  tourneeId: string
  version: number
  /** Date et heure du calcul, au format ISO. */
  calculeLe: string
}

/** Statut d'une étape de chargement (section 3). */
export type StatutPlacement = 'aFaire' | 'charge' | 'enProbleme'

/** Un placement enregistré : une unité physique et sa position. */
export interface PlacementEnregistre {
  id: string
  planId: string
  ligneCommandeId: string
  /** Numéro de l'unité dans sa ligne : 1 à la quantité. */
  numeroUnite: number
  x: number
  y: number
  z: number
  orientation: Orientation
  /** Rang de chargement. */
  rang: number
  statut: StatutPlacement
}

/** Problèmes qu'un opérateur peut signaler (RG-12). */
export type TypeSignalement = 'manquant' | 'plusGrand' | 'abime' | 'emplacement'

/** Actions possibles après un signalement (RG-13). */
export type ActionSignalement =
  'annulerChargement' | 'retirerArticle' | 'retirerCommande' | 'conserver'

/** Motif d'un report dans la liste d'attente (RG-11, RG-13). */
export type MotifAttente = 'depassement' | 'signalement'

/** Un élément de la liste d'attente : une commande entière ou une seule ligne. */
export interface ElementAttente {
  id: string
  commandeId: string
  /** Vide quand toute la commande est reportée. */
  ligneCommandeId: string | null
  /** Tournée d'où vient l'élément. */
  tourneeOrigineId: string | null
  /**
   * Rang de livraison de la commande dans sa tournée d'origine : il donne le
   * code affiché dans la liste d'attente (capture 10). Une commande entière
   * en attente n'a plus de rang à elle, d'où cette copie.
   */
  rangOrigine: number | null
  motif: MotifAttente
  /** Date et heure du report, au format ISO, fixées à l'ajout. */
  reporteLe: string
}
