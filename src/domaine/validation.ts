// Vérification des saisies (RG-21, cahier technique 6.1).
//
// Une fonction pure par formulaire. Elle reçoit la saisie telle que tapée
// (des textes pour les nombres) et renvoie deux listes :
// - les erreurs, qui bloquent l'enregistrement ;
// - les avertissements, qui ne bloquent pas.
// Chaque problème porte le champ concerné, un code stable et le message à
// afficher sous le champ. Aucune borne de plausibilité : une valeur valide
// mais inhabituelle n'est jamais signalée.
import { textes } from '@/textes/fr'
import { encombrement } from './encombrement'
import {
  FAMILLES,
  estActif,
  type ActionSignalement,
  type Commande,
  type FicheArticle,
  type Famille,
  type Tournee,
  type TypeSignalement,
} from './modele'
import type { Camion, Dimensions, Orientation, Unite } from './types'

// --- Types --------------------------------------------------------------------

export type CodeProbleme =
  | 'obligatoire'
  | 'entierPositif'
  | 'nombrePositif'
  | 'tailleIncomplete'
  | 'nuePlusGrande'
  | 'orientationRequise'
  | 'nomDejaUtilise'
  | 'horsCamions'
  | 'orientationContraire'
  | 'camionUtilise'
  | 'doublon'
  | 'ligneRequise'
  | 'quantiteEntiere'
  | 'poidsEstime'
  | 'horsCamion'
  | 'dateInvalide'
  | 'commandeRequise'
  | 'plusGrandSansDepassement'
  | 'toucheDejaPrise'
  | 'toucheReservee'

export interface Probleme {
  /** Champ du formulaire : `nom`, `dimsEmballees`, `lignes.0.quantite`… */
  champ: string
  code: CodeProbleme
  message: string
}

export interface ResultatValidation {
  erreurs: Probleme[]
  avertissements: Probleme[]
}

/** Trois dimensions telles que saisies : longueur, largeur, hauteur. */
export interface SaisieDimensions {
  l: string
  w: string
  h: string
}

export interface SaisieArticle {
  /** Absent pour un nouvel article. */
  id?: string
  /** Référence commerciale, facultative. */
  reference?: string
  nom: string
  /** Vide tant qu'aucune famille n'est choisie. */
  famille: string
  dimsEmballees: SaisieDimensions
  poids: string
  /** Case « Peut être livré nu ». */
  livrableNu: boolean
  dimsNues: SaisieDimensions
  orientations: Orientation[]
}

export interface SaisieCamion {
  nom: string
  longueur: string
  largeur: string
  hauteur: string
}

export interface SaisieLigne {
  /** Identifiant de la ligne enregistrée ; absent pour une ligne ajoutée. */
  id?: string
  articleId: string
  quantite: string
  nu: boolean
  /** Dimensions propres à la commande : les trois, ou trois champs vides. */
  dimsPropres: SaisieDimensions
  /** Poids propre ; vide pour reprendre celui du catalogue. */
  poids: string
  /** Le poids a été proposé au prorata du volume (RG-03). */
  poidsEstime: boolean
}

export interface SaisieCommande {
  /** Absent pour une nouvelle commande. */
  id?: string
  numero: string
  destination: string
  ville: string
  lignes: SaisieLigne[]
}

export interface SaisieTournee {
  /** Date au format AAAA-MM-JJ (champ `<input type="date">`). */
  date: string
  modeleCamionId: string
}

export interface SaisieSignalement {
  type: TypeSignalement | ''
  action: ActionSignalement | ''
  commentaire: string
  dimsMesurees: SaisieDimensions
}

// --- Lecture des nombres --------------------------------------------------------

/** Retire les espaces, y compris insécables : « 1 250 » devient « 1250 ». */
function sansEspaces(texte: string): string {
  // En JavaScript, \s couvre aussi les espaces insécables (U+00A0, U+202F).
  return texte.replace(/\s/g, '')
}

/**
 * Lit un nombre entier de millimètres supérieur à 0. Renvoie `null` si le
 * texte est vide, décimal, négatif, nul ou illisible.
 */
export function lireMillimetres(texte: string): number | null {
  const brut = sansEspaces(texte)
  if (!/^\d+$/.test(brut)) return null
  const valeur = Number(brut)
  return valeur > 0 ? valeur : null
}

/**
 * Lit un poids en kilogrammes supérieur à 0, virgule ou point décimal.
 * Renvoie `null` si le texte est vide, nul, négatif ou illisible.
 */
export function lireKilogrammes(texte: string): number | null {
  const brut = sansEspaces(texte).replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(brut)) return null
  const valeur = Number(brut)
  return valeur > 0 ? valeur : null
}

const estVide = (texte: string) => texte.trim() === ''

/** Compare deux noms sans tenir compte de la casse ni des espaces autour. */
const memeNom = (a: string, b: string) =>
  a.trim().toLocaleLowerCase('fr') === b.trim().toLocaleLowerCase('fr')

// --- Briques communes ---------------------------------------------------------

/**
 * Lit trois dimensions saisies ensemble.
 * - `vide` : aucun des trois champs n'est rempli ;
 * - `incomplete` : un ou deux champs seulement sont remplis ;
 * - `invalide` : les trois sont remplis, mais l'un n'est pas un entier > 0 ;
 * - `ok` : les trois dimensions, en millimètres.
 */
export type LectureDimensions =
  | { etat: 'vide' }
  | { etat: 'incomplete' }
  | { etat: 'invalide' }
  | { etat: 'ok'; dims: Dimensions }

export function lireDimensions(saisie: SaisieDimensions): LectureDimensions {
  const champs = [saisie.l, saisie.w, saisie.h]
  const remplis = champs.filter((c) => !estVide(c)).length
  if (remplis === 0) return { etat: 'vide' }
  if (remplis < 3) return { etat: 'incomplete' }
  const [l, w, h] = champs.map(lireMillimetres)
  if (l == null || w == null || h == null) return { etat: 'invalide' }
  return { etat: 'ok', dims: { l, w, h } }
}

/**
 * Vrai si l'unité rentre dans la caisse dans au moins une des orientations
 * données (encombrement de RG-04). Sans orientation, on essaie les trois.
 */
function rentreDans(dims: Dimensions, orientations: Orientation[], camion: Camion): boolean {
  const essais: Orientation[] = orientations.length > 0 ? orientations : ['aPlat', 'debout']
  return essais.some((orientation) => {
    const e = encombrement(dims, orientation)
    return e.l <= camion.longueur && e.w <= camion.largeur && e.h <= camion.hauteur
  })
}

/**
 * Orientations contraires à RG-04 selon la famille : les fenêtres se
 * transportent debout ; les plaques à plat ou debout contre une paroi.
 */
const ORIENTATIONS_CONTRAIRES: Partial<Record<Famille, Orientation[]>> = {
  Fenêtres: ['aPlat'],
  'Plaques de plâtre': ['debout'],
}

/** Orientations proposées par défaut à la création d'une fiche (CF 4.6). */
export const ORIENTATIONS_PAR_DEFAUT: Record<Famille, Orientation[]> = {
  Fenêtres: ['debout'],
  'Fenêtres de toit': ['aPlat'],
  'Plaques de plâtre': ['aPlat', 'contreParoi'],
  'Planches et panneaux': ['aPlat'],
  'Poutres et charpente': ['aPlat'],
  Maçonnerie: ['aPlat'],
  Couverture: ['aPlat'],
  Isolation: ['aPlat'],
  Quincaillerie: ['aPlat'],
}

const estFamille = (texte: string): texte is Famille =>
  (FAMILLES as readonly string[]).includes(texte)

/** Code de commande affiché : C1 pour la commande livrée en premier. */
const codeCommande = (commande: Commande) =>
  commande.rangLivraison == null ? commande.numero : `C${commande.rangLivraison}`

// --- Fiche article --------------------------------------------------------------

export function validerArticle(
  saisie: SaisieArticle,
  contexte: { catalogue: FicheArticle[]; camions: (Camion & { archiveLe?: string })[] },
): ResultatValidation {
  const m = textes.validation
  const erreurs: Probleme[] = []
  const avertissements: Probleme[] = []

  // Les articles archivés ne comptent plus : ni pour les doublons de
  // référence, ni pour les homonymes.
  const actifs = contexte.catalogue.filter((a) => a.id !== saisie.id && estActif(a))

  const reference = saisie.reference?.trim() ?? ''
  const memeReference = actifs.find((a) => reference !== '' && a.reference === reference)
  if (memeReference) {
    erreurs.push({
      champ: 'reference',
      code: 'doublon',
      message: m.article.referenceDejaPrise(memeReference.nom),
    })
  }
  if (estVide(saisie.nom)) {
    erreurs.push({ champ: 'nom', code: 'obligatoire', message: m.article.nom })
  }
  if (!estFamille(saisie.famille)) {
    erreurs.push({ champ: 'famille', code: 'obligatoire', message: m.article.famille })
  }

  const emballees = lireDimensions(saisie.dimsEmballees)
  if (emballees.etat === 'vide' || emballees.etat === 'incomplete') {
    erreurs.push({
      champ: 'dimsEmballees',
      code: 'tailleIncomplete',
      message: m.article.dimsEmballeesIncompletes,
    })
  } else if (emballees.etat === 'invalide') {
    erreurs.push({ champ: 'dimsEmballees', code: 'entierPositif', message: m.nombre.entierPositif })
  }

  if (estVide(saisie.poids)) {
    erreurs.push({ champ: 'poids', code: 'obligatoire', message: m.article.poids })
  } else if (lireKilogrammes(saisie.poids) == null) {
    erreurs.push({ champ: 'poids', code: 'nombrePositif', message: m.nombre.poidsPositif })
  }

  // Case décochée : les champs nus sont masqués, donc ignorés.
  if (saisie.livrableNu) {
    const nues = lireDimensions(saisie.dimsNues)
    if (nues.etat === 'vide' || nues.etat === 'incomplete') {
      erreurs.push({
        champ: 'dimsNues',
        code: 'tailleIncomplete',
        message: m.article.dimsNuesIncompletes,
      })
    } else if (nues.etat === 'invalide') {
      erreurs.push({ champ: 'dimsNues', code: 'entierPositif', message: m.nombre.entierPositif })
    } else if (emballees.etat === 'ok') {
      const e = emballees.dims
      const n = nues.dims
      if (n.l > e.l || n.w > e.w || n.h > e.h) {
        erreurs.push({ champ: 'dimsNues', code: 'nuePlusGrande', message: m.article.nuePlusGrande })
      }
    }
  }

  if (saisie.orientations.length === 0) {
    erreurs.push({
      champ: 'orientations',
      code: 'orientationRequise',
      message: m.article.orientationRequise,
    })
  }

  // Avertissements : ils n'empêchent pas d'enregistrer.
  const camionsActifs = contexte.camions.filter(estActif)
  const homonyme = actifs.find((a) => !estVide(saisie.nom) && memeNom(a.nom, saisie.nom))
  if (homonyme) {
    avertissements.push({
      champ: 'nom',
      code: 'nomDejaUtilise',
      message: m.article.nomDejaUtilise(homonyme.reference ?? homonyme.nom),
    })
  }

  if (
    emballees.etat === 'ok' &&
    camionsActifs.length > 0 &&
    !camionsActifs.some((camion) => rentreDans(emballees.dims, saisie.orientations, camion))
  ) {
    avertissements.push({
      champ: 'dimsEmballees',
      code: 'horsCamions',
      message: m.article.horsCamions,
    })
  }

  if (estFamille(saisie.famille)) {
    const contraires = (ORIENTATIONS_CONTRAIRES[saisie.famille] ?? []).filter((o) =>
      saisie.orientations.includes(o),
    )
    if (contraires.length > 0) {
      const noms = contraires.map((o) => `« ${textes.orientations[o]} »`).join(', ')
      avertissements.push({
        champ: 'orientations',
        code: 'orientationContraire',
        message: m.article.orientationContraire(noms, saisie.famille),
      })
    }
  }

  return { erreurs, avertissements }
}

// --- Fiche camion ---------------------------------------------------------------

export function validerCamion(saisie: SaisieCamion): ResultatValidation {
  const m = textes.validation
  const erreurs: Probleme[] = []

  if (estVide(saisie.nom)) {
    erreurs.push({ champ: 'nom', code: 'obligatoire', message: m.camion.nom })
  }
  for (const champ of ['longueur', 'largeur', 'hauteur'] as const) {
    if (estVide(saisie[champ])) {
      erreurs.push({ champ, code: 'obligatoire', message: m.camion[champ] })
    } else if (lireMillimetres(saisie[champ]) == null) {
      erreurs.push({ champ, code: 'entierPositif', message: m.nombre.entierPositif })
    }
  }
  return { erreurs, avertissements: [] }
}

/** Statuts qui empêchent de supprimer le camion d'une tournée (RG-21). */
const STATUTS_EN_COURS: Tournee['statut'][] = ['enPreparation', 'prete', 'enChargement']

/**
 * Suppression ou archivage d'un modèle de camion : refusés s'il est utilisé
 * par une tournée en préparation, prête ou en chargement, avec la liste de
 * ces tournées (RG-21). Utilisé par une tournée chargée seulement, il peut
 * être archivé ; le dépôt refuse de le supprimer et propose l'archivage.
 */
export function validerSuppressionCamion(
  camion: { id: string },
  tournees: Tournee[],
): ResultatValidation {
  const enCours = tournees.filter(
    (t) => t.modeleCamionId === camion.id && STATUTS_EN_COURS.includes(t.statut),
  )
  if (enCours.length === 0) return { erreurs: [], avertissements: [] }
  const liste = enCours.map((t) => t.reference).join(', ')
  return {
    erreurs: [
      { champ: 'camion', code: 'camionUtilise', message: textes.validation.camion.utilise(liste) },
    ],
    avertissements: [],
  }
}

// --- Saisie express ---------------------------------------------------------------

export function validerCommande(
  saisie: SaisieCommande,
  contexte: {
    commandesDeLaTournee: Commande[]
    /** Pour vérifier qu'un article rentre dans le camion (avertissement). */
    catalogue?: FicheArticle[]
    /** Camion de la tournée, s'il est déjà choisi. */
    camion?: Camion
  },
): ResultatValidation {
  const m = textes.validation
  const erreurs: Probleme[] = []
  const avertissements: Probleme[] = []

  if (estVide(saisie.numero)) {
    erreurs.push({ champ: 'numero', code: 'obligatoire', message: m.commande.numero })
  } else {
    const doublon = contexte.commandesDeLaTournee.find(
      (c) => c.id !== saisie.id && memeNom(c.numero, saisie.numero),
    )
    if (doublon) {
      erreurs.push({
        champ: 'numero',
        code: 'doublon',
        message: m.commande.numeroDoublon(codeCommande(doublon), doublon.destination),
      })
    }
  }
  if (estVide(saisie.destination)) {
    erreurs.push({ champ: 'destination', code: 'obligatoire', message: m.commande.destination })
  }
  if (saisie.lignes.length === 0) {
    erreurs.push({ champ: 'lignes', code: 'ligneRequise', message: m.commande.ligneRequise })
  }

  saisie.lignes.forEach((ligne, i) => {
    const prefixe = `lignes.${i}`

    if (lireMillimetres(ligne.quantite) == null) {
      // Même lecture qu'un entier de millimètres : entier, au moins 1.
      erreurs.push({
        champ: `${prefixe}.quantite`,
        code: 'quantiteEntiere',
        message: m.commande.quantite,
      })
    }

    const propres = lireDimensions(ligne.dimsPropres)
    if (propres.etat === 'incomplete') {
      erreurs.push({
        champ: `${prefixe}.dimsPropres`,
        code: 'tailleIncomplete',
        message: m.commande.dimsPropresIncompletes,
      })
    } else if (propres.etat === 'invalide') {
      erreurs.push({
        champ: `${prefixe}.dimsPropres`,
        code: 'entierPositif',
        message: m.nombre.entierPositif,
      })
    }

    if (!estVide(ligne.poids) && lireKilogrammes(ligne.poids) == null) {
      erreurs.push({
        champ: `${prefixe}.poids`,
        code: 'nombrePositif',
        message: m.nombre.poidsPositif,
      })
    } else if (ligne.poidsEstime) {
      avertissements.push({
        champ: `${prefixe}.poids`,
        code: 'poidsEstime',
        message: m.commande.poidsEstime,
      })
    }

    // L'article rentre-t-il dans le camion de la tournée ? (RG-10)
    const article = contexte.catalogue?.find((a) => a.id === ligne.articleId)
    if (
      article &&
      contexte.camion &&
      propres.etat !== 'incomplete' &&
      propres.etat !== 'invalide'
    ) {
      const dims =
        propres.etat === 'ok'
          ? propres.dims
          : ligne.nu && article.dimsNues
            ? article.dimsNues
            : article.dimsEmballees
      if (!rentreDans(dims, article.orientations, contexte.camion)) {
        avertissements.push({ champ: prefixe, code: 'horsCamion', message: m.commande.horsCamion })
      }
    }
  })

  return { erreurs, avertissements }
}

// --- Préparation d'une tournée ------------------------------------------------------

/** Vrai pour une date réelle au format AAAA-MM-JJ (refuse le 30 février). */
function estDateValide(texte: string): boolean {
  const morceaux = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texte)
  if (!morceaux) return false
  const [annee, mois, jour] = morceaux.slice(1).map(Number) as [number, number, number]
  const date = new Date(Date.UTC(annee, mois - 1, jour))
  return (
    date.getUTCFullYear() === annee && date.getUTCMonth() === mois - 1 && date.getUTCDate() === jour
  )
}

/**
 * Préparation d'une tournée : date et camion obligatoires ; au moins une
 * commande au moment de « Lancer le calcul » (`lancement`).
 */
export function validerTournee(
  saisie: SaisieTournee,
  contexte: { nombreCommandes: number; lancement: boolean },
): ResultatValidation {
  const m = textes.validation.tournee
  const erreurs: Probleme[] = []

  if (estVide(saisie.date)) {
    erreurs.push({ champ: 'date', code: 'obligatoire', message: m.date })
  } else if (!estDateValide(saisie.date.trim())) {
    erreurs.push({ champ: 'date', code: 'dateInvalide', message: m.dateInvalide })
  }
  if (estVide(saisie.modeleCamionId)) {
    erreurs.push({ champ: 'modeleCamionId', code: 'obligatoire', message: m.camion })
  }
  if (contexte.lancement && contexte.nombreCommandes === 0) {
    erreurs.push({ champ: 'commandes', code: 'commandeRequise', message: m.commandeRequise })
  }
  return { erreurs, avertissements: [] }
}

// --- Signalement ------------------------------------------------------------------

/**
 * Signalement en mode quai : type et action obligatoires ; dimensions
 * mesurées, les trois ou aucune. `prevu` est l'unité telle que le plan la
 * prévoit, pour comparer les mesures.
 */
export function validerSignalement(saisie: SaisieSignalement, prevu: Unite): ResultatValidation {
  const m = textes.validation.signalement
  const erreurs: Probleme[] = []
  const avertissements: Probleme[] = []

  if (saisie.type === '') {
    erreurs.push({ champ: 'type', code: 'obligatoire', message: m.type })
  }
  if (saisie.action === '') {
    erreurs.push({ champ: 'action', code: 'obligatoire', message: m.action })
  }

  const mesures = lireDimensions(saisie.dimsMesurees)
  if (mesures.etat === 'incomplete') {
    erreurs.push({
      champ: 'dimsMesurees',
      code: 'tailleIncomplete',
      message: m.dimsMesureesIncompletes,
    })
  } else if (mesures.etat === 'invalide') {
    erreurs.push({
      champ: 'dimsMesurees',
      code: 'entierPositif',
      message: textes.validation.nombre.entierPositif,
    })
  } else if (mesures.etat === 'ok' && saisie.type === 'plusGrand') {
    const d = mesures.dims
    const p = prevu.dims
    if (d.l <= p.l && d.w <= p.w && d.h <= p.h) {
      avertissements.push({
        champ: 'dimsMesurees',
        code: 'plusGrandSansDepassement',
        message: m.plusGrandSansDepassement,
      })
    }
  }

  return { erreurs, avertissements }
}

// --- Raccourcis clavier -------------------------------------------------------------

/** Actions du plan dont le raccourci se modifie (cahier technique 5.6, capture 04g). */
export const ACTIONS_RACCOURCIS = [
  'changerOrientation',
  'retirer',
  'aimantation',
  'modeAffichage',
  'etapeSuivante',
  'etapePrecedente',
  'afficherRaccourcis',
] as const

export type ActionRaccourci = (typeof ACTIONS_RACCOURCIS)[number]

/**
 * La touche de chaque action : la valeur `key` de l'évènement clavier
 * (`'r'`, `'Delete'`, `'PageDown'`…), ou `null` quand le raccourci est
 * désactivé (WCAG 2.1.4 : un raccourci d'une seule touche doit pouvoir
 * être modifié ou désactivé).
 */
export type Raccourcis = Record<ActionRaccourci, string | null>

/** Les touches proposées au premier usage, et par « Rétablir les raccourcis par défaut ». */
export const RACCOURCIS_PAR_DEFAUT: Readonly<Raccourcis> = {
  changerOrientation: 'r',
  retirer: 'Delete',
  aimantation: 'a',
  modeAffichage: 'e',
  etapeSuivante: 'PageDown',
  etapePrecedente: 'PageUp',
  afficherRaccourcis: '?',
}

/**
 * Raccourcis fixes, qui ne se modifient pas : chaque touche et l'action
 * qu'elle déclenche. Ctrl + Z (« Annuler le dernier déplacement ») est aussi
 * un raccourci fixe, mais c'est une combinaison : un raccourci modifiable est
 * une touche seule, il ne peut donc jamais la prendre.
 */
const TOUCHES_FIXES: ReadonlyMap<string, 'deplacer' | 'deselectionner'> = new Map([
  ['ArrowLeft', 'deplacer'],
  ['ArrowUp', 'deplacer'],
  ['ArrowRight', 'deplacer'],
  ['ArrowDown', 'deplacer'],
  ['Escape', 'deselectionner'],
])

/**
 * Touches de la navigation au clavier, qu'aucun raccourci ne peut prendre :
 * Tab (et Maj + Tab, la même touche) passe d'un élément à l'autre, Entrée et
 * Espace activent un bouton.
 */
const TOUCHES_NAVIGATION: readonly string[] = ['Tab', 'Enter', ' ']

/** Deux touches identiques ? Une lettre vaut sa majuscule : « r » et « R » sont la même touche. */
function memeTouche(a: string, b: string): boolean {
  const normaliser = (t: string) => (t.length === 1 ? t.toLowerCase() : t)
  return normaliser(a) === normaliser(b)
}

/** Le nom d'une touche tel qu'il s'affiche : « R », « Suppr », « Pg suiv. »… */
export function nomTouche(touche: string): string {
  const nom = textes.raccourcis.touches[touche]
  if (nom !== undefined) return nom
  return touche.length === 1 ? touche.toUpperCase() : touche
}

/**
 * Une touche ne sert qu'à une action (RG-21, capture 04i), et les touches de
 * la navigation au clavier ne servent jamais de raccourci.
 *
 * Avec `modifie`, seul ce raccourci est contrôlé : c'est lui qui reçoit le
 * message, qui nomme l'action qui avait déjà la touche. Sans `modifie`,
 * toute la liste est contrôlée, par exemple des raccourcis relus sur
 * l'appareil : chaque action reçoit une erreur si sa touche est fixe ou
 * déjà prise par une action placée avant elle.
 */
export function validerRaccourcis(
  raccourcis: Raccourcis,
  modifie?: ActionRaccourci,
): ResultatValidation {
  const m = textes.validation.raccourcis
  const noms = textes.raccourcis.actions
  const erreurs: Probleme[] = []

  const aControler = modifie === undefined ? ACTIONS_RACCOURCIS : [modifie]
  for (const action of aControler) {
    const touche = raccourcis[action]
    if (touche === null) continue

    if (TOUCHES_NAVIGATION.some((navigation) => memeTouche(navigation, touche))) {
      erreurs.push({ champ: action, code: 'toucheReservee', message: m.toucheNavigation })
      continue
    }
    const fixe = [...TOUCHES_FIXES].find(([t]) => memeTouche(t, touche))
    if (fixe !== undefined) {
      erreurs.push({
        champ: action,
        code: 'toucheDejaPrise',
        message: m.toucheFixe(nomTouche(touche), noms[fixe[1]]),
      })
      continue
    }

    // Les concurrents : toutes les autres actions si un seul raccourci est
    // modifié, sinon celles qui précèdent (le premier garde sa touche).
    const rang = ACTIONS_RACCOURCIS.indexOf(action)
    const concurrents = ACTIONS_RACCOURCIS.filter((autre, i) =>
      modifie === undefined ? i < rang : autre !== action,
    )
    const autre = concurrents.find((a) => {
      const sienne = raccourcis[a]
      return sienne !== null && memeTouche(sienne, touche)
    })
    if (autre !== undefined) {
      erreurs.push({
        champ: action,
        code: 'toucheDejaPrise',
        message: m.toucheDejaPrise(nomTouche(touche), noms[autre]),
      })
    }
  }

  return { erreurs, avertissements: [] }
}
