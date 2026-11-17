// Recette du prototype 1 (étape 11) : « Pour une tournée d'essai de plusieurs
// commandes saisies dans l'application, le plan ne présente aucun
// chevauchement et respecte les règles de placement et l'ordre de livraison. »
//
// La tournée et ses commandes suivent le même chemin que dans l'interface,
// sans les écrans : formulaire de la saisie express, vérification (RG-21),
// enregistrement dans le dépôt, puis « Lancer le calcul ». Le plan enregistré
// est ensuite relu et repassé, placement par placement, au validateur : c'est
// lui qui dit s'il y a un chevauchement (RG-06), une règle de placement
// enfreinte (RG-04, RG-18, RG-19) ou un article qui gêne une livraison
// antérieure (RG-07, l'ordre de livraison).
import { describe, expect, it } from 'vitest'
import { diagnostiquerCalage } from '@/domaine/calage'
import type { FicheArticle, ModeleCamion } from '@/domaine/modele'
import {
  commandeDepuisFormulaire,
  formulaireVideCommande,
  ligneDepuisArticle,
  proposerPoids,
} from '@/domaine/saisie-commande'
import { lirePlan, referenceSuivante } from '@/domaine/tournee'
import { validerPlan } from '@/domaine/validateur'
import { validerCommande, type SaisieCommande } from '@/domaine/validation'
import type { Depots } from '@/donnees/depots'
import { calculerEtEnregistrer } from '@/stores/calcul'
import { depotsDemarrage } from './monter-page'

const PORTEUR_6_2 = 'c0000000-0000-4000-8000-000000000002'

/** Une ligne de la saisie express : un article du catalogue, cherché par sa référence. */
interface LigneEssai {
  reference: string
  quantite: number
  /** Dimensions propres à la commande : le poids est alors proposé (RG-03). */
  dimsPropres?: { l: number; w: number; h: number }
}

/** Les commandes de la tournée d'essai, dans l'ordre de livraison. */
const COMMANDES: { destination: string; ville: string; lignes: LigneEssai[] }[] = [
  {
    destination: 'Menuiserie Lefèvre',
    ville: 'Rezé',
    lignes: [
      { reference: 'FEN-PVC-2V', quantite: 2 },
      { reference: 'QUI-CAR', quantite: 1 },
    ],
  },
  {
    destination: 'Toitures du Lac',
    ville: 'Carquefou',
    lignes: [
      { reference: 'COU-TUI-MEC', quantite: 1 },
      { reference: 'ISO-LV-100', quantite: 3 },
      { reference: 'VLX-GGL-MK04', quantite: 1 },
    ],
  },
  {
    destination: 'SARL Plâtres Martin',
    ville: 'Nantes',
    lignes: [
      { reference: 'PLQ-BA13', quantite: 2 },
      // Chevrons recoupés à 3 m pour ce chantier (RG-03).
      { reference: 'POU-CHE-4', quantite: 1, dimsPropres: { l: 3000, w: 400, h: 300 } },
    ],
  },
  {
    destination: 'Maçonnerie Girard',
    ville: 'Bouguenais',
    lignes: [
      { reference: 'MAC-PAR-20', quantite: 1 },
      { reference: 'PLA-DOU-3', quantite: 2 },
    ],
  },
]

/** Ce que fait la saisie express : remplir le formulaire, le vérifier, l'enregistrer. */
async function saisirCommande(
  depots: Depots,
  tourneeId: string,
  rang: number,
  catalogue: FicheArticle[],
  camion: ModeleCamion,
  { destination, ville, lignes }: (typeof COMMANDES)[number],
) {
  const form: SaisieCommande = {
    ...formulaireVideCommande(`CMD-ESSAI-${rang}`),
    destination,
    ville,
  }
  for (const { reference, quantite, dimsPropres } of lignes) {
    const article = catalogue.find((a) => a.reference === reference)
    if (!article) throw new Error(`Article absent de la base d'exemple : ${reference}`)
    let ligne = { ...ligneDepuisArticle(article), quantite: String(quantite) }
    if (dimsPropres) {
      const dims = { l: String(dimsPropres.l), w: String(dimsPropres.w), h: String(dimsPropres.h) }
      ligne = proposerPoids({ ...ligne, dimsPropres: dims }, article)
    }
    form.lignes.push(ligne)
  }

  const deja = await depots.commandes.listerParTournee(tourneeId)
  const verification = validerCommande(form, {
    commandesDeLaTournee: deja.map((c) => c.commande),
    catalogue,
    camion,
  })
  expect(verification.erreurs).toEqual([])

  const { commande, lignes: aEnregistrer } = commandeDepuisFormulaire(form, {
    tourneeId,
    rangLivraison: rang,
  })
  await depots.commandes.enregistrer(commande, aEnregistrer)
}

/** Crée la tournée, saisit les commandes, lance le calcul et relit le plan. */
async function preparerTourneeEssai() {
  const depots = depotsDemarrage()
  const camion = await depots.camions.obtenir(PORTEUR_6_2)
  if (!camion) throw new Error('Porteur 6,2 m absent de la base d’exemple')
  const existantes = await depots.tournees.lister()
  const tournee = await depots.tournees.enregistrer({
    reference: referenceSuivante(
      existantes.map((t) => t.reference),
      2026,
    ),
    date: '2026-11-20',
    modeleCamionId: camion.id,
    statut: 'enPreparation',
  })
  const catalogue = await depots.articles.lister()
  for (const [i, commande] of COMMANDES.entries()) {
    await saisirCommande(depots, tournee.id, i + 1, catalogue, camion, commande)
  }

  await calculerEtEnregistrer(depots, tournee.id, camion)

  const commandes = await depots.commandes.listerParTournee(tournee.id)
  const dernier = await depots.plans.obtenirDernier(tournee.id)
  if (!dernier) throw new Error('Aucun plan enregistré après le calcul')
  const lu = lirePlan(commandes, catalogue, dernier.placements)
  return { ...lu, camion, commandes }
}

describe('recette : tournée d’essai saisie dans l’application', () => {
  it('RG-10 : place tous les articles des quatre commandes', async () => {
    const { unites, placements, aPlacer } = await preparerTourneeEssai()
    expect(unites).toHaveLength(14)
    expect(aPlacer).toEqual([])
    expect(placements).toHaveLength(unites.length)
  })

  it('RG-03 : les chevrons recoupés sont placés à leur longueur propre, avec un poids estimé', async () => {
    const { unites, commandes } = await preparerTourneeEssai()
    const ligne = commandes[2]?.lignes[1]
    expect(ligne?.dimsPropres).toEqual({ l: 3000, w: 400, h: 300 })
    expect(ligne?.poidsEstime).toBe(true)
    expect(ligne?.poidsPropre).toBe(67.5)
    const chevrons = unites.find((u) => u.ligneCommandeId === ligne?.id)
    expect(chevrons?.dims).toEqual({ l: 3000, w: 400, h: 300 })
  })

  it('RG-04, RG-06, RG-07, RG-18 : le validateur n’enfreint aucune règle (chevauchement, appui, fragiles, lourds, ordre de livraison)', async () => {
    const { unites, placements, camion } = await preparerTourneeEssai()
    expect(validerPlan(placements, unites, camion)).toEqual([])
  })

  it('RG-19 : aucun article n’est mal calé', async () => {
    const { unites, placements, camion } = await preparerTourneeEssai()
    expect(diagnostiquerCalage(placements, unites, camion)).toEqual([])
  })

  it('RG-07 : chaque commande est chargée d’un bloc, la dernière livrée la première', async () => {
    const { unites, placements, commandes } = await preparerTourneeEssai()
    const rangLivraison = new Map(commandes.map((c) => [c.commande.id, c.commande.rangLivraison]))
    const parId = new Map(unites.map((u) => [u.id, u]))
    // Rang de livraison de chaque unité, dans l'ordre de chargement.
    const ordre = placements.map((p) => rangLivraison.get(parId.get(p.uniteId)?.commandeId ?? ''))
    expect(ordre).toEqual([...ordre].sort((a, b) => (b ?? 0) - (a ?? 0)))
  })
})
