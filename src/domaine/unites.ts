// Préparation des unités (cahier technique, 4.3, étape 1) : chaque ligne de
// commande devient autant d'unités physiques que sa quantité, avec ses
// dimensions et son poids effectifs.
import type { Article, CommandeAPlacer, Dimensions, LigneCommande, UnitePreparee } from './types'

/**
 * Dimensions effectives d'une ligne (RG-02, RG-03) : celles de la commande si
 * elles existent ; sinon celles du catalogue, nues si la ligne est livrée nue
 * et que l'article a une taille nue, emballées dans tous les autres cas. La
 * taille emballée est la plus grande : c'est la taille retenue par défaut.
 */
function dimensionsEffectives(ligne: LigneCommande, article: Article): Dimensions {
  if (ligne.dimsPropres) return { ...ligne.dimsPropres }
  if (ligne.nu && article.dimsNues) return { ...article.dimsNues }
  return { ...article.dimsEmballees }
}

/** Poids effectif : celui de la ligne s'il existe, sinon celui du catalogue (RG-03). */
function poidsEffectif(ligne: LigneCommande, article: Article): number {
  return ligne.poidsPropre ?? article.poids
}

/**
 * Éclate les commandes en unités, dans l'ordre des commandes et des lignes.
 * L'identifiant d'une unité est celui de sa ligne suivi de son numéro : `L1-2`.
 * Les objets reçus ne sont jamais modifiés.
 */
export function preparerUnites(commandes: CommandeAPlacer[], articles: Article[]): UnitePreparee[] {
  const parId = new Map(articles.map((a) => [a.id, a]))
  const unites: UnitePreparee[] = []
  for (const commande of commandes) {
    for (const ligne of commande.lignes) {
      const article = parId.get(ligne.articleId)
      if (!article) throw new Error(`Article inconnu : ${ligne.articleId}`)
      for (let numero = 1; numero <= ligne.quantite; numero++) {
        unites.push({
          id: `${ligne.id}-${numero}`,
          commandeId: commande.id,
          ligneCommandeId: ligne.id,
          numero,
          commandeRang: commande.rangLivraison,
          dims: dimensionsEffectives(ligne, article),
          poids: poidsEffectif(ligne, article),
          fragile: article.fragile,
          porteur: article.porteur,
          orientations: [...article.orientations],
        })
      }
    }
  }
  return unites
}
