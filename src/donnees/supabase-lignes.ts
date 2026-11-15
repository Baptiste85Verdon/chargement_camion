// Conversions entre les lignes des tables Supabase et les objets métier.
//
// La base suit les usages SQL : noms en snake_case (`longueur_emballee`),
// valeurs de liste aussi (`a_plat`, `en_preparation`), dimensions éclatées en
// colonnes. Le domaine suit ceux de TypeScript : camelCase, objets
// `Dimensions`. Ces fonctions pures font le passage dans les deux sens ; elles
// sont testées sans réseau (`supabase-lignes.test.ts`).
import type {
  Commande,
  ElementAttente,
  FicheArticle,
  LigneDeCommande,
  ModeleCamion,
  MotifAttente,
  PlacementEnregistre,
  PlanChargement,
  StatutPlacement,
  StatutTournee,
  Tournee,
} from '@/domaine/modele'
import type { Dimensions, Orientation } from '@/domaine/types'
import type { AEnregistrer, LigneAEnregistrer, PlacementAEnregistrer } from './depots'

// --- Listes de valeurs : domaine ↔ base ------------------------------------------

/** Crée les deux tables de correspondance d'une liste de valeurs. */
function correspondance<D extends string, B extends string>(paires: Record<D, B>) {
  const versBase = paires
  const versDomaine = Object.fromEntries(Object.entries(paires).map(([d, b]) => [b, d])) as Record<
    B,
    D
  >
  return {
    versBase: (valeur: D): B => versBase[valeur],
    versDomaine: (valeur: string): D => {
      const d = versDomaine[valeur as B]
      if (d === undefined) throw new Error(`Valeur inconnue venant de la base : ${valeur}`)
      return d
    },
  }
}

export const orientation = correspondance<Orientation, string>({
  aPlat: 'a_plat',
  debout: 'debout',
  contreParoi: 'contre_paroi',
})

export const statutTournee = correspondance<StatutTournee, string>({
  enPreparation: 'en_preparation',
  prete: 'prete',
  enChargement: 'en_chargement',
  chargee: 'chargee',
})

export const statutPlacement = correspondance<StatutPlacement, string>({
  aFaire: 'a_faire',
  charge: 'charge',
  enProbleme: 'en_probleme',
})

export const motifAttente = correspondance<MotifAttente, string>({
  depassement: 'depassement',
  signalement: 'signalement',
})

// --- Petites aides --------------------------------------------------------------

/** Trois colonnes facultatives : un objet `Dimensions` ou rien. */
function dimensionsFacultatives(
  l: number | null,
  w: number | null,
  h: number | null,
): Dimensions | undefined {
  return l == null || w == null || h == null ? undefined : { l, w, h }
}

/** Une colonne facultative : `undefined` côté domaine, `null` côté base. */
const facultatif = <T>(valeur: T | null): T | undefined => valeur ?? undefined

/** `id` seulement pour une modification : à la création, la base le choisit. */
const avecId = (id: string | undefined) => (id === undefined ? {} : { id })

// --- article ----------------------------------------------------------------------

export interface LigneArticle {
  id: string
  reference: string | null
  nom: string
  famille: string
  longueur_emballee: number
  largeur_emballee: number
  hauteur_emballee: number
  longueur_nue: number | null
  largeur_nue: number | null
  hauteur_nue: number | null
  /** `numeric` : PostgREST le renvoie en nombre ou en texte selon la version. */
  poids: number | string
  fragile: boolean
  orientations: string[]
  forme: string
  dessus_porteur: boolean
  archive_le: string | null
}

export function articleDepuisLigne(ligne: LigneArticle): FicheArticle {
  return {
    id: ligne.id,
    reference: facultatif(ligne.reference),
    nom: ligne.nom,
    famille: ligne.famille as FicheArticle['famille'],
    dimsEmballees: {
      l: ligne.longueur_emballee,
      w: ligne.largeur_emballee,
      h: ligne.hauteur_emballee,
    },
    dimsNues: dimensionsFacultatives(ligne.longueur_nue, ligne.largeur_nue, ligne.hauteur_nue),
    poids: Number(ligne.poids),
    fragile: ligne.fragile,
    orientations: ligne.orientations.map(orientation.versDomaine),
    forme: ligne.forme as FicheArticle['forme'],
    porteur: ligne.dessus_porteur,
    archiveLe: facultatif(ligne.archive_le),
  }
}

export function articleVersLigne(article: AEnregistrer<FicheArticle>) {
  return {
    ...avecId(article.id),
    // Une référence vide n'est pas une référence : null, pour ne pas heurter UNIQUE.
    reference: article.reference || null,
    nom: article.nom,
    famille: article.famille,
    longueur_emballee: article.dimsEmballees.l,
    largeur_emballee: article.dimsEmballees.w,
    hauteur_emballee: article.dimsEmballees.h,
    longueur_nue: article.dimsNues?.l ?? null,
    largeur_nue: article.dimsNues?.w ?? null,
    hauteur_nue: article.dimsNues?.h ?? null,
    poids: article.poids,
    fragile: article.fragile,
    orientations: article.orientations.map(orientation.versBase),
    forme: article.forme,
    dessus_porteur: article.porteur,
    archive_le: article.archiveLe ?? null,
  }
}

// --- modele_camion ------------------------------------------------------------------

export interface LigneCamion {
  id: string
  nom: string
  longueur: number
  largeur: number
  hauteur: number
  archive_le: string | null
}

export function camionDepuisLigne(ligne: LigneCamion): ModeleCamion {
  return {
    id: ligne.id,
    nom: ligne.nom,
    longueur: ligne.longueur,
    largeur: ligne.largeur,
    hauteur: ligne.hauteur,
    archiveLe: facultatif(ligne.archive_le),
  }
}

export function camionVersLigne(camion: AEnregistrer<ModeleCamion>) {
  return {
    ...avecId(camion.id),
    nom: camion.nom,
    longueur: camion.longueur,
    largeur: camion.largeur,
    hauteur: camion.hauteur,
    archive_le: camion.archiveLe ?? null,
  }
}

// --- tournee ------------------------------------------------------------------------

export interface LigneTournee {
  id: string
  reference: string
  /** Colonne `date` : texte AAAA-MM-JJ. */
  date_livraison: string | null
  modele_camion_id: string | null
  statut: string
}

export function tourneeDepuisLigne(ligne: LigneTournee): Tournee {
  return {
    id: ligne.id,
    reference: ligne.reference,
    date: ligne.date_livraison,
    modeleCamionId: ligne.modele_camion_id,
    statut: statutTournee.versDomaine(ligne.statut),
  }
}

export function tourneeVersLigne(tournee: AEnregistrer<Tournee>) {
  return {
    ...avecId(tournee.id),
    reference: tournee.reference,
    date_livraison: tournee.date,
    modele_camion_id: tournee.modeleCamionId,
    statut: statutTournee.versBase(tournee.statut),
  }
}

// --- commande et ligne_commande ----------------------------------------------------------

export interface LigneCommandeBase {
  id: string
  tournee_id: string | null
  numero: string
  destination: string
  ville: string | null
  rang_livraison: number | null
}

export function commandeDepuisLigne(ligne: LigneCommandeBase): Commande {
  return {
    id: ligne.id,
    tourneeId: ligne.tournee_id,
    numero: ligne.numero,
    destination: ligne.destination,
    ville: facultatif(ligne.ville),
    rangLivraison: ligne.rang_livraison,
  }
}

export function commandeVersLigne(commande: AEnregistrer<Commande>) {
  return {
    ...avecId(commande.id),
    tournee_id: commande.tourneeId,
    numero: commande.numero,
    destination: commande.destination,
    ville: commande.ville || null,
    rang_livraison: commande.rangLivraison,
  }
}

export interface LigneLigneCommande {
  id: string
  commande_id: string
  article_id: string
  quantite: number
  nu: boolean
  longueur_propre: number | null
  largeur_propre: number | null
  hauteur_propre: number | null
  poids_propre: number | string | null
  poids_estime: boolean
  numero_ligne: number
}

export function ligneCommandeDepuisLigne(ligne: LigneLigneCommande): LigneDeCommande {
  return {
    id: ligne.id,
    commandeId: ligne.commande_id,
    articleId: ligne.article_id,
    quantite: ligne.quantite,
    nu: ligne.nu,
    dimsPropres: dimensionsFacultatives(
      ligne.longueur_propre,
      ligne.largeur_propre,
      ligne.hauteur_propre,
    ),
    poidsPropre: ligne.poids_propre == null ? undefined : Number(ligne.poids_propre),
    poidsEstime: ligne.poids_estime,
  }
}

/**
 * Une ligne à insérer : la commande lui donne son `commande_id`, et sa place
 * dans la liste son `numero_ligne` (1 pour la première).
 */
export function ligneCommandeVersLigne(
  ligne: LigneAEnregistrer,
  commandeId: string,
  numeroLigne: number,
) {
  return {
    commande_id: commandeId,
    article_id: ligne.articleId,
    quantite: ligne.quantite,
    nu: ligne.nu,
    longueur_propre: ligne.dimsPropres?.l ?? null,
    largeur_propre: ligne.dimsPropres?.w ?? null,
    hauteur_propre: ligne.dimsPropres?.h ?? null,
    poids_propre: ligne.poidsPropre ?? null,
    poids_estime: ligne.poidsEstime,
    numero_ligne: numeroLigne,
  }
}

// --- plan_chargement et placement ---------------------------------------------------------

export interface LignePlan {
  id: string
  tournee_id: string
  version: number
  calcule_le: string
}

export function planDepuisLigne(ligne: LignePlan): PlanChargement {
  return {
    id: ligne.id,
    tourneeId: ligne.tournee_id,
    version: ligne.version,
    calculeLe: ligne.calcule_le,
  }
}

export interface LignePlacement {
  id: string
  plan_id: string
  ligne_commande_id: string
  numero_unite: number
  x: number
  y: number
  z: number
  orientation: string
  rang: number
  statut: string
}

export function placementDepuisLigne(ligne: LignePlacement): PlacementEnregistre {
  return {
    id: ligne.id,
    planId: ligne.plan_id,
    ligneCommandeId: ligne.ligne_commande_id,
    numeroUnite: ligne.numero_unite,
    x: ligne.x,
    y: ligne.y,
    z: ligne.z,
    orientation: orientation.versDomaine(ligne.orientation),
    rang: ligne.rang,
    statut: statutPlacement.versDomaine(ligne.statut),
  }
}

export function placementVersLigne(placement: PlacementAEnregistrer, planId: string) {
  return {
    plan_id: planId,
    ligne_commande_id: placement.ligneCommandeId,
    numero_unite: placement.numeroUnite,
    x: placement.x,
    y: placement.y,
    z: placement.z,
    orientation: orientation.versBase(placement.orientation),
    rang: placement.rang,
    statut: statutPlacement.versBase(placement.statut),
  }
}

// --- element_attente ------------------------------------------------------------------

export interface LigneElementAttente {
  id: string
  commande_id: string
  ligne_commande_id: string | null
  tournee_origine_id: string | null
  motif: string
}

export function elementAttenteDepuisLigne(ligne: LigneElementAttente): ElementAttente {
  return {
    id: ligne.id,
    commandeId: ligne.commande_id,
    ligneCommandeId: ligne.ligne_commande_id,
    tourneeOrigineId: ligne.tournee_origine_id,
    motif: motifAttente.versDomaine(ligne.motif),
  }
}

export function elementAttenteVersLigne(element: AEnregistrer<ElementAttente>) {
  return {
    commande_id: element.commandeId,
    ligne_commande_id: element.ligneCommandeId,
    tournee_origine_id: element.tourneeOrigineId,
    motif: motifAttente.versBase(element.motif),
  }
}
