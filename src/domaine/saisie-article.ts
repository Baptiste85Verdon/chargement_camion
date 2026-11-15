// Formulaire de la fiche article (captures 08 et 08e) : passage entre la
// fiche enregistrée et ce que l'utilisateur tape.
//
// Le formulaire garde les nombres en texte, tels que tapés (« 1 200 »,
// « 22,5 ») : c'est ce que vérifie `validerArticle` (RG-21). On ne convertit
// en nombres qu'au moment d'enregistrer, une fois la saisie vérifiée.
import type { FicheArticle, Forme } from './modele'
import type { Dimensions } from './types'
import {
  lireKilogrammes,
  lireMillimetres,
  type SaisieArticle,
  type SaisieDimensions,
} from './validation'

/** Une fiche à enregistrer : sans `id` pour une création. */
export type ArticleAEnregistrer = Omit<FicheArticle, 'id'> & { id?: string }

/** La saisie vérifiée par RG-21, plus les règles de placement de la fiche. */
export interface FormulaireArticle extends SaisieArticle {
  /** Toujours une chaîne dans le formulaire : vide quand il n'y en a pas. */
  reference: string
  fragile: boolean
  forme: Forme
  porteur: boolean
}

/** RG-18 : le dessus est porteur par défaut pour une forme rectangulaire seulement. */
export const porteurParDefaut = (forme: Forme) => forme === 'rectangulaire'

const dimsVides = (): SaisieDimensions => ({ l: '', w: '', h: '' })

const dimsEnTexte = (d: Dimensions): SaisieDimensions => ({
  l: String(d.l),
  w: String(d.w),
  h: String(d.h),
})

/** Formulaire d'un nouvel article : rien de coché, forme rectangulaire. */
export function formulaireVide(): FormulaireArticle {
  return {
    reference: '',
    nom: '',
    famille: '',
    dimsEmballees: dimsVides(),
    poids: '',
    livrableNu: false,
    dimsNues: dimsVides(),
    orientations: [],
    fragile: false,
    forme: 'rectangulaire',
    porteur: porteurParDefaut('rectangulaire'),
  }
}

export function formulaireDepuisArticle(article: FicheArticle): FormulaireArticle {
  return {
    id: article.id,
    reference: article.reference ?? '',
    nom: article.nom,
    famille: article.famille,
    dimsEmballees: dimsEnTexte(article.dimsEmballees),
    // Virgule décimale, comme l'utilisateur l'écrirait.
    poids: String(article.poids).replace('.', ','),
    livrableNu: article.dimsNues !== undefined,
    dimsNues: article.dimsNues ? dimsEnTexte(article.dimsNues) : dimsVides(),
    orientations: [...article.orientations],
    fragile: article.fragile,
    forme: article.forme,
    porteur: article.porteur,
  }
}

/** Lit des millimètres déjà vérifiés ; une valeur illisible est une erreur de programmation. */
function millimetres(texte: string): number {
  const valeur = lireMillimetres(texte)
  if (valeur === null) throw new Error(`Dimension non vérifiée : « ${texte} »`)
  return valeur
}

const dimsEnNombres = (d: SaisieDimensions): Dimensions => ({
  l: millimetres(d.l),
  w: millimetres(d.w),
  h: millimetres(d.h),
})

/**
 * La fiche à enregistrer. À appeler seulement sur un formulaire sans erreur
 * (`validerArticle`) : sinon, elle lève une exception. `origine`, la fiche
 * avant modification, garde ce que le formulaire ne montre pas : la date
 * d'archivage (modifier un article archivé ne le réactive pas).
 */
export function articleDepuisFormulaire(
  f: FormulaireArticle,
  origine?: FicheArticle,
): ArticleAEnregistrer {
  const poids = lireKilogrammes(f.poids)
  if (poids === null) throw new Error(`Poids non vérifié : « ${f.poids} »`)
  const reference = f.reference.trim()
  return {
    ...(f.id === undefined ? {} : { id: f.id }),
    reference: reference ? reference : undefined,
    nom: f.nom.trim(),
    famille: f.famille as FicheArticle['famille'],
    dimsEmballees: dimsEnNombres(f.dimsEmballees),
    dimsNues: f.livrableNu ? dimsEnNombres(f.dimsNues) : undefined,
    poids,
    fragile: f.fragile,
    orientations: [...f.orientations],
    forme: f.forme,
    porteur: f.porteur,
    ...(origine?.archiveLe === undefined ? {} : { archiveLe: origine.archiveLe }),
  }
}
