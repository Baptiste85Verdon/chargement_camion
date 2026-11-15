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
import { estActif } from '@/domaine/modele'
import { ligneModifiee } from '@/domaine/saisie-commande'
import type {
  AEnregistrer,
  CommandeAvecLignes,
  Depot,
  DepotArchivable,
  Depots,
  PlanAvecPlacements,
} from './depots'
import { ErreurDonnees } from './erreurs'

/** Le contenu initial, par exemple les données de démarrage. */
export interface ContenuInitial {
  articles?: FicheArticle[]
  camions?: ModeleCamion[]
  tournees?: Tournee[]
  commandes?: Commande[]
  lignes?: LigneDeCommande[]
  attente?: ElementAttente[]
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
  const attente = indexer(initial.attente)

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

  /**
   * Ajoute l'archivage à un référentiel simple. `avantArchivage` rejette si
   * l'élément ne peut pas être archivé.
   */
  function archivable<T extends { id: string; archiveLe?: string }>(
    table: Map<string, T>,
    depot: Depot<T>,
    avantArchivage?: (id: string) => void,
  ): DepotArchivable<T> {
    return {
      ...depot,
      async lister(options = {}) {
        const tous = await depot.lister()
        return options.avecArchives ? tous : tous.filter(estActif)
      },
      async archiver(id) {
        const element = table.get(id)
        if (!element) throw new ErreurDonnees('introuvable')
        if (!estActif(element)) return
        avantArchivage?.(id)
        table.set(id, { ...element, archiveLe: new Date().toISOString() })
      },
      async reactiver(id) {
        const element = table.get(id)
        if (!element) throw new ErreurDonnees('introuvable')
        if (estActif(element)) return
        const reactive: T = { ...element }
        delete reactive.archiveLe
        // Même règle d'unicité qu'à l'enregistrement (index sur les actifs).
        await depot.enregistrer(reactive)
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
    articles: archivable(
      articles,
      depotSimple(articles, {
        trier: parNom,
        verifier(article) {
          // Index unique sur la référence, parmi les articles actifs seulement ;
          // plusieurs articles peuvent ne pas en avoir.
          const pris = [...articles.values()].some(
            (a) =>
              a.id !== article.id &&
              estActif(a) &&
              estActif(article) &&
              article.reference &&
              a.reference === article.reference,
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
    ),

    camions: archivable(
      camions,
      depotSimple(camions, {
        trier: parNom,
        avantSuppression(id) {
          // ON DELETE RESTRICT depuis tournee.
          if ([...tournees.values()].some((t) => t.modeleCamionId === id)) {
            throw new ErreurDonnees('utilise')
          }
        },
      }),
      (id) => {
        // Déclencheur modele_camion_archivage (RG-21).
        const enCours = [...tournees.values()].some(
          (t) => t.modeleCamionId === id && t.statut !== 'chargee',
        )
        if (enCours) throw new ErreurDonnees('utilise', 'camion')
      },
    ),

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
      async listerParArticle(articleId) {
        const ids = new Set(
          [...lignes.values()].filter((l) => l.articleId === articleId).map((l) => l.commandeId),
        )
        return [...commandes.values()].filter((c) => ids.has(c.id)).map(avecLignes)
      },
      async obtenir(id) {
        const commande = commandes.get(id)
        return commande ? avecLignes(commande) : null
      },
      // Même règle que la fonction SQL enregistrer_commande : tout est
      // vérifié avant la première écriture, pour rester « tout ou rien ».
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
        if (commande.id !== undefined && !commandes.has(commande.id)) {
          throw new ErreurDonnees('introuvable')
        }
        const siennes = new Map(
          commande.id === undefined ? [] : lignesDe(commande.id).map((l) => [l.id, l]),
        )
        if (nouvellesLignes.some((l) => l.id !== undefined && !siennes.has(l.id))) {
          throw new ErreurDonnees('introuvable')
        }

        const enregistree = ecrire(commandes, commande)
        const gardees = new Set(nouvellesLignes.map((l) => l.id))
        for (const id of siennes.keys()) if (!gardees.has(id)) supprimerLigne(id)

        const lignesChangees: string[] = []
        for (const l of nouvellesLignes) {
          const avant = l.id === undefined ? undefined : siennes.get(l.id)
          const ecrite = ecrire(lignes, { ...l, commandeId: enregistree.id })
          if (!avant) {
            lignesChangees.push(ecrite.id)
          } else if (ligneModifiee(avant, l)) {
            for (const p of placements.values()) {
              if (p.ligneCommandeId === ecrite.id) placements.delete(p.id)
            }
            lignesChangees.push(ecrite.id)
          }
          // L'ordre de la liste devient l'ordre des lignes : on réinsère.
          lignes.delete(ecrite.id)
          lignes.set(ecrite.id, ecrite)
        }
        return { ...avecLignes(enregistree), lignesChangees }
      },
      async reordonner(tourneeId, commandeIds) {
        const siennes = [...commandes.values()].filter((c) => c.tourneeId === tourneeId)
        const complete =
          commandeIds.length === siennes.length &&
          new Set(commandeIds).size === commandeIds.length &&
          siennes.every((c) => commandeIds.includes(c.id))
        if (!complete) throw new ErreurDonnees('contrainte')
        commandeIds.forEach((id, i) => {
          const c = commandes.get(id)
          if (c) commandes.set(id, { ...c, rangLivraison: i + 1 })
        })
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
          aRecalculer: false,
        })
        const enregistres = nouveaux
          .map((p) => ecrire(placements, { ...p, planId: plan.id }))
          .sort((a, b) => a.rang - b.rang)
        return { plan, placements: enregistres }
      },
      async marquerARecalculer(planId) {
        const plan = plans.get(planId)
        if (!plan) throw new ErreurDonnees('introuvable')
        plans.set(planId, { ...plan, aRecalculer: true })
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
        return ecrire(attente, { ...element, reporteLe: new Date().toISOString() })
      },
      // Même règle que la fonction SQL affecter_element_attente.
      async affecter(elementId, tourneeId) {
        const element = attente.get(elementId)
        const tournee = tournees.get(tourneeId)
        const origine = element && commandes.get(element.commandeId)
        if (!element || !tournee || !origine) throw new ErreurDonnees('introuvable')
        if (tournee.statut !== 'enPreparation') throw new ErreurDonnees('contrainte')

        const dansLaTournee = [...commandes.values()].filter((c) => c.tourneeId === tourneeId)
        const rang = Math.max(0, ...dansLaTournee.map((c) => c.rangLivraison ?? 0)) + 1
        let cible: Commande
        if (element.ligneCommandeId === null) {
          cible = { ...origine, tourneeId, rangLivraison: rang }
          commandes.set(cible.id, cible)
        } else {
          cible =
            dansLaTournee.find((c) => c.numero === origine.numero) ??
            ecrire(commandes, {
              tourneeId,
              numero: origine.numero,
              destination: origine.destination,
              ...(origine.ville ? { ville: origine.ville } : {}),
              rangLivraison: rang,
            })
          const ligne = lignes.get(element.ligneCommandeId)
          if (ligne) {
            lignes.set(ligne.id, { ...ligne, commandeId: cible.id })
            for (const p of placements.values()) {
              if (p.ligneCommandeId === ligne.id) placements.delete(p.id)
            }
          }
        }
        attente.delete(elementId)
        return cible.id
      },
      // Mêmes règles que la fonction SQL reporter_articles : tout est vérifié
      // avant la première écriture, pour ne rien changer en cas de refus.
      async reporterArticles(tourneeId, reports, motif) {
        const tournee = tournees.get(tourneeId)
        if (!tournee) throw new ErreurDonnees('introuvable')
        if (tournee.statut !== 'enPreparation') throw new ErreurDonnees('contrainte')
        const verifies = reports.map((r) => {
          const ligne = lignes.get(r.ligneCommandeId)
          const commande = ligne && commandes.get(ligne.commandeId)
          if (!ligne || !commande || commande.tourneeId !== tourneeId) {
            throw new ErreurDonnees('introuvable')
          }
          if (r.quantite < 1 || r.quantite > ligne.quantite) throw new ErreurDonnees('contrainte')
          return { ligne, commande, quantite: r.quantite }
        })
        for (const { ligne, commande, quantite } of verifies) {
          let citee = ligne.id
          if (quantite < ligne.quantite) {
            lignes.set(ligne.id, { ...ligne, quantite: ligne.quantite - quantite })
            citee = ecrire(lignes, { ...copie(ligne), id: undefined, quantite }).id
            // Unités gardées : renumérotées 1, 2… dans chaque plan, sans bouger.
            const parPlan = new Map<string, PlacementEnregistre[]>()
            for (const p of placements.values()) {
              if (p.ligneCommandeId !== ligne.id) continue
              parPlan.set(p.planId, [...(parPlan.get(p.planId) ?? []), p])
            }
            for (const liste of parPlan.values()) {
              liste
                .sort((a, b) => a.numeroUnite - b.numeroUnite)
                .forEach((p, i) => placements.set(p.id, { ...p, numeroUnite: i + 1 }))
            }
          }
          ecrire(attente, {
            commandeId: commande.id,
            ligneCommandeId: citee,
            tourneeOrigineId: tourneeId,
            rangOrigine: commande.rangLivraison,
            motif,
            reporteLe: new Date().toISOString(),
          })
        }
      },
      // Mêmes règles que la fonction SQL reporter_commande.
      async reporterCommande(commandeId, motif) {
        const commande = commandes.get(commandeId)
        const tournee = commande?.tourneeId ? tournees.get(commande.tourneeId) : undefined
        if (!commande || !tournee || commande.rangLivraison === null) {
          throw new ErreurDonnees('introuvable')
        }
        if (tournee.statut !== 'enPreparation') throw new ErreurDonnees('contrainte')
        const rang = commande.rangLivraison
        for (const e of attente.values()) if (e.commandeId === commandeId) attente.delete(e.id)
        ecrire(attente, {
          commandeId,
          ligneCommandeId: null,
          tourneeOrigineId: tournee.id,
          rangOrigine: rang,
          motif,
          reporteLe: new Date().toISOString(),
        })
        commandes.set(commandeId, { ...commande, tourneeId: null, rangLivraison: null })
        for (const c of commandes.values()) {
          if (c.tourneeId === tournee.id && (c.rangLivraison ?? 0) > rang) {
            commandes.set(c.id, { ...c, rangLivraison: (c.rangLivraison ?? 0) - 1 })
          }
        }
        const dernier = [...plans.values()]
          .filter((p) => p.tourneeId === tournee.id)
          .sort((a, b) => b.version - a.version)[0]
        const siennes = new Set(lignesDe(commandeId).map((l) => l.id))
        if (
          dernier &&
          [...placements.values()].some(
            (p) => p.planId === dernier.id && siennes.has(p.ligneCommandeId),
          )
        ) {
          plans.set(dernier.id, { ...dernier, aRecalculer: true })
        }
      },
      async supprimer(id) {
        const element = attente.get(id)
        if (element?.ligneCommandeId === null) supprimerCommande(element.commandeId)
        attente.delete(id)
      },
    },
  }
}
