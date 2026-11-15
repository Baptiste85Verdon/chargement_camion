// Préparation d'une tournée (captures 01 et 02 ; CF 4.1 et 4.2).
//
// - `referenceSuivante` : la référence d'une nouvelle tournée (T-2026-119) ;
// - `deplacer` : l'ordre de livraison, changé aux flèches ou par glisser (RG-07) ;
// - `calculerPlan` : « Lancer le calcul », de la tournée enregistrée au plan à
//   enregistrer, en passant par `optimiser` (cahier technique, 4.4) ;
// - `lirePlan` : le chemin inverse, du plan enregistré aux unités et aux
//   placements que dessinent les vues (cahier technique, 5).
import type { Commande, FicheArticle, LigneDeCommande, PlacementEnregistre } from './modele'
import { optimiser } from './optimiser'
import type { Camion, Placement, UnitePreparee } from './types'
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

/** Les commandes d'une tournée, avec leurs lignes, telles que les rend le dépôt. */
type CommandesTournee = { commande: Commande; lignes: LigneDeCommande[] }[]

/** Éclate les commandes de la tournée en unités (RG-02, RG-03). */
function unitesDeTournee(commandes: CommandesTournee, catalogue: FicheArticle[]): UnitePreparee[] {
  return preparerUnites(
    commandes.map(({ commande, lignes }) => ({
      id: commande.id,
      rangLivraison: commande.rangLivraison ?? 0,
      lignes,
    })),
    catalogue,
  )
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
  commandes: CommandesTournee,
  catalogue: FicheArticle[],
  camion: Camion,
): { placements: PlacementCalcule[]; enTrop: UnitePreparee[] } {
  const unites = unitesDeTournee(commandes, catalogue)
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

/**
 * Relit un plan enregistré : les unités de la tournée, éclatées comme pour le
 * calcul, et la position de chacune. Un placement enregistré désigne son
 * unité par sa ligne et son numéro ; l'identifiant de l'unité est justement
 * `<ligne>-<numéro>` (voir `preparerUnites`).
 *
 * - `placements` : dans l'ordre de chargement (rang croissant) ;
 * - `aPlacer` : les unités sans position, en trop ou dont la ligne a changé
 *   depuis le calcul (RG-10, zone « Articles à placer », 5.7) ;
 * - un placement qui ne correspond plus à aucune unité (ligne supprimée,
 *   quantité réduite) est ignoré.
 */
export function lirePlan(
  commandes: CommandesTournee,
  catalogue: FicheArticle[],
  enregistres: PlacementEnregistre[],
): { unites: UnitePreparee[]; placements: Placement[]; aPlacer: UnitePreparee[] } {
  const unites = unitesDeTournee(commandes, catalogue)
  const ids = new Set(unites.map((u) => u.id))
  const placements = enregistres
    .map((p) => ({
      uniteId: `${p.ligneCommandeId}-${p.numeroUnite}`,
      x: p.x,
      y: p.y,
      z: p.z,
      orientation: p.orientation,
      rang: p.rang,
    }))
    .filter((p) => ids.has(p.uniteId))
    .sort((a, b) => a.rang - b.rang)
  const places = new Set(placements.map((p) => p.uniteId))
  return { unites, placements, aPlacer: unites.filter((u) => !places.has(u.id)) }
}
