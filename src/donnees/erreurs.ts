// Erreurs de la couche de données (cahier technique 6.1 et 7.1).
//
// Quelle que soit l'implémentation (Supabase, mémoire, future API), un dépôt
// ne laisse sortir qu'une `ErreurDonnees` : un code stable, le champ concerné
// quand on le connaît, et un message déjà traduit. Une erreur de la base
// n'est donc jamais affichée brute.
import { textes } from '@/textes/fr'

export type CodeErreurDonnees =
  /** Une valeur unique est déjà prise : référence, numéro de commande… */
  | 'doublon'
  /** Une contrainte de la base refuse une valeur (CHECK, NOT NULL). */
  | 'contrainte'
  /** L'élément est encore utilisé ailleurs et ne peut pas être supprimé. */
  | 'utilise'
  /** L'élément demandé n'existe plus. */
  | 'introuvable'
  /** Réseau, service en pause, ou toute autre erreur inattendue. */
  | 'reseau'

export class ErreurDonnees extends Error {
  readonly code: CodeErreurDonnees
  /** Champ du formulaire concerné, quand on le connaît : `reference`, `numero`… */
  readonly champ?: string

  constructor(code: CodeErreurDonnees, champ?: string, cause?: unknown) {
    super(textes.donnees[code], { cause })
    this.name = 'ErreurDonnees'
    this.code = code
    this.champ = champ
  }
}

/** Ce que renvoie Supabase (PostgREST) en cas d'échec. */
export interface ErreurPostgrest {
  code?: string
  message: string
  details?: string | null
}

/**
 * Champ du formulaire pour chaque contrainte d'unicité ou de valeur nommée
 * dans la migration (PostgreSQL nomme `<table>_<colonne>_key` les UNIQUE
 * déclarés sur une colonne).
 */
const CHAMP_DE_CONTRAINTE: Record<string, string> = {
  article_reference_key: 'reference',
  tournee_reference_key: 'reference',
  commande_numero_unique_dans_tournee: 'numero',
  article_taille_nue_complete: 'dimsNues',
  article_nue_au_plus_emballee: 'dimsNues',
  ligne_taille_propre_complete: 'dimsPropres',
  tournee_date_et_camion_hors_preparation: 'date',
}

/** Retrouve le nom de la contrainte cité dans le message de PostgreSQL. */
function contrainteCitee(erreur: ErreurPostgrest): string | undefined {
  const texte = `${erreur.message} ${erreur.details ?? ''}`
  return /constraint "([^"]+)"/.exec(texte)?.[1]
}

/**
 * Traduit une erreur PostgREST en `ErreurDonnees`. Codes PostgreSQL :
 * 23505 unicité, 23503 clé étrangère, 23514 CHECK, 23502 NOT NULL ;
 * PGRST116 : aucune ligne là où une seule était attendue.
 */
export function traduireErreur(erreur: ErreurPostgrest): ErreurDonnees {
  const contrainte = contrainteCitee(erreur)
  const champ = contrainte ? CHAMP_DE_CONTRAINTE[contrainte] : undefined
  switch (erreur.code) {
    case '23505':
      return new ErreurDonnees('doublon', champ, erreur)
    case '23503':
      // Deux cas : supprimer une ligne encore citée ailleurs (« is still
      // referenced »), ou citer une ligne qui n'existe pas (« is not present »).
      return /still referenced/.test(`${erreur.message} ${erreur.details ?? ''}`)
        ? new ErreurDonnees('utilise', champ, erreur)
        : new ErreurDonnees('introuvable', champ, erreur)
    case '23514':
    case '23502':
      return new ErreurDonnees('contrainte', champ, erreur)
    case 'PGRST116':
      return new ErreurDonnees('introuvable', undefined, erreur)
    default:
      return new ErreurDonnees('reseau', undefined, erreur)
  }
}
