// Dépôts : interfaces (cahier technique 7.1).
//
// L'application ne parle jamais directement à Supabase : les pages et les
// stores passent par ces interfaces. Deux implémentations les respectent :
// - `supabase.ts`, pour l'application ;
// - `memoire.ts`, pour les tests, sans réseau.
// Une future API maison ajoutera une troisième implémentation, sans que les
// pages ni le domaine changent.
//
// Toutes les méthodes sont asynchrones, comme un appel réseau. En cas
// d'échec, elles rejettent une `ErreurDonnees` (voir `erreurs.ts`).
import type {
  Commande,
  ElementAttente,
  FicheArticle,
  LigneDeCommande,
  ModeleCamion,
  PlacementEnregistre,
  PlanChargement,
  StatutPlacement,
  Tournee,
} from '@/domaine/modele'

/** Un objet à enregistrer : sans `id` pour une création, avec pour une modification. */
export type AEnregistrer<T extends { id: string }> = Omit<T, 'id'> & { id?: string }

/** Opérations communes à un référentiel. */
export interface Depot<T extends { id: string }> {
  /** Tous les éléments, dans un ordre stable. */
  lister(): Promise<T[]>
  /** L'élément, ou `null` s'il n'existe pas. */
  obtenir(id: string): Promise<T | null>
  /** Crée ou modifie, puis renvoie l'élément enregistré, avec son `id`. */
  enregistrer(objet: AEnregistrer<T>): Promise<T>
  /** Supprime ; rejette `utilise` si l'élément sert encore ailleurs. */
  supprimer(id: string): Promise<void>
}

/** Catalogue, trié par nom. Un article utilisé par une commande ne se supprime pas. */
export type ArticleRepository = Depot<FicheArticle>

/** Modèles de camions, triés par nom. Un camion utilisé par une tournée ne se supprime pas. */
export type ModeleCamionRepository = Depot<ModeleCamion>

/**
 * Tournées, les plus récentes d'abord. Supprimer une tournée supprime ses
 * commandes et ses plans (après la confirmation de RG-22).
 */
export type TourneeRepository = Depot<Tournee>

/** Une commande avec ses lignes. */
export interface CommandeAvecLignes {
  commande: Commande
  lignes: LigneDeCommande[]
}

/** Lignes à enregistrer avec leur commande : la commande leur donne son `id`. */
export type LigneAEnregistrer = Omit<AEnregistrer<LigneDeCommande>, 'commandeId'>

export interface CommandeRepository {
  /** Commandes d'une tournée, par rang de livraison. */
  listerParTournee(tourneeId: string): Promise<CommandeAvecLignes[]>
  /** Commandes sans tournée, celles de la liste d'attente. */
  listerSansTournee(): Promise<CommandeAvecLignes[]>
  obtenir(id: string): Promise<CommandeAvecLignes | null>
  /**
   * Crée ou modifie la commande, puis remplace toutes ses lignes par celles
   * données. Rejette `doublon` (champ `numero`) si le numéro existe déjà
   * dans la tournée.
   */
  enregistrer(
    commande: AEnregistrer<Commande>,
    lignes: LigneAEnregistrer[],
  ): Promise<CommandeAvecLignes>
  /** Supprime la commande et ses lignes. */
  supprimer(id: string): Promise<void>
}

/** Un plan avec ses placements. */
export interface PlanAvecPlacements {
  plan: PlanChargement
  placements: PlacementEnregistre[]
}

/** Placement à enregistrer avec un nouveau plan. */
export type PlacementAEnregistrer = Omit<PlacementEnregistre, 'id' | 'planId'>

export interface PlanRepository {
  /** Versions calculées pour une tournée, de la plus ancienne à la plus récente. */
  listerVersions(tourneeId: string): Promise<PlanChargement[]>
  /** La dernière version et ses placements, ou `null` si aucun calcul. */
  obtenirDernier(tourneeId: string): Promise<PlanAvecPlacements | null>
  /** Enregistre une nouvelle version : numéro suivant, date du calcul. */
  enregistrerVersion(
    tourneeId: string,
    placements: PlacementAEnregistrer[],
  ): Promise<PlanAvecPlacements>
  /** Change le statut d'une étape de chargement (mode quai). */
  changerStatutPlacement(placementId: string, statut: StatutPlacement): Promise<void>
  supprimer(planId: string): Promise<void>
}

export interface ElementAttenteRepository {
  /** Éléments en attente, les plus anciens d'abord. */
  lister(): Promise<ElementAttente[]>
  ajouter(element: AEnregistrer<ElementAttente>): Promise<ElementAttente>
  supprimer(id: string): Promise<void>
}

/** L'ensemble des dépôts, fourni à l'application par une seule fabrique. */
export interface Depots {
  articles: ArticleRepository
  camions: ModeleCamionRepository
  tournees: TourneeRepository
  commandes: CommandeRepository
  plans: PlanRepository
  attente: ElementAttenteRepository
}
