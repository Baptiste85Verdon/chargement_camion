// Préparation d'une tournée (captures 01 et 02 ; CF 4.1 et 4.2).
//
// - `referenceSuivante` : la référence d'une nouvelle tournée (T-2026-119) ;
// - `deplacer` : l'ordre de livraison, changé aux flèches ou par glisser (RG-07) ;
// - `calculerPlan` : « Lancer le calcul », de la tournée enregistrée au plan à
//   enregistrer, en passant par `optimiser` (cahier technique, 4.4) ;
// - `lirePlan` : le chemin inverse, du plan enregistré aux unités et aux
//   placements que dessinent les vues (cahier technique, 5) ;
// - `lignesReportees` et `regrouperParLigne` : le report en liste d'attente
//   (RG-11). Une ligne reportée reste dans sa commande d'origine jusqu'à son
//   affectation à une autre tournée : le calcul et la relecture l'ignorent.
import type {
  Commande,
  ElementAttente,
  FicheArticle,
  LigneDeCommande,
  PlacementEnregistre,
} from './modele'
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

/** Identifiants des lignes de commande en attente, reportées seules (RG-11). */
export type LignesReportees = ReadonlySet<string>

const AUCUNE: LignesReportees = new Set()

/**
 * Éclate les commandes de la tournée en unités (RG-02, RG-03), sans les
 * lignes reportées en liste d'attente (RG-11).
 */
function unitesDeTournee(
  commandes: CommandesTournee,
  catalogue: FicheArticle[],
  reportees: LignesReportees,
): UnitePreparee[] {
  return preparerUnites(
    commandes.map(({ commande, lignes }) => ({
      id: commande.id,
      rangLivraison: commande.rangLivraison ?? 0,
      lignes: lignes.filter((l) => !reportees.has(l.id)),
    })),
    catalogue,
  )
}

/**
 * Les lignes reportées seules : celles que cite un élément en attente. Un
 * élément sans ligne est une commande entière, déjà sortie de la tournée.
 */
export function lignesReportees(elements: ElementAttente[]): Set<string> {
  return new Set(elements.flatMap((e) => (e.ligneCommandeId ? [e.ligneCommandeId] : [])))
}

/** Ce qu'il faut reporter d'une ligne : un nombre d'unités. */
export interface ReportLigne {
  ligneCommandeId: string
  commandeId: string
  quantite: number
}

/**
 * « Reporter les articles en trop » (RG-11) : compte les unités de chaque
 * ligne, dans l'ordre où les lignes apparaissent. Les unités d'une ligne sont
 * identiques : seul leur nombre compte. Si une ligne est reportée en partie,
 * la base la scinde en deux (fonction SQL `reporter_articles`).
 */
export function regrouperParLigne(unites: UnitePreparee[]): ReportLigne[] {
  const parLigne = new Map<string, ReportLigne>()
  for (const u of unites) {
    const report = parLigne.get(u.ligneCommandeId)
    if (report) report.quantite += 1
    else
      parLigne.set(u.ligneCommandeId, {
        ligneCommandeId: u.ligneCommandeId,
        commandeId: u.commandeId,
        quantite: 1,
      })
  }
  return [...parLigne.values()]
}

/** Un placement prêt à être enregistré avec une nouvelle version du plan. */
export type PlacementCalcule = Omit<PlacementEnregistre, 'id' | 'planId'>

/**
 * « Lancer le calcul » : éclate les commandes en unités (RG-02, RG-03),
 * cherche le meilleur plan (`optimiser`), puis traduit chaque placement en
 * placement enregistrable : ligne de commande, numéro d'unité, position,
 * orientation et rang de chargement, à faire. Les unités sans place sont
 * rendues à part (RG-10). Les lignes reportées en liste d'attente sont
 * ignorées (RG-11).
 */
export function calculerPlan(
  commandes: CommandesTournee,
  catalogue: FicheArticle[],
  camion: Camion,
  reportees: LignesReportees = AUCUNE,
): { placements: PlacementCalcule[]; enTrop: UnitePreparee[] } {
  const unites = unitesDeTournee(commandes, catalogue, reportees)
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
 *   quantité réduite, ligne reportée en liste d'attente) est ignoré.
 */
export function lirePlan(
  commandes: CommandesTournee,
  catalogue: FicheArticle[],
  enregistres: PlacementEnregistre[],
  reportees: LignesReportees = AUCUNE,
): { unites: UnitePreparee[]; placements: Placement[]; aPlacer: UnitePreparee[] } {
  const unites = unitesDeTournee(commandes, catalogue, reportees)
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

/**
 * Placement de la disposition ajustée à la main : avec `id`, un placement
 * déjà enregistré, gardé ; sans `id`, une unité remise depuis la zone
 * « Articles à placer ».
 */
export type PlacementAjuste = PlacementCalcule & { id?: string }

/**
 * Traduit un plan ajusté à la main (cahier technique 5.18) en disposition à
 * enregistrer, l'inverse de `lirePlan`. Chaque unité retrouve son placement
 * enregistré par sa ligne et son numéro :
 * - trouvé : il garde son identifiant et son statut ; seuls sa position, son
 *   orientation et son rang changent ;
 * - pas trouvé : l'unité est remise depuis la zone, son placement est nouveau
 *   et reste à faire.
 * Une unité absente du plan (retirée vers la zone) n'apparaît pas : le dépôt
 * supprime son placement.
 */
export function dispositionAjustee(
  plan: Placement[],
  enregistres: PlacementEnregistre[],
  unites: UnitePreparee[],
): PlacementAjuste[] {
  const parUnite = new Map(enregistres.map((e) => [`${e.ligneCommandeId}-${e.numeroUnite}`, e]))
  const parId = new Map(unites.map((u) => [u.id, u]))
  return plan.map((p) => {
    const unite = parId.get(p.uniteId)
    if (!unite) throw new Error(`Unité inconnue : ${p.uniteId}`)
    const deja = parUnite.get(p.uniteId)
    const place = {
      ligneCommandeId: unite.ligneCommandeId,
      numeroUnite: unite.numero,
      x: p.x,
      y: p.y,
      z: p.z,
      orientation: p.orientation,
      rang: p.rang,
    }
    return deja ? { id: deja.id, ...place, statut: deja.statut } : { ...place, statut: 'aFaire' }
  })
}
