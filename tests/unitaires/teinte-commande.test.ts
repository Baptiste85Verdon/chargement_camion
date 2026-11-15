import { describe, expect, it } from 'vitest'
import { teinteCommande } from '@/composants/teinte-commande'

describe('teinte des commandes (charte, « Plus de six commandes »)', () => {
  it('donne les teintes 1 à 6 pleines à C1 à C6', () => {
    for (let n = 1; n <= 6; n++) {
      expect(teinteCommande(n)).toEqual({ teinte: n, hachure: false })
    }
  })

  it('reprend les teintes 1 à 6 avec un fond hachuré de C7 à C12', () => {
    expect(teinteCommande(7)).toEqual({ teinte: 1, hachure: true })
    expect(teinteCommande(12)).toEqual({ teinte: 6, hachure: true })
  })

  it('revient aux teintes pleines à partir de C13', () => {
    expect(teinteCommande(13)).toEqual({ teinte: 1, hachure: false })
    expect(teinteCommande(19)).toEqual({ teinte: 1, hachure: true })
  })

  it('ne donne jamais la même teinte à deux commandes qui se suivent', () => {
    for (let n = 1; n < 40; n++) {
      expect(teinteCommande(n).teinte).not.toBe(teinteCommande(n + 1).teinte)
    }
  })

  it('refuse un numéro qui n’est pas un entier supérieur ou égal à 1', () => {
    expect(() => teinteCommande(0)).toThrow(RangeError)
    expect(() => teinteCommande(1.5)).toThrow(RangeError)
  })
})
