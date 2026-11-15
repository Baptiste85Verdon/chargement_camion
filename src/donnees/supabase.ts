// Dépôts Supabase (cahier technique 7.1 et 7.2) : le seul fichier de
// l'application, avec `client-supabase.ts`, qui parle à Supabase.
//
// Chaque appel renvoie `{ data, error }` au lieu de lever une exception.
// `resultat()` transforme cette paire : il rend `data`, ou lève une
// `ErreurDonnees` traduite (jamais l'erreur brute de la base).
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AEnregistrer,
  CommandeAvecLignes,
  CommandeRepository,
  Depot,
  Depots,
  ElementAttenteRepository,
  PlanRepository,
} from './depots'
import { ErreurDonnees, traduireErreur, type ErreurPostgrest } from './erreurs'
import {
  articleDepuisLigne,
  articleVersLigne,
  camionDepuisLigne,
  camionVersLigne,
  commandeDepuisLigne,
  commandeVersLigne,
  elementAttenteDepuisLigne,
  elementAttenteVersLigne,
  ligneCommandeDepuisLigne,
  ligneCommandeVersLigne,
  placementDepuisLigne,
  placementVersLigne,
  planDepuisLigne,
  statutPlacement,
  tourneeDepuisLigne,
  tourneeVersLigne,
  type LigneCommandeBase,
  type LigneElementAttente,
  type LigneLigneCommande,
  type LignePlacement,
  type LignePlan,
} from './supabase-lignes'

/** Ce que renvoie toute requête supabase-js. */
interface Reponse<T> {
  data: T | null
  error: ErreurPostgrest | null
}

/** Rend les données, ou lève l'erreur traduite. */
function resultat<T>({ data, error }: Reponse<T>): T {
  if (error) throw traduireErreur(error)
  if (data === null) throw new ErreurDonnees('introuvable')
  return data
}

/** Pour une requête sans données en retour (suppression). */
function verifier({ error }: { error: ErreurPostgrest | null }): void {
  if (error) throw traduireErreur(error)
}

/** Un tri : colonne, sens, et place des valeurs vides. */
interface Tri {
  colonne: string
  ascendant: boolean
  videsEnPremier?: boolean
}

/**
 * Un référentiel simple : une table, ses deux conversions et son ordre.
 * `enregistrer` fait un INSERT sans `id`, un UPDATE avec.
 */
function depotTable<T extends { id: string }, L>(
  client: SupabaseClient,
  table: string,
  depuis: (ligne: L) => T,
  vers: (objet: AEnregistrer<T>) => object,
  tris: Tri[],
): Depot<T> {
  return {
    async lister() {
      let requete = client.from(table).select('*')
      for (const tri of tris) {
        requete = requete.order(tri.colonne, {
          ascending: tri.ascendant,
          nullsFirst: tri.videsEnPremier ?? false,
        })
      }
      return resultat<L[]>(await requete).map(depuis)
    },

    async obtenir(id) {
      const reponse = await client.from(table).select('*').eq('id', id).maybeSingle()
      if (reponse.error) throw traduireErreur(reponse.error)
      return reponse.data ? depuis(reponse.data as L) : null
    },

    async enregistrer(objet) {
      const ligne = vers(objet)
      const requete =
        objet.id === undefined
          ? client.from(table).insert(ligne)
          : client.from(table).update(ligne).eq('id', objet.id)
      // `.single()` : exactement une ligne attendue, sinon PGRST116 (introuvable).
      return depuis(resultat<L>(await requete.select().single()))
    },

    async supprimer(id) {
      verifier(await client.from(table).delete().eq('id', id))
    },
  }
}

// --- Commandes -------------------------------------------------------------------

/** Une commande lue avec ses lignes, grâce à la relation `ligne_commande`. */
type LigneCommandeAvecLignes = LigneCommandeBase & { ligne_commande: LigneLigneCommande[] }

/** Sélection d'une commande et de ses lignes en une seule requête. */
const COMMANDE_AVEC_LIGNES = '*, ligne_commande(*)'

function commandeAvecLignes(ligne: LigneCommandeAvecLignes): CommandeAvecLignes {
  return {
    commande: commandeDepuisLigne(ligne),
    lignes: [...ligne.ligne_commande]
      .sort((a, b) => a.numero_ligne - b.numero_ligne)
      .map(ligneCommandeDepuisLigne),
  }
}

function depotCommandes(client: SupabaseClient): CommandeRepository {
  return {
    async listerParTournee(tourneeId) {
      const lignes = resultat<LigneCommandeAvecLignes[]>(
        await client
          .from('commande')
          .select(COMMANDE_AVEC_LIGNES)
          .eq('tournee_id', tourneeId)
          .order('rang_livraison', { ascending: true }),
      )
      return lignes.map(commandeAvecLignes)
    },

    async listerSansTournee() {
      const lignes = resultat<LigneCommandeAvecLignes[]>(
        await client
          .from('commande')
          .select(COMMANDE_AVEC_LIGNES)
          .is('tournee_id', null)
          .order('cree_le', { ascending: true }),
      )
      return lignes.map(commandeAvecLignes)
    },

    async obtenir(id) {
      const reponse = await client
        .from('commande')
        .select(COMMANDE_AVEC_LIGNES)
        .eq('id', id)
        .maybeSingle()
      if (reponse.error) throw traduireErreur(reponse.error)
      return reponse.data ? commandeAvecLignes(reponse.data as LigneCommandeAvecLignes) : null
    },

    /**
     * Trois requêtes : la commande, la suppression de ses anciennes lignes,
     * l'insertion des nouvelles. Elles ne forment pas une transaction : si la
     * dernière échoue, la commande reste sans lignes et l'erreur est remontée.
     * Remplacer les lignes supprime aussi les placements qui les citaient :
     * une commande modifiée demande un nouveau calcul du plan.
     */
    async enregistrer(commande, lignes) {
      const ligneCommande: Record<string, unknown> = commandeVersLigne(commande)
      const requete =
        commande.id === undefined
          ? client.from('commande').insert(ligneCommande)
          : client.from('commande').update(ligneCommande).eq('id', commande.id)
      const enregistree = commandeDepuisLigne(
        resultat<LigneCommandeBase>(await requete.select().single()),
      )

      verifier(await client.from('ligne_commande').delete().eq('commande_id', enregistree.id))
      if (lignes.length === 0) return { commande: enregistree, lignes: [] }

      const inserees = resultat<LigneLigneCommande[]>(
        await client
          .from('ligne_commande')
          .insert(lignes.map((l, i) => ligneCommandeVersLigne(l, enregistree.id, i + 1)))
          .select(),
      )
      return {
        commande: enregistree,
        lignes: inserees
          .sort((a, b) => a.numero_ligne - b.numero_ligne)
          .map(ligneCommandeDepuisLigne),
      }
    },

    async supprimer(id) {
      verifier(await client.from('commande').delete().eq('id', id))
    },
  }
}

// --- Plans -------------------------------------------------------------------------

function depotPlans(client: SupabaseClient): PlanRepository {
  async function listerVersions(tourneeId: string) {
    const lignes = resultat<LignePlan[]>(
      await client
        .from('plan_chargement')
        .select('*')
        .eq('tournee_id', tourneeId)
        .order('version', { ascending: true }),
    )
    return lignes.map(planDepuisLigne)
  }

  return {
    listerVersions,

    async obtenirDernier(tourneeId) {
      const plan = (await listerVersions(tourneeId)).at(-1)
      if (!plan) return null
      const placements = resultat<LignePlacement[]>(
        await client
          .from('placement')
          .select('*')
          .eq('plan_id', plan.id)
          .order('rang', { ascending: true }),
      )
      return { plan, placements: placements.map(placementDepuisLigne) }
    },

    /**
     * Le numéro de version suit le plus grand existant. Deux calculs
     * simultanés de la même tournée heurteraient la contrainte UNIQUE
     * (tournee_id, version) : le second est refusé, sans rien écraser.
     */
    async enregistrerVersion(tourneeId, placements) {
      const versions = await listerVersions(tourneeId)
      const version = Math.max(0, ...versions.map((p) => p.version)) + 1
      const plan = planDepuisLigne(
        resultat<LignePlan>(
          await client
            .from('plan_chargement')
            .insert({ tournee_id: tourneeId, version })
            .select()
            .single(),
        ),
      )
      if (placements.length === 0) return { plan, placements: [] }

      const inseres = resultat<LignePlacement[]>(
        await client
          .from('placement')
          .insert(placements.map((p) => placementVersLigne(p, plan.id)))
          .select(),
      )
      return {
        plan,
        placements: inseres.sort((a, b) => a.rang - b.rang).map(placementDepuisLigne),
      }
    },

    async changerStatutPlacement(placementId, statut) {
      resultat(
        await client
          .from('placement')
          .update({ statut: statutPlacement.versBase(statut) })
          .eq('id', placementId)
          .select('id')
          .single(),
      )
    },

    async supprimer(planId) {
      verifier(await client.from('plan_chargement').delete().eq('id', planId))
    },
  }
}

// --- Liste d'attente ----------------------------------------------------------------

function depotAttente(client: SupabaseClient): ElementAttenteRepository {
  return {
    async lister() {
      const lignes = resultat<LigneElementAttente[]>(
        await client.from('element_attente').select('*').order('cree_le', { ascending: true }),
      )
      return lignes.map(elementAttenteDepuisLigne)
    },
    async ajouter(element) {
      return elementAttenteDepuisLigne(
        resultat<LigneElementAttente>(
          await client
            .from('element_attente')
            .insert(elementAttenteVersLigne(element))
            .select()
            .single(),
        ),
      )
    },
    async supprimer(id) {
      verifier(await client.from('element_attente').delete().eq('id', id))
    },
  }
}

// --- Fabrique ----------------------------------------------------------------------

/**
 * Les dépôts de l'application, branchés sur un client Supabase. Les types
 * des objets se déduisent des fonctions de conversion passées à `depotTable`.
 */
export function creerDepotsSupabase(client: SupabaseClient): Depots {
  return {
    articles: depotTable(client, 'article', articleDepuisLigne, articleVersLigne, [
      { colonne: 'nom', ascendant: true },
    ]),
    camions: depotTable(client, 'modele_camion', camionDepuisLigne, camionVersLigne, [
      { colonne: 'nom', ascendant: true },
    ]),
    tournees: depotTable(client, 'tournee', tourneeDepuisLigne, tourneeVersLigne, [
      // Les plus récentes d'abord ; une tournée sans date (à fixer) en tête.
      { colonne: 'date_livraison', ascendant: false, videsEnPremier: true },
      { colonne: 'reference', ascendant: false },
    ]),
    commandes: depotCommandes(client),
    plans: depotPlans(client),
    attente: depotAttente(client),
  }
}
