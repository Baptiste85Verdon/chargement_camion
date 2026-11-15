// Préparation d'une tournée (captures 01, 02 ; CF 4.1, 4.2, RG-07, RG-10).
import { describe, expect, it } from 'vitest'
import type { Commande, FicheArticle, LigneDeCommande, ModeleCamion } from './modele'
import { calculerPlan, deplacer, referenceSuivante } from './tournee'
import { validerPlan } from './validateur'
import { preparerUnites } from './unites'

describe('referenceSuivante', () => {
  it('propose la référence qui suit la plus grande de l’année', () => {
    expect(referenceSuivante(['T-2026-118', 'T-2026-116', 'T-2025-301'], 2026)).toBe('T-2026-119')
  })

  it('commence à 001 pour une nouvelle année', () => {
    expect(referenceSuivante(['T-2026-118'], 2027)).toBe('T-2027-001')
  })
})

describe('deplacer', () => {
  it('RG-07 : avance une commande d’un rang dans l’ordre de livraison', () => {
    expect(deplacer(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b'])
  })

  it('RG-07 : recule une commande d’un rang', () => {
    expect(deplacer(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
  })

  it('RG-07 : pose une commande glissée à une autre place', () => {
    expect(deplacer(['a', 'b', 'c', 'd'], 3, -3)).toEqual(['d', 'a', 'b', 'c'])
  })

  it('ne sort jamais de la liste et ne modifie pas la liste reçue', () => {
    const liste = ['a', 'b']
    expect(deplacer(liste, 0, -1)).toEqual(['a', 'b'])
    expect(deplacer(liste, 1, 5)).toEqual(['a', 'b'])
    expect(liste).toEqual(['a', 'b'])
  })
})

// --- Calcul du plan ----------------------------------------------------------------

const camion: ModeleCamion = {
  id: 'cam',
  nom: 'Porteur 7,2 m',
  longueur: 7200,
  largeur: 2400,
  hauteur: 2500,
}

const palette: FicheArticle = {
  id: 'art-pal',
  nom: 'Palette de parpaings 20 cm',
  famille: 'Maçonnerie',
  dimsEmballees: { l: 1200, w: 1000, h: 1050 },
  poids: 1225,
  fragile: false,
  orientations: ['aPlat'],
  forme: 'rectangulaire',
  porteur: true,
}

const commande = (id: string, rang: number): Commande => ({
  id,
  tourneeId: 't',
  numero: `CMD-${id}`,
  destination: id,
  rangLivraison: rang,
})

const ligne = (id: string, commandeId: string, quantite: number): LigneDeCommande => ({
  id,
  commandeId,
  articleId: 'art-pal',
  quantite,
  nu: false,
  poidsEstime: false,
})

describe('calculerPlan', () => {
  it('RG-07 : place chaque unité avec sa ligne, son numéro et un rang de chargement', () => {
    const commandes = [
      { commande: commande('c1', 1), lignes: [ligne('l1', 'c1', 1)] },
      { commande: commande('c2', 2), lignes: [ligne('l2', 'c2', 2)] },
    ]
    const { placements, enTrop } = calculerPlan(commandes, [palette], camion)

    expect(enTrop).toEqual([])
    expect(placements.map((p) => `${p.ligneCommandeId}-${p.numeroUnite}`).sort()).toEqual([
      'l1-1',
      'l2-1',
      'l2-2',
    ])
    expect(placements.map((p) => p.rang).sort()).toEqual([1, 2, 3])
    expect(placements.every((p) => p.statut === 'aFaire')).toBe(true)

    // Le plan enregistré respecte toutes les règles de placement.
    const unites = preparerUnites(
      commandes.map((c) => ({
        id: c.commande.id,
        rangLivraison: c.commande.rangLivraison ?? 0,
        lignes: c.lignes,
      })),
      [palette],
    )
    const plan = placements.map((p) => ({
      uniteId: `${p.ligneCommandeId}-${p.numeroUnite}`,
      x: p.x,
      y: p.y,
      z: p.z,
      orientation: p.orientation,
      rang: p.rang,
    }))
    expect(validerPlan(plan, unites, camion)).toEqual([])
  })

  it('RG-10 : rend les unités qui ne rentrent pas', () => {
    // 6 × 3 palettes au plancher au plus : 20 ne rentrent pas toutes.
    const commandes = [{ commande: commande('c1', 1), lignes: [ligne('l1', 'c1', 20)] }]
    const { placements, enTrop } = calculerPlan(commandes, [palette], camion)
    expect(placements.length + enTrop.length).toBe(20)
    expect(enTrop.length).toBeGreaterThan(0)
    expect(enTrop[0]).toMatchObject({ ligneCommandeId: 'l1', commandeId: 'c1' })
  })
})
