import { describe, expect, it } from 'vitest'
import { encombrement } from '@/domaine/encombrement'
import { chargerJeuEssai } from '../jeux-essai/charger'

describe("chargement des jeux d'essai", () => {
  const jeu = chargerJeuEssai('couloirs')

  it('lit la caisse, les douze unités et leurs placements', () => {
    expect(jeu.camion).toEqual({ longueur: 7200, largeur: 2400, hauteur: 2500 })
    expect(jeu.unites).toHaveLength(12)
    expect(jeu.placements).toHaveLength(12)
    expect(jeu.placements[0]).toEqual({
      uniteId: 'A01',
      x: 0,
      y: 0,
      z: 0,
      orientation: 'aPlat',
      rang: 1,
    })
  })

  it('donne à chaque unité le rang de livraison de sa commande', () => {
    const rang = (id: string) => jeu.unites.find((u) => u.id === id)?.commandeRang
    expect(rang('A01')).toBe(4) // C4
    expect(rang('A08')).toBe(1) // C1
    expect(rang('A10')).toBe(2) // C2
  })

  it('RG-04 : ramène une fenêtre debout à ses dimensions de catalogue à plat', () => {
    const a10 = jeu.unites.find((u) => u.id === 'A10')
    expect(a10?.dims).toEqual({ l: 1500, w: 1350, h: 180 })
    // Une fois debout, elle retrouve l'encombrement donné par le jeu d'essai.
    expect(a10 && encombrement(a10.dims, 'debout')).toEqual({ l: 1500, w: 180, h: 1350 })
  })
})
