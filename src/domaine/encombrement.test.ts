import { describe, expect, it } from 'vitest'
import { encombrement } from './encombrement'

describe('encombrement', () => {
  const fenetre = { l: 1500, w: 1350, h: 180 }

  it("RG-04 : à plat, l'encombrement est la taille du catalogue", () => {
    expect(encombrement(fenetre, 'aPlat')).toEqual({ l: 1500, w: 1350, h: 180 })
  })

  it('RG-04 : debout, la largeur et la hauteur sont échangées', () => {
    expect(encombrement(fenetre, 'debout')).toEqual({ l: 1500, w: 180, h: 1350 })
  })

  it('RG-04 : contre une paroi, la pose est celle de debout', () => {
    const plaque = { l: 2500, w: 1200, h: 250 }
    expect(encombrement(plaque, 'contreParoi')).toEqual({ l: 2500, w: 250, h: 1200 })
  })
})
