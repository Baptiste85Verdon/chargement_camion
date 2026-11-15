// Préparation d'une tournée (captures 01 et 02 ; CF 4.1 et 4.2).
//
// - `referenceSuivante` : la référence d'une nouvelle tournée (T-2026-119) ;
// - `deplacer` : l'ordre de livraison, changé aux flèches ou par glisser (RG-07) ;
// - `calculerPlan` : « Lancer le calcul », de la tournée enregistrée au plan à
//   enregistrer, en passant par `optimiser` (cahier technique, 4.4).
import type { Commande, FicheArticle, LigneDeCommande, PlacementEnregistre } from './modele'
import { optimiser } from './optimiser'
import type { Camion, UnitePreparee } from './types'
import { preparerUnites } from './unites'

/**
 * Référence d'une nouvelle tournée : celle qui suit la plus grande référence
 * « T-<année>-<n> » de l'année, sur trois chiffres. La base refuse de toute
 * façon un doublon (contrainte UNIQUE).
 */
export function referenceSuivante(references: string[], annee: number): string {
  const forme = new RegExp(`^T-${annee}-(\\d+)$`)
  const plusGrande = Math.max(0, ...references.map((r) => Number(forme.exec(r)?.[1] ?? 0)))
  return `T-${annee}-${String(plusGrande + 1).padStart(3, '0')}`
}

/**
 * Déplace l'élément d'indice `depuis` de `decalage` places (négatif : vers le
 * haut, livré plus tôt), sans sortir de la liste. Rend une nouvelle liste.
 */
export function deplacer<T>(liste: readonly T[], depuis: number, decalage: number): T[] {
  const copie = [...liste]
  const vers = Math.min(Math.max(depuis + decalage, 0), copie.length - 1)
  const [element] = copie.splice(depuis, 1)
  if (element === undefined) return [...liste]
  copie.splice(vers, 0, element)
  return copie
}

/** Un placement prêt à être enregistré avec une nouvelle version du plan. */
export type PlacementCalcule = Omit<PlacementEnregistre, 'id' | 'planId'>

/**
 * « Lancer le calcul » : éclate les commandes en unités (RG-02, RG-03),
 * cherche le meilleur plan (`optimiser`), puis traduit chaque placement en
 * placement enregistrable : ligne de commande, numéro d'unité, position,
 * orientation et rang de chargement, à faire. Les unités sans place sont
 * rendues à part (RG-10).
 */
export function calculerPlan(
  commandes: { commande: Commande; lignes: LigneDeCommande[] }[],
  catalogue: FicheArticle[],
  camion: Camion,
): { placements: PlacementCalcule[]; enTrop: UnitePreparee[] } {
  const unites = preparerUnites(
    commandes.map(({ commande, lignes }) => ({
      id: commande.id,
      rangLivraison: commande.rangLivraison ?? 0,
      lignes,
    })),
    catalogue,
  )
  const parId = new Map(unites.map((u) => [u.id, u]))
  const { placements, enTrop } = optimiser(unites, camion)
  return {
    placements: placements.map((p) => {
      const unite = parId.get(p.uniteId)
      if (!unite) throw new Error(`Unité inconnue : ${p.uniteId}`)
      return {
        ligneCommandeId: unite.ligneCommandeId,
        numeroUnite: unite.numero,
        x: p.x,
        y: p.y,
        z: p.z,
        orientation: p.orientation,
        rang: p.rang,
        statut: 'aFaire',
      }
    }),
    enTrop,
  }
}
