// Catalogue des articles : recherche et filtre par famille (cahier
// fonctionnel 4.6, capture 07). Fonctions pures, testées sans interface.
import { FAMILLES, type Famille, type FicheArticle } from './modele'

export interface FiltreCatalogue {
  /** Texte cherché dans le nom et la référence. */
  recherche: string
  /** Famille retenue ; `null` pour toutes. */
  famille: Famille | null
}

/**
 * Ramène un texte à une forme comparable : minuscules, sans accents. Ainsi
 * « fenetre » trouve « Fenêtre ». `normalize('NFD')` sépare chaque lettre de
 * son accent, que l'expression régulière retire ensuite.
 */
function simplifier(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('fr')
    .trim()
}

/** Les articles qui correspondent au filtre, dans leur ordre d'origine. */
export function filtrerCatalogue(
  articles: FicheArticle[],
  filtre: FiltreCatalogue,
): FicheArticle[] {
  const cherche = simplifier(filtre.recherche)
  return articles.filter(
    (a) =>
      (filtre.famille === null || a.famille === filtre.famille) &&
      (cherche === '' ||
        simplifier(a.nom).includes(cherche) ||
        simplifier(a.reference ?? '').includes(cherche)),
  )
}

/** Nombre d'articles par famille, pour les boutons de filtre ; 0 pour une famille vide. */
export function compterParFamille(articles: FicheArticle[]): Map<Famille, number> {
  const comptes = new Map<Famille, number>(FAMILLES.map((f) => [f, 0]))
  for (const a of articles) comptes.set(a.famille, (comptes.get(a.famille) ?? 0) + 1)
  return comptes
}

/**
 * Recherche de la saisie express (capture 03) : le texte est cherché dans le
 * nom, la référence et la famille, sans tenir compte des accents ni de la
 * casse. Un texte vide rend tout le catalogue.
 */
export function chercherArticles(articles: FicheArticle[], texte: string): FicheArticle[] {
  const cherche = simplifier(texte)
  if (cherche === '') return articles
  return articles.filter((a) =>
    [a.nom, a.reference ?? '', a.famille].some((champ) => simplifier(champ).includes(cherche)),
  )
}
