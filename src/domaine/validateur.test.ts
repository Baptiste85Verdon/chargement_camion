import { describe, expect, it } from 'vitest'
import type { Camion, Placement, Unite } from './types'
import { valider } from './validateur'

const camion: Camion = { longueur: 7200, largeur: 2400, hauteur: 2500 }

/** Une palette 1 200 × 1 000 × 1 000, à plat seulement. */
function palette(id: string): Unite {
  return {
    id,
    commandeRang: 1,
    dims: { l: 1200, w: 1000, h: 1000 },
    poids: 1000,
    fragile: false,
    porteur: true,
    orientations: ['aPlat'],
  }
}

function poser(uniteId: string, x: number, y: number, z = 0): Placement {
  return { uniteId, x, y, z, orientation: 'aPlat', rang: 1 }
}

describe('valider : dans la caisse (RG-06)', () => {
  const unites = [palette('P1')]

  it('RG-06 : accepte une unité posée dans le coin du fond', () => {
    expect(valider(poser('P1', 0, 0), [], unites, camion)).toEqual([])
  })

  it('RG-06 : accepte une unité qui touche exactement les parois', () => {
    expect(valider(poser('P1', 6000, 1400, 1500), [], unites, camion)).toEqual([])
  })

  it.each([
    ['côté portes', poser('P1', 6001, 0)],
    ['côté paroi droite', poser('P1', 0, 1401)],
    ['par le haut', poser('P1', 0, 0, 1501)],
    ['côté fond', poser('P1', -1, 0)],
    ['côté paroi gauche', poser('P1', 0, -1)],
    ['sous le plancher', poser('P1', 0, 0, -1)],
  ])('RG-06 : refuse une unité qui dépasse %s', (_cote, p) => {
    expect(valider(p, [], unites, camion)).toEqual([
      { regle: 'RG-06', motif: 'horsCaisse', uniteId: 'P1' },
    ])
  })
})

describe('valider : sans chevauchement (RG-06)', () => {
  const unites = [palette('P1'), palette('P2')]
  const p1 = poser('P1', 0, 0)

  it('RG-06 : refuse une unité qui occupe le volume d’une autre', () => {
    expect(valider(poser('P2', 600, 500), [p1], unites, camion)).toEqual([
      { regle: 'RG-06', motif: 'chevauchement', uniteId: 'P2', autreUniteId: 'P1' },
    ])
  })

  it('RG-06 : refuse un chevauchement d’un seul millimètre', () => {
    expect(valider(poser('P2', 1199, 0), [p1], unites, camion)).toHaveLength(1)
  })

  it('RG-06 : accepte deux unités qui se touchent, face contre face', () => {
    expect(valider(poser('P2', 1200, 0), [p1], unites, camion)).toEqual([])
    expect(valider(poser('P2', 0, 1000), [p1], unites, camion)).toEqual([])
    expect(valider(poser('P2', 0, 0, 1000), [p1], unites, camion)).toEqual([])
  })

  it('RG-06 : ignore le placement de l’unité elle-même déjà présent dans le plan', () => {
    expect(valider(p1, [p1], unites, camion)).toEqual([])
  })

  it('RG-06 : tient compte de l’encombrement debout de l’autre unité', () => {
    const fenetre: Unite = {
      ...palette('F1'),
      dims: { l: 1500, w: 1350, h: 180 },
      orientations: ['debout'],
    }
    const debout: Placement = { uniteId: 'F1', x: 0, y: 0, z: 0, orientation: 'debout', rang: 1 }
    // Debout, la fenêtre fait 180 mm de large : une palette à y = 180 la touche sans la chevaucher.
    expect(valider(poser('P2', 0, 180), [debout], [...unites, fenetre], camion)).toEqual([])
    expect(valider(poser('P2', 0, 179), [debout], [...unites, fenetre], camion)).toHaveLength(1)
  })
})

describe('valider : unité inconnue', () => {
  it('lève une erreur si le placement désigne une unité absente', () => {
    expect(() => valider(poser('X', 0, 0), [], [], camion)).toThrow('X')
  })
})
