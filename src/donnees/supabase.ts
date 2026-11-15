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
  DepotArchivable,
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
  ligneCommandePourEnregistrement,
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

/**
 * Ajoute l'archivage (RG-21) à un référentiel : `lister` ne rend que les
 * lignes dont `archive_le` est vide, sauf `avecArchives`.
 */
function archivable<T extends { id: string; archiveLe?: string }, L>(
  client: SupabaseClient,
  table: string,
  depot: Depot<T>,
  depuis: (ligne: L) => T,
  tris: Tri[],
): DepotArchivable<T> {
  return {
    ...depot,
    async lister(options = {}) {
      if (options.avecArchives) return depot.lister()
      let requete = client.from(table).select('*').is('archive_le', null)
      for (const tri of tris) {
        requete = requete.order(tri.colonne, {
          ascending: tri.ascendant,
          nullsFirst: tri.videsEnPremier ?? false,
        })
      }
      return resultat<L[]>(await requete).map(depuis)
    },
    async archiver(id) {
      const element = await depot.obtenir(id)
      if (!element) throw new ErreurDonnees('introuvable')
      if (element.archiveLe !== undefined) return
      // Pour un camion, le déclencheur modele_camion_archivage peut refuser.
      verifier(
        await client.from(table).update({ archive_le: new Date().toISOString() }).eq('id', id),
      )
    },
    async reactiver(id) {
      const element = await depot.obtenir(id)
      if (!element) throw new ErreurDonnees('introuvable')
      if (element.archiveLe === undefined) return
      // Pour un article, l'index unique article_reference_actif_key refuse
      // une référence reprise entre-temps : erreur 23505, traduite en doublon.
      verifier(await client.from(table).update({ archive_le: null }).eq('id', id))
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

    /**
     * Deux requêtes : les commandes qui citent l'article, puis ces commandes
     * avec toutes leurs lignes (filtrer directement la relation ne rendrait
     * que les lignes de l'article).
     */
    async listerParArticle(articleId) {
      const citees = resultat<{ commande_id: string }[]>(
        await client.from('ligne_commande').select('commande_id').eq('article_id', articleId),
      )
      const ids = [...new Set(citees.map((l) => l.commande_id))]
      if (ids.length === 0) return []
      const lignes = resultat<LigneCommandeAvecLignes[]>(
        await client
          .from('commande')
          .select(COMMANDE_AVEC_LIGNES)
          .in('id', ids)
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
     * Une seule requête : la fonction SQL `enregistrer_commande` (migration
     * …_commandes_tout_ou_rien.sql) fait tout dans une transaction. Si une
     * étape échoue, rien n'est enregistré.
     */
    async enregistrer(commande, lignes) {
      const reponse = resultat<{
        commande: LigneCommandeBase
        lignes: LigneLigneCommande[]
        lignes_changees: string[]
      }>(
        await client.rpc('enregistrer_commande', {
          p_commande: commandeVersLigne(commande),
          p_lignes: lignes.map(ligneCommandePourEnregistrement),
        }),
      )
      return {
        commande: commandeDepuisLigne(reponse.commande),
        lignes: reponse.lignes.map(ligneCommandeDepuisLigne),
        lignesChangees: reponse.lignes_changees,
      }
    },

    async reordonner(tourneeId, commandeIds) {
      verifier(
        await client.rpc('reordonner_commandes', { p_tournee_id: tourneeId, p_ids: commandeIds }),
      )
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

    async marquerARecalculer(planId) {
      resultat(
        await client
          .from('plan_chargement')
          .update({ a_recalculer: true })
          .eq('id', planId)
          .select('id')
          .single(),
      )
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
    async affecter(elementId, tourneeId) {
      return resultat<string>(
        await client.rpc('affecter_element_attente', {
          p_element_id: elementId,
          p_tournee_id: tourneeId,
        }),
      )
    },
    /**
     * Une commande entière en attente est supprimée, et l'élément avec elle
     * (ON DELETE CASCADE) ; pour des articles reportés, seul l'élément l'est.
     */
    async supprimer(id) {
      const reponse = await client
        .from('element_attente')
        .select('commande_id, ligne_commande_id')
        .eq('id', id)
        .maybeSingle()
      if (reponse.error) throw traduireErreur(reponse.error)
      const element = reponse.data as {
        commande_id: string
        ligne_commande_id: string | null
      } | null
      if (element && element.ligne_commande_id === null) {
        verifier(await client.from('commande').delete().eq('id', element.commande_id))
      } else {
        verifier(await client.from('element_attente').delete().eq('id', id))
      }
    },
  }
}

// --- Fabrique ----------------------------------------------------------------------

/**
 * Les dépôts de l'application, branchés sur un client Supabase. Les types
 * des objets se déduisent des fonctions de conversion passées à `depotTable`.
 */
const PAR_NOM: Tri[] = [{ colonne: 'nom', ascendant: true }]

export function creerDepotsSupabase(client: SupabaseClient): Depots {
  return {
    articles: archivable(
      client,
      'article',
      depotTable(client, 'article', articleDepuisLigne, articleVersLigne, PAR_NOM),
      articleDepuisLigne,
      PAR_NOM,
    ),
    camions: archivable(
      client,
      'modele_camion',
      depotTable(client, 'modele_camion', camionDepuisLigne, camionVersLigne, PAR_NOM),
      camionDepuisLigne,
      PAR_NOM,
    ),
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
