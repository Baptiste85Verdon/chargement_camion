// Dépôts en mémoire (cahier technique 7.1) : pour les tests et pour
// développer sans réseau. Ils imitent les règles de la base (migration
// `supabase/migrations/…_schema_initial.sql`) : valeurs uniques, suppressions
// refusées (RESTRICT) ou en cascade (CASCADE). Les tests de contrat
// (`tests/unitaires/depots-contrat.ts`) vérifient qu'ils se comportent comme
// l'implémentation Supabase.
//
// Chaque objet est copié à l'entrée et à la sortie : modifier un objet reçu
// ne modifie jamais ce qui est « enregistré », comme avec une vraie base.
import type {
  Commande,
  ElementAttente,
  FicheArticle,
  LigneDeCommande,
  ModeleCamion,
  PlacementEnregistre,
  PlanChargement,
  Tournee,
} from '@/domaine/modele'
import type { AEnregistrer, CommandeAvecLignes, Depot, Depots, PlanAvecPlacements } from './depots'
import { ErreurDonnees } from './erreurs'

/** Le contenu initial, par exemple les données de démarrage. */
export interface ContenuInitial {
  articles?: FicheArticle[]
  camions?: ModeleCamion[]
  tournees?: Tournee[]
  commandes?: Commande[]
  lignes?: LigneDeCommande[]
}

const copie = <T>(objet: T): T => structuredClone(objet)
const nouvelId = () => crypto.randomUUID()
const parNom = (a: { nom: string }, b: { nom: string }) => a.nom.localeCompare(b.nom, 'fr')

export function creerDepotsEnMemoire(initial: ContenuInitial = {}): Depots {
  // Les « tables » : une Map par table, indexée par identifiant.
  const indexer = <T extends { id: string }>(liste: T[] = []) =>
    new Map(liste.map((o) => [o.id, copie(o)]))
  const articles = indexer(initial.articles)
  const camions = indexer(initial.camions)
  const tournees = indexer(initial.tournees)
  const commandes = indexer(initial.commandes)
  const lignes = indexer(initial.lignes)
  const plans = new Map<string, PlanChargement>()
  const placements = new Map<string, PlacementEnregistre>()
  const attente = new Map<string, ElementAttente>()

  /** Crée ou remplace une ligne de table ; une modification d'un id inconnu est refusée. */
  function ecrire<T extends { id: string }>(table: Map<string, T>, objet: AEnregistrer<T>): T {
    if (objet.id !== undefined && !table.has(objet.id)) throw new ErreurDonnees('introuvable')
    const enregistre = { ...copie(objet), id: objet.id ?? nouvelId() } as T
    table.set(enregistre.id, enregistre)
    return copie(enregistre)
  }

  /** Un référentiel simple, avec une règle d'unicité et une règle de suppression. */
  function depotSimple<T extends { id: string }>(
    table: Map<string, T>,
    regles: {
      trier: (a: T, b: T) => number
      /** Rejette si l'objet entre en conflit avec un autre. */
      verifier?: (objet: AEnregistrer<T>) => void
      /** Rejette si l'objet ne peut pas être supprimé, ou supprime ce qui en dépend. */
      avantSuppression?: (id: string) => void
    },
  ): Depot<T> {
    return {
      async lister() {
        return [...table.values()].sort(regles.trier).map(copie)
      },
      async obtenir(id) {
        const objet = table.get(id)
        return objet ? copie(objet) : null
      },
      async enregistrer(objet) {
        regles.verifier?.(objet)
        return ecrire(table, objet)
      },
      async supprimer(id) {
        regles.avantSuppression?.(id)
        table.delete(id)
      },
    }
  }

  // --- Suppressions en cascade, comme ON DELETE CASCADE dans la base ---------

  function supprimerPlan(planId: string) {
    plans.delete(planId)
    for (const p of placements.values()) if (p.planId === planId) placements.delete(p.id)
  }

  function supprimerLigne(ligneId: string) {
    lignes.delete(ligneId)
    for (const p of placements.values()) if (p.ligneCommandeId === ligneId) placements.delete(p.id)
    for (const e of attente.values()) if (e.ligneCommandeId === ligneId) attente.delete(e.id)
  }

  function supprimerCommande(commandeId: string) {
    commandes.delete(commandeId)
    for (const l of lignes.values()) if (l.commandeId === commandeId) supprimerLigne(l.id)
    for (const e of attente.values()) if (e.commandeId === commandeId) attente.delete(e.id)
  }

  const lignesDe = (commandeId: string) =>
    [...lignes.values()].filter((l) => l.commandeId === commandeId).map(copie)

  const avecLignes = (commande: Commande): CommandeAvecLignes => ({
    commande: copie(commande),
    lignes: lignesDe(commande.id),
  })

  const parRang = (a: CommandeAvecLignes, b: CommandeAvecLignes) =>
    (a.commande.rangLivraison ?? 0) - (b.commande.rangLivraison ?? 0)

  return {
    articles: depotSimple(articles, {
      trier: parNom,
      verifier(article) {
        // UNIQUE (reference) ; plusieurs articles peuvent ne pas en avoir.
        const pris = [...articles.values()].some(
          (a) => a.id !== article.id && article.reference && a.reference === article.reference,
        )
        if (pris) throw new ErreurDonnees('doublon', 'reference')
      },
      avantSuppression(id) {
        // ON DELETE RESTRICT depuis ligne_commande.
        if ([...lignes.values()].some((l) => l.articleId === id)) {
          throw new ErreurDonnees('utilise')
        }
      },
    }),

    camions: depotSimple(camions, {
      trier: parNom,
      avantSuppression(id) {
        // ON DELETE RESTRICT depuis tournee.
        if ([...tournees.values()].some((t) => t.modeleCamionId === id)) {
          throw new ErreurDonnees('utilise')
        }
      },
    }),

    tournees: depotSimple(tournees, {
      // Les plus récentes d'abord ; une tournée sans date (à fixer) en tête.
      trier: (a, b) =>
        (b.date ?? '9999').localeCompare(a.date ?? '9999') ||
        b.reference.localeCompare(a.reference),
      verifier(tournee) {
        const prise = [...tournees.values()].some(
          (t) => t.id !== tournee.id && t.reference === tournee.reference,
        )
        if (prise) throw new ErreurDonnees('doublon', 'reference')
        if (tournee.modeleCamionId && !camions.has(tournee.modeleCamionId)) {
          throw new ErreurDonnees('introuvable', 'modeleCamionId')
        }
      },
      avantSuppression(id) {
        for (const c of commandes.values()) if (c.tourneeId === id) supprimerCommande(c.id)
        for (const p of plans.values()) if (p.tourneeId === id) supprimerPlan(p.id)
        // ON DELETE SET NULL depuis element_attente.
        for (const e of attente.values()) {
          if (e.tourneeOrigineId === id) attente.set(e.id, { ...e, tourneeOrigineId: null })
        }
      },
    }),

    commandes: {
      async listerParTournee(tourneeId) {
        return [...commandes.values()]
          .filter((c) => c.tourneeId === tourneeId)
          .map(avecLignes)
          .sort(parRang)
      },
      async listerSansTournee() {
        return [...commandes.values()].filter((c) => c.tourneeId === null).map(avecLignes)
      },
      async obtenir(id) {
        const commande = commandes.get(id)
        return commande ? avecLignes(commande) : null
      },
      async enregistrer(commande, nouvellesLignes) {
        // UNIQUE (tournee_id, numero) : seulement dans une même tournée.
        const doublon = [...commandes.values()].some(
          (c) =>
            c.id !== commande.id &&
            commande.tourneeId !== null &&
            c.tourneeId === commande.tourneeId &&
            c.numero === commande.numero,
        )
        if (doublon) throw new ErreurDonnees('doublon', 'numero')
        if (nouvellesLignes.some((l) => !articles.has(l.articleId))) {
          throw new ErreurDonnees('introuvable', 'articleId')
        }

        const enregistree = ecrire(commandes, commande)
        for (const l of lignesDe(enregistree.id)) supprimerLigne(l.id)
        for (const l of nouvellesLignes) {
          ecrire(lignes, { ...l, id: undefined, commandeId: enregistree.id })
        }
        return avecLignes(enregistree)
      },
      async supprimer(id) {
        supprimerCommande(id)
      },
    },

    plans: {
      async listerVersions(tourneeId) {
        return [...plans.values()]
          .filter((p) => p.tourneeId === tourneeId)
          .sort((a, b) => a.version - b.version)
          .map(copie)
      },
      async obtenirDernier(tourneeId) {
        const versions = await this.listerVersions(tourneeId)
        const plan = versions.at(-1)
        if (!plan) return null
        return {
          plan,
          placements: [...placements.values()]
            .filter((p) => p.planId === plan.id)
            .sort((a, b) => a.rang - b.rang)
            .map(copie),
        }
      },
      async enregistrerVersion(tourneeId, nouveaux): Promise<PlanAvecPlacements> {
        if (!tournees.has(tourneeId)) throw new ErreurDonnees('introuvable')
        const versions = [...plans.values()].filter((p) => p.tourneeId === tourneeId)
        const plan = ecrire(plans, {
          tourneeId,
          version: Math.max(0, ...versions.map((p) => p.version)) + 1,
          calculeLe: new Date().toISOString(),
        })
        const enregistres = nouveaux
          .map((p) => ecrire(placements, { ...p, planId: plan.id }))
          .sort((a, b) => a.rang - b.rang)
        return { plan, placements: enregistres }
      },
      async changerStatutPlacement(placementId, statut) {
        const placement = placements.get(placementId)
        if (!placement) throw new ErreurDonnees('introuvable')
        placements.set(placementId, { ...placement, statut })
      },
      async supprimer(planId) {
        supprimerPlan(planId)
      },
    },

    attente: {
      async lister() {
        return [...attente.values()].map(copie)
      },
      async ajouter(element) {
        if (!commandes.has(element.commandeId)) throw new ErreurDonnees('introuvable')
        return ecrire(attente, { ...element, id: undefined })
      },
      async supprimer(id) {
        attente.delete(id)
      },
    },
  }
}
