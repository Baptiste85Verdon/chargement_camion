// Formulaire de la saisie express (captures 03, 03b, 03e ; CF 4.3).
//
// Passage entre la commande enregistrée et ce que l'utilisateur tape, comme
// `saisie-camion.ts`, plus les deux calculs propres à cet écran :
// - le poids proposé au prorata du volume quand les dimensions d'une ligne
//   changent (RG-03) ;
// - le résumé en bas de page : lignes, articles, volume et poids.
// `ligneModifiee` dit enfin si une ligne a changé au point de perdre sa place
// dans le plan (une ligne inchangée garde son placement).
import type { Commande, FicheArticle, LigneDeCommande } from './modele'
import type { Dimensions } from './types'
import {
  lireDimensions,
  lireKilogrammes,
  lireMillimetres,
  type SaisieCommande,
  type SaisieLigne,
} from './validation'

// --- Poids estimé (RG-03) -------------------------------------------------------

const volume = (d: Dimensions) => d.l * d.w * d.h

/**
 * Poids proposé au prorata du volume (RG-03) : le poids du catalogue
 * multiplié par le rapport entre le volume propre et celui du catalogue.
 * Arrondi au dixième de kilogramme (précision de la base), au moins 0,1 kg.
 */
export function estimerPoids(
  poidsCatalogue: number,
  dimsCatalogue: Dimensions,
  dimsPropres: Dimensions,
): number {
  const brut = (poidsCatalogue * volume(dimsPropres)) / volume(dimsCatalogue)
  return Math.max(0.1, Math.round(brut * 10) / 10)
}

/**
 * Taille du catalogue retenue pour une ligne (RG-02) : la taille nue pour une
 * ligne livrée nue, si l'article en a une ; la taille emballée sinon.
 */
export function dimensionsCatalogue(article: FicheArticle, nu: boolean): Dimensions {
  return nu && article.dimsNues ? article.dimsNues : article.dimsEmballees
}

/** Un poids écrit à la française : virgule décimale. */
const ecrirePoids = (kg: number) => String(kg).replace('.', ',')

/**
 * Après un changement des dimensions propres (ou du choix nu / emballé) :
 * si les trois dimensions sont lisibles, la ligne reçoit le poids estimé et
 * le marquage « estimé ». Sinon, la ligne est rendue telle quelle. Il n'y a
 * pas de poids nu (RG-05) : le poids du catalogue vaut pour les deux tailles.
 */
export function proposerPoids(ligne: SaisieLigne, article: FicheArticle): SaisieLigne {
  const lecture = lireDimensions(ligne.dimsPropres)
  if (lecture.etat !== 'ok') return ligne
  const poids = estimerPoids(article.poids, dimensionsCatalogue(article, ligne.nu), lecture.dims)
  return { ...ligne, poids: ecrirePoids(poids), poidsEstime: true }
}

// --- Formulaire -----------------------------------------------------------------

const DIMENSIONS_VIDES = { l: '', w: '', h: '' }

/** Une ligne ajoutée depuis le catalogue : emballée, quantité 1, valeurs du catalogue. */
export function ligneDepuisArticle(article: FicheArticle): SaisieLigne {
  return {
    articleId: article.id,
    quantite: '1',
    nu: false,
    dimsPropres: { ...DIMENSIONS_VIDES },
    poids: '',
    poidsEstime: false,
  }
}

export function formulaireVideCommande(numeroPropose: string): SaisieCommande {
  return { numero: numeroPropose, destination: '', ville: '', lignes: [] }
}

export function formulaireDepuisCommande(
  commande: Commande,
  lignes: LigneDeCommande[],
): SaisieCommande {
  return {
    id: commande.id,
    numero: commande.numero,
    destination: commande.destination,
    ville: commande.ville ?? '',
    lignes: lignes.map((l) => ({
      id: l.id,
      articleId: l.articleId,
      quantite: String(l.quantite),
      nu: l.nu,
      dimsPropres: l.dimsPropres
        ? { l: String(l.dimsPropres.l), w: String(l.dimsPropres.w), h: String(l.dimsPropres.h) }
        : { ...DIMENSIONS_VIDES },
      poids: l.poidsPropre === undefined ? '' : ecrirePoids(l.poidsPropre),
      poidsEstime: l.poidsEstime,
    })),
  }
}

/** Une commande à enregistrer : sans `id` pour une création. */
export type CommandeSaisie = Omit<Commande, 'id'> & { id?: string }

/** Une ligne à enregistrer : sans `id` pour une ligne ajoutée. */
export type LigneSaisie = Omit<LigneDeCommande, 'id' | 'commandeId'> & { id?: string }

function entier(texte: string): number {
  const valeur = lireMillimetres(texte)
  if (valeur === null) throw new Error(`Nombre non vérifié : « ${texte} »`)
  return valeur
}

/**
 * La commande et ses lignes à enregistrer, à partir d'un formulaire sans
 * erreur (`validerCommande`). `place` situe la commande : sa tournée et son
 * rang de livraison.
 */
export function commandeDepuisFormulaire(
  f: SaisieCommande,
  place: { tourneeId: string | null; rangLivraison: number | null },
): { commande: CommandeSaisie; lignes: LigneSaisie[] } {
  const ville = f.ville.trim()
  return {
    commande: {
      ...(f.id ? { id: f.id } : {}),
      tourneeId: place.tourneeId,
      numero: f.numero.trim(),
      destination: f.destination.trim(),
      ...(ville ? { ville } : {}),
      rangLivraison: place.rangLivraison,
    },
    lignes: f.lignes.map((l) => {
      const dims = lireDimensions(l.dimsPropres)
      const poids = lireKilogrammes(l.poids)
      return {
        ...(l.id ? { id: l.id } : {}),
        articleId: l.articleId,
        quantite: entier(l.quantite),
        nu: l.nu,
        ...(dims.etat === 'ok' ? { dimsPropres: dims.dims } : {}),
        ...(poids === null ? {} : { poidsPropre: poids }),
        // « Estimé » n'a de sens qu'avec un poids propre.
        poidsEstime: poids !== null && l.poidsEstime,
      }
    }),
  }
}

// --- Lignes changées ------------------------------------------------------------

const memesDimensions = (a?: Dimensions, b?: Dimensions) =>
  a === b || (a !== undefined && b !== undefined && a.l === b.l && a.w === b.w && a.h === b.h)

/**
 * Vrai si la ligne a changé au point que son placement n'est plus valable :
 * article, quantité, livraison nue, dimensions ou poids. Le seul marquage
 * « estimé » ne change ni la taille ni le poids : il ne compte pas.
 * La fonction SQL `enregistrer_commande` applique la même règle.
 */
export function ligneModifiee(
  avant: Omit<LigneSaisie, 'id'>,
  apres: Omit<LigneSaisie, 'id'>,
): boolean {
  return (
    avant.articleId !== apres.articleId ||
    avant.quantite !== apres.quantite ||
    avant.nu !== apres.nu ||
    !memesDimensions(avant.dimsPropres, apres.dimsPropres) ||
    avant.poidsPropre !== apres.poidsPropre
  )
}

// --- Numéro proposé -------------------------------------------------------------

/**
 * Numéro proposé pour une nouvelle commande : celui qui suit le plus grand
 * numéro « CMD-<année>-<n> » connu pour l'année, sur quatre chiffres.
 * L'utilisateur reste libre de le changer.
 */
export function numeroSuivant(numeros: string[], annee: number): string {
  const forme = new RegExp(`^CMD-${annee}-(\\d+)$`)
  const plusGrand = Math.max(0, ...numeros.map((n) => Number(forme.exec(n.trim())?.[1] ?? 0)))
  return `CMD-${annee}-${String(plusGrand + 1).padStart(4, '0')}`
}

// --- Résumé ---------------------------------------------------------------------

/** Ce que le résumé lit d'une ligne : ses valeurs effectives possibles. */
export type LigneAResumer = Pick<LigneDeCommande, 'articleId' | 'quantite' | 'nu'> &
  Partial<Pick<LigneDeCommande, 'dimsPropres' | 'poidsPropre'>>

export interface ResumeLignes {
  lignes: number
  /** Nombre d'unités physiques : somme des quantités. */
  articles: number
  /** En mètres cubes. */
  volume: number
  /** En kilogrammes. */
  poids: number
}

/**
 * Résumé de lignes de commande, avec leurs dimensions et poids effectifs
 * (RG-02, RG-03) : en bas de la saisie express et dans la carte « Calcul du
 * plan ». Une ligne dont l'article est inconnu compte comme ligne, sans plus.
 */
export function resumerLignes(lignes: LigneAResumer[], catalogue: FicheArticle[]): ResumeLignes {
  const parId = new Map(catalogue.map((a) => [a.id, a]))
  const resume: ResumeLignes = { lignes: lignes.length, articles: 0, volume: 0, poids: 0 }
  for (const ligne of lignes) {
    const article = parId.get(ligne.articleId)
    if (!article) continue
    const dims = ligne.dimsPropres ?? dimensionsCatalogue(article, ligne.nu)
    resume.articles += ligne.quantite
    resume.volume += (ligne.quantite * volume(dims)) / 1e9
    resume.poids += ligne.quantite * (ligne.poidsPropre ?? article.poids)
  }
  return resume
}
