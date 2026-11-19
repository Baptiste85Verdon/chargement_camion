import { describe, expect, it } from 'vitest'
import { chargerJeuEssai } from '../../tests/jeux-essai/charger'
import { SANS_RANG } from './constantes'
import { boiteDe, gene, trouverUnite } from './geometrie'
import { aUnRang, ordonnerChargement } from './ordre-chargement'
import type { Dimensions, Placement, Unite } from './types'

/** Une unité à plat ; seules ses dimensions comptent pour l'ordre. */
function colis(id: string, dims: Dimensions = { l: 1200, w: 1000, h: 1000 }): Unite {
  return {
    id,
    commandeRang: 1,
    dims,
    poids: 500,
    fragile: false,
    porteur: true,
    orientations: ['aPlat'],
  }
}

function poser(uniteId: string, x: number, y: number, z: number, rang: number): Placement {
  return { uniteId, x, y, z, orientation: 'aPlat', rang }
}

/** Les identifiants dans l'ordre de chargement rendu. */
function ordre(resultat: Placement[] | null): string[] | null {
  return resultat === null ? null : resultat.map((p) => p.uniteId)
}

/**
 * Vérifie, indépendamment de l'algorithme, que les rangs rendus respectent
 * les deux contraintes du cahier technique (4.8) : si B gêne A (règle 7, qui
 * comprend « B est posé sur A »), A est chargé avant B.
 */
function contraintesNonRespectees(plan: Placement[], unites: Unite[]): string[] {
  const fautes: string[] = []
  for (const a of plan) {
    for (const b of plan) {
      if (a === b) continue
      const boiteA = boiteDe(a, trouverUnite(a.uniteId, unites))
      const boiteB = boiteDe(b, trouverUnite(b.uniteId, unites))
      if (gene(boiteB, boiteA) && a.rang >= b.rang) fautes.push(`${a.uniteId} avant ${b.uniteId}`)
    }
  }
  return fautes
}

describe('aUnRang', () => {
  it('reconnaît un article remis depuis la zone, sans ancien rang', () => {
    expect(aUnRang(poser('P1', 0, 0, 0, SANS_RANG))).toBe(false)
    expect(aUnRang(poser('P1', 0, 0, 0, 1))).toBe(true)
  })
})

describe('ordonnerChargement : contraintes (RG-07)', () => {
  it('RG-07 : rend un ordre vide pour un plan vide', () => {
    expect(ordonnerChargement([], [])).toEqual([])
  })

  it('RG-07 : charge une palette posée à la main sur une autre après elle', () => {
    const unites = [colis('P1'), colis('P2')]
    // P2, posée sur P1, avait le rang 1 : elle doit maintenant passer après.
    const plan = [poser('P1', 0, 0, 0, 2), poser('P2', 0, 0, 1000, 1)]
    expect(ordre(ordonnerChargement(plan, unites))).toEqual(['P1', 'P2'])
  })

  it('RG-07 : charge un article avant celui qui le gênerait, devant lui dans sa bande', () => {
    const unites = [colis('FOND'), colis('DEVANT')]
    const plan = [poser('FOND', 0, 0, 0, 2), poser('DEVANT', 1200, 500, 0, 1)]
    expect(ordre(ordonnerChargement(plan, unites))).toEqual(['FOND', 'DEVANT'])
  })

  it("RG-07 : garde l'ancien ordre quand l'article de devant est dans une autre bande", () => {
    const unites = [colis('FOND'), colis('DEVANT')]
    const plan = [poser('FOND', 0, 0, 0, 2), poser('DEVANT', 1200, 1000, 0, 1)]
    expect(ordre(ordonnerChargement(plan, unites))).toEqual(['DEVANT', 'FOND'])
  })

  it("RG-07 : un article devant, dont le bas est au niveau du dessus de l'autre, ne le gêne pas", () => {
    // BAS, un paquet de 500 mm au fond. SUPPORT, dans la bande voisine, porte
    // PLANCHE, qui avance au-dessus de la bande de BAS, à 500 mm du plancher :
    // BAS glisse dessous. PLANCHE avait le rang 1, BAS le rang 3.
    const unites = [
      colis('BAS', { l: 1200, w: 1000, h: 500 }),
      colis('SUPPORT', { l: 1200, w: 1000, h: 500 }),
      colis('PLANCHE', { l: 1200, w: 2000, h: 200 }),
    ]
    const plan = [
      poser('BAS', 0, 0, 0, 3),
      poser('SUPPORT', 1200, 1000, 0, 2),
      poser('PLANCHE', 1200, 0, 500, 1),
    ]
    // Seule contrainte : SUPPORT avant PLANCHE. BAS peut venir en dernier.
    expect(ordre(ordonnerChargement(plan, unites))).toEqual(['SUPPORT', 'PLANCHE', 'BAS'])
  })
})

describe('ordonnerChargement : départage', () => {
  it("garde l'ancien ordre quand aucune contrainte ne s'y oppose", () => {
    const unites = [colis('A'), colis('B'), colis('C', { l: 1200, w: 400, h: 1000 })]
    const plan = [poser('A', 0, 0, 0, 3), poser('B', 0, 1000, 0, 1), poser('C', 0, 2000, 0, 2)]
    expect(ordre(ordonnerChargement(plan, unites))).toEqual(['B', 'C', 'A'])
  })

  it('charge les articles remis depuis la zone après les autres, du fond vers les portes, puis du bas vers le haut', () => {
    const petit = { l: 1200, w: 600, h: 1000 }
    const unites = [
      colis('PORTEUR', petit),
      colis('REMIS_HAUT', petit),
      colis('REMIS_BAS', petit),
      colis('REMIS_LOIN', petit),
      colis('ANCIEN', petit),
    ]
    const plan = [
      poser('REMIS_LOIN', 1200, 1200, 0, SANS_RANG),
      poser('REMIS_HAUT', 0, 0, 1000, SANS_RANG),
      poser('REMIS_BAS', 0, 600, 0, SANS_RANG),
      poser('PORTEUR', 0, 0, 0, 2),
      poser('ANCIEN', 0, 1800, 0, 1),
    ]
    expect(ordre(ordonnerChargement(plan, unites))).toEqual([
      'ANCIEN',
      'PORTEUR',
      'REMIS_BAS',
      'REMIS_HAUT',
      'REMIS_LOIN',
    ])
  })

  it('rend des rangs numérotés à partir de 1, jamais SANS_RANG', () => {
    const unites = [colis('A'), colis('B'), colis('C', { l: 1200, w: 400, h: 1000 })]
    const plan = [
      poser('A', 0, 0, 0, 7),
      poser('B', 0, 1000, 0, SANS_RANG),
      poser('C', 0, 2000, 0, 5),
    ]
    const resultat = ordonnerChargement(plan, unites)
    expect(resultat?.map((p) => p.rang)).toEqual([1, 2, 3])
    expect(resultat?.every(aUnRang)).toBe(true)
  })

  it('ne change que le rang des placements', () => {
    const unites = [colis('P1'), colis('P2')]
    const plan = [poser('P1', 0, 0, 0, 2), poser('P2', 0, 0, 1000, 1)]
    expect(ordonnerChargement(plan, unites)).toEqual([
      { ...plan[0], rang: 1 },
      { ...plan[1], rang: 2 },
    ])
  })

  it('ne modifie pas le plan reçu', () => {
    const unites = [colis('P1'), colis('P2')]
    const plan = [poser('P1', 0, 0, 0, 2), poser('P2', 0, 0, 1000, 1)]
    const copie = structuredClone(plan)
    ordonnerChargement(plan, unites)
    expect(plan).toEqual(copie)
  })
})

describe('ordonnerChargement : aucun ordre possible (RG-08)', () => {
  it('RG-08 : rend null quand un article doit être chargé à la fois avant et après un autre', () => {
    // PLANCHE repose sur ARRIERE et AVANT ; HAUT est posé sur PLANCHE, au fond.
    // AVANT est devant HAUT, dans sa bande, et son bas est plus bas que le
    // dessus de HAUT : HAUT doit être chargé avant AVANT. Mais HAUT est posé
    // sur PLANCHE, elle-même posée sur AVANT : AVANT doit être chargé avant.
    const unites = [
      colis('ARRIERE', { l: 1000, w: 1000, h: 500 }),
      colis('AVANT', { l: 1000, w: 1000, h: 500 }),
      colis('PLANCHE', { l: 3000, w: 1000, h: 200 }),
      colis('HAUT', { l: 1000, w: 1000, h: 500 }),
    ]
    const plan = [
      poser('ARRIERE', 1000, 0, 0, 1),
      poser('AVANT', 3000, 0, 0, 2),
      poser('PLANCHE', 1000, 0, 500, 3),
      poser('HAUT', 1000, 0, 700, 4),
    ]
    expect(ordonnerChargement(plan, unites)).toBeNull()
  })
})

describe('ordonnerChargement : jeu « couloirs » (référence)', () => {
  const jeu = chargerJeuEssai('couloirs')

  it("RG-07 : reconnaît l'ordre de référence comme réalisable et le garde tel quel", () => {
    const resultat = ordonnerChargement(jeu.placements, jeu.unites)
    expect(resultat).not.toBeNull()
    expect(contraintesNonRespectees(resultat ?? [], jeu.unites)).toEqual([])
    expect(ordre(resultat)).toEqual(ordre([...jeu.placements].sort((a, b) => a.rang - b.rang)))
  })

  it('RG-07 : charge une palette posée à la main sur une autre après elle', () => {
    // A01 (rang 1) est posée à la main sur A03 (rang 3), dans le même couloir.
    const plan = jeu.placements.map((p) =>
      p.uniteId === 'A01' ? { ...p, x: 1200, y: 0, z: 1050 } : p,
    )
    const resultat = ordonnerChargement(plan, jeu.unites)
    expect(resultat).not.toBeNull()
    const rangDe = (id: string) => resultat?.find((p) => p.uniteId === id)?.rang ?? 0
    expect(rangDe('A03')).toBeLessThan(rangDe('A01'))
    expect(contraintesNonRespectees(resultat ?? [], jeu.unites)).toEqual([])
  })
})
