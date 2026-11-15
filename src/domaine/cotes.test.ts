import { describe, expect, it } from 'vitest'
import { chargerJeuEssai } from '../../tests/jeux-essai/charger'
import { coter, coterCaisse } from './cotes'
import type { Vue } from './projection'

const jeu = chargerJeuEssai('couloirs')
const { camion } = jeu

function coterUnite(id: string, vue: Vue) {
  const p = jeu.placements.find((v) => v.uniteId === id)
  const u = jeu.unites.find((v) => v.id === id)
  if (!p || !u) throw new Error(id)
  return coter(p, u, camion, vue)
}

describe('coterCaisse : la caisse est cotée dans chaque vue (5.13)', () => {
  it('dessus : longueur sous la vue, largeur sur le côté gauche', () => {
    expect(coterCaisse(camion, 'dessus')).toEqual([
      {
        mesure: 'longueur',
        valeur: 7200,
        segment: { debut: { x: 0, y: 2400 }, fin: { x: 7200, y: 2400 } },
      },
      {
        mesure: 'largeur',
        valeur: 2400,
        segment: { debut: { x: 0, y: 0 }, fin: { x: 0, y: 2400 } },
      },
    ])
  })

  it('côtés : longueur et hauteur', () => {
    for (const vue of ['gauche', 'droite'] as const) {
      expect(coterCaisse(camion, vue).map((c) => [c.mesure, c.valeur])).toEqual([
        ['longueur', 7200],
        ['hauteur', 2500],
      ])
    }
  })

  it('avant et arrière : largeur et hauteur', () => {
    expect(coterCaisse(camion, 'arriere')).toEqual([
      {
        mesure: 'largeur',
        valeur: 2400,
        segment: { debut: { x: 0, y: 2500 }, fin: { x: 2400, y: 2500 } },
      },
      {
        mesure: 'hauteur',
        valeur: 2500,
        segment: { debut: { x: 0, y: 0 }, fin: { x: 0, y: 2500 } },
      },
    ])
    expect(coterCaisse(camion, 'avant').map((c) => c.mesure)).toEqual(['largeur', 'hauteur'])
  })
})

describe('coter : l’article sélectionné, ses dimensions et sa distance au fond (5.13)', () => {
  // A10 : fenêtre debout, x 3 700 à 5 200, y 2 020 à 2 200, z 0 à 1 350.

  it('dessus : longueur sous le bloc, largeur à sa gauche, distance au fond à mi-hauteur', () => {
    expect(coterUnite('A10', 'dessus')).toEqual([
      {
        mesure: 'longueur',
        valeur: 1500,
        segment: { debut: { x: 3700, y: 380 }, fin: { x: 5200, y: 380 } },
      },
      {
        mesure: 'largeur',
        valeur: 180,
        segment: { debut: { x: 3700, y: 200 }, fin: { x: 3700, y: 380 } },
      },
      {
        mesure: 'distanceFond',
        valeur: 3700,
        segment: { debut: { x: 0, y: 290 }, fin: { x: 3700, y: 290 } },
      },
    ])
  })

  it('côté gauche : longueur et hauteur de l’article posé', () => {
    expect(coterUnite('A10', 'gauche')).toEqual([
      {
        mesure: 'longueur',
        valeur: 1500,
        segment: { debut: { x: 3700, y: 2500 }, fin: { x: 5200, y: 2500 } },
      },
      {
        mesure: 'hauteur',
        valeur: 1350,
        segment: { debut: { x: 3700, y: 1150 }, fin: { x: 3700, y: 2500 } },
      },
      {
        mesure: 'distanceFond',
        valeur: 3700,
        segment: { debut: { x: 0, y: 1825 }, fin: { x: 3700, y: 1825 } },
      },
    ])
  })

  it('côté droit : la distance au fond part du bord droit, où est le fond', () => {
    const distance = coterUnite('A10', 'droite').find((c) => c.mesure === 'distanceFond')
    expect(distance).toEqual({
      mesure: 'distanceFond',
      valeur: 3700,
      segment: { debut: { x: 7200, y: 1825 }, fin: { x: 3500, y: 1825 } },
    })
  })

  it('avant et arrière : la distance au fond est dans l’axe du regard, sans segment', () => {
    expect(coterUnite('A10', 'arriere')).toEqual([
      {
        mesure: 'largeur',
        valeur: 180,
        segment: { debut: { x: 2020, y: 2500 }, fin: { x: 2200, y: 2500 } },
      },
      {
        mesure: 'hauteur',
        valeur: 1350,
        segment: { debut: { x: 2020, y: 1150 }, fin: { x: 2020, y: 2500 } },
      },
      { mesure: 'distanceFond', valeur: 3700, segment: null },
    ])
    expect(coterUnite('A10', 'avant').at(-1)).toEqual({
      mesure: 'distanceFond',
      valeur: 3700,
      segment: null,
    })
  })

  it('un article contre le fond a une distance nulle', () => {
    expect(coterUnite('A01', 'gauche').at(-1)?.valeur).toBe(0)
  })
})
