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

export interface OptionsListe {
  /** Inclure aussi les éléments archivés (par défaut : les actifs seulement). */
  avecArchives?: boolean
}

/**
 * Un référentiel dont les éléments s'archivent (RG-21) : un élément déjà
 * utilisé ne se supprime pas (`supprimer` rejette `utilise`), il s'archive.
 * `lister` ne rend que les actifs, sauf demande contraire ; `obtenir` rend
 * aussi un élément archivé, pour les commandes et les plans qui le citent.
 */
export interface DepotArchivable<T extends { id: string; archiveLe?: string }> extends Depot<T> {
  lister(options?: OptionsListe): Promise<T[]>
  /** Archive maintenant ; sans effet sur un élément déjà archivé. */
  archiver(id: string): Promise<void>
  /**
   * Remet un élément archivé dans les listes ; sans effet sur un élément
   * actif. Pour un article, rejette `doublon` (champ `reference`) si un
   * article actif a repris sa référence entre-temps.
   */
  reactiver(id: string): Promise<void>
}

/** Catalogue, trié par nom. Référence unique parmi les articles actifs. */
export type ArticleRepository = DepotArchivable<FicheArticle>

/**
 * Modèles de camions, triés par nom. Un camion utilisé par une tournée en
 * préparation, prête ou en chargement ne s'archive pas : `archiver` rejette
 * `utilise`, sur le champ `camion`.
 */
export type ModeleCamionRepository = DepotArchivable<ModeleCamion>

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

/**
 * Lignes à enregistrer avec leur commande : la commande leur donne son `id`.
 * Une ligne déjà enregistrée garde son `id` ; une ligne ajoutée n'en a pas.
 */
export type LigneAEnregistrer = Omit<AEnregistrer<LigneDeCommande>, 'commandeId'>

/** Une commande enregistrée, et les lignes qui ont perdu leur place dans le plan. */
export interface CommandeEnregistree extends CommandeAvecLignes {
  /**
   * Lignes ajoutées ou vraiment changées (article, quantité, livraison nue,
   * dimensions, poids : voir `ligneModifiee`), dans l'ordre de la commande.
   * Elles n'ont plus de placement : elles sont à replacer.
   */
  lignesChangees: string[]
}

export interface CommandeRepository {
  /** Commandes d'une tournée, par rang de livraison. */
  listerParTournee(tourneeId: string): Promise<CommandeAvecLignes[]>
  /** Commandes sans tournée, celles de la liste d'attente. */
  listerSansTournee(): Promise<CommandeAvecLignes[]>
  /**
   * Commandes dont au moins une ligne cite l'article, avec toutes leurs
   * lignes, dans ou hors tournée. Sert à la fiche article (« Commandes en
   * cours ») et à choisir entre suppression et archivage (RG-22).
   */
  listerParArticle(articleId: string): Promise<CommandeAvecLignes[]>
  obtenir(id: string): Promise<CommandeAvecLignes | null>
  /**
   * Crée ou modifie la commande et ses lignes, en une seule opération « tout
   * ou rien » (fonction SQL `enregistrer_commande`) :
   * - une ligne avec `id` est modifiée en place ; si elle a vraiment changé,
   *   ses placements sont supprimés ; sinon, elle garde sa place dans le plan ;
   * - une ligne sans `id` est ajoutée ; une ligne enregistrée absente de la
   *   liste est supprimée ;
   * - l'ordre de la liste devient l'ordre des lignes.
   * Rejette `doublon` (champ `numero`) si le numéro existe déjà dans la
   * tournée, `introuvable` si une ligne citée n'appartient pas à la commande.
   */
  enregistrer(
    commande: AEnregistrer<Commande>,
    lignes: LigneAEnregistrer[],
  ): Promise<CommandeEnregistree>
  /**
   * Nouvel ordre de livraison (RG-07) : la première commande de la liste
   * reçoit le rang 1. La liste doit contenir toutes les commandes de la
   * tournée, et elles seules ; sinon, rejette `contrainte` sans rien changer.
   */
  reordonner(tourneeId: string, commandeIds: string[]): Promise<void>
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
  /** Marque une version « à recalculer » : le camion de la tournée a changé (RG-22). */
  marquerARecalculer(planId: string): Promise<void>
  /** Change le statut d'une étape de chargement (mode quai). */
  changerStatutPlacement(placementId: string, statut: StatutPlacement): Promise<void>
  supprimer(planId: string): Promise<void>
}

export interface ElementAttenteRepository {
  /** Éléments en attente, les plus anciens d'abord. */
  lister(): Promise<ElementAttente[]>
  /** Ajoute un élément ; la date du report est celle de l'ajout. */
  ajouter(element: Omit<ElementAttente, 'id' | 'reporteLe'>): Promise<ElementAttente>
  /**
   * Affecte l'élément à une tournée en préparation (RG-11), en une seule
   * opération (fonction SQL `affecter_element_attente`), et rend l'`id` de la
   * commande qui le reçoit, livrée en dernier :
   * - une commande entière entre dans la tournée ;
   * - des articles reportés rejoignent la commande de même numéro dans la
   *   tournée, créée au besoin avec le client et la ville d'origine ; ils
   *   quittent le plan de leur tournée d'origine.
   * L'élément quitte la liste. Rejette `contrainte` si la tournée n'est plus
   * en préparation, `introuvable` si l'élément ou la tournée n'existe plus.
   */
  affecter(elementId: string, tourneeId: string): Promise<string>
  /**
   * Retire l'élément de la liste (RG-22, après confirmation). Une commande
   * entière en attente est supprimée avec lui ; des articles reportés
   * restent dans leur commande d'origine.
   */
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
