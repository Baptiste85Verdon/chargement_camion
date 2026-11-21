// Aides des tests de la page du plan : la tournée T-2026-118 de la base
// d'exemple, avec le plan de référence d'un jeu d'essai (« couloirs » ou
// « fenêtres isolées »), et de quoi lire la page comme un utilisateur.
import type { DOMWrapper, VueWrapper } from '@vue/test-utils'
import type { Depots, PlacementAEnregistrer } from '@/donnees/depots'
import { chargerJeuEssai, type NomJeuEssai } from '../jeux-essai/charger'
import couloirs from '../jeux-essai/couloirs.json'
import couloirsSansC4 from '../jeux-essai/couloirs-sans-c4.json'
import fenetresIsolees from '../jeux-essai/fenetres-isolees.json'
import { depotsDemarrage, monterPage } from './monter-page'

export const T118 = 'b0000000-0000-4000-8000-000000000118'

const JSON_JEUX = {
  couloirs,
  'couloirs-sans-c4': couloirsSansC4,
  'fenetres-isolees': fenetresIsolees,
}

/**
 * Traduit le plan d'un jeu d'essai en placements de la base d'exemple : chaque
 * unité (A01…) retrouve la ligne de sa commande (C1…) par le nom de l'article,
 * et prend le numéro d'unité suivant dans cette ligne.
 */
export async function placementsDuJeu(depots: Depots, nom: NomJeuEssai) {
  const [commandes, articles] = await Promise.all([
    depots.commandes.listerParTournee(T118),
    depots.articles.lister({ avecArchives: true }),
  ])
  const nomArticle = new Map(articles.map((a) => [a.id, a.nom]))
  const jeu = chargerJeuEssai(nom)
  const numeros = new Map<string, number>()
  return JSON_JEUX[nom].unites.map((u): PlacementAEnregistrer => {
    const commande = commandes.find((c) => `C${c.commande.rangLivraison}` === u.commande)
    const debut = u.article.split(',')[0] ?? ''
    const ligne = commande?.lignes.find((l) => nomArticle.get(l.articleId)?.startsWith(debut))
    if (!ligne) throw new Error(`Ligne introuvable pour ${u.id}`)
    const numero = (numeros.get(ligne.id) ?? 0) + 1
    numeros.set(ligne.id, numero)
    const p = jeu.placements.find((x) => x.uniteId === u.id)
    if (!p) throw new Error(`Placement introuvable pour ${u.id}`)
    return {
      ligneCommandeId: ligne.id,
      numeroUnite: numero,
      x: p.x,
      y: p.y,
      z: p.z,
      orientation: p.orientation,
      rang: p.rang,
      statut: 'aFaire',
    }
  })
}

export async function ouvrirAvec(placements: (depots: Depots) => Promise<PlacementAEnregistrer[]>) {
  const depots = depotsDemarrage()
  await depots.plans.enregistrerVersion(T118, await placements(depots))
  return { ...(await monterPage(`/tournees/${T118}/plan`, depots)), depots }
}

export const ouvrirJeu = (nom: NomJeuEssai) => ouvrirAvec((d) => placementsDuJeu(d, nom))

/** Texte lisible, espaces fines insécables ramenées à des espaces simples. */
export const texte = (w: { text(): string } | undefined) => (w?.text() ?? '').replace(/\s+/g, ' ')

/** Une page, une carte ou un bandeau : tout ce qui contient des boutons. */
export type Racine = { findAll(selecteur: string): DOMWrapper<Element>[] }

export function bouton(racine: Racine, libelle: string) {
  const trouve = racine.findAll('button').find((b) => texte(b).trim() === libelle)
  if (!trouve) throw new Error(`Bouton « ${libelle} » introuvable`)
  return trouve
}

export const carte = (page: VueWrapper, titre: string) => {
  const trouvee = page
    .findAll('section.carte')
    .find((s) => s.find('.carte__titre').text().startsWith(titre))
  if (!trouvee) throw new Error(`Carte « ${titre} » introuvable`)
  return trouvee
}

/** Messages de la zone aria-live de la page. */
export const annonces = (page: VueWrapper) =>
  page
    .findAll('[role="status"]')
    .map((s) => texte(s))
    .join(' | ')
