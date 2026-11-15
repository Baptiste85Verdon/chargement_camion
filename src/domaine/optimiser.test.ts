import { describe, expect, it } from 'vitest'
import { chargerJeuEssai } from '../../tests/jeux-essai/charger'
import { diagnostiquerCalage } from './calage'
import {
  ameliorerParEchanges,
  estMeilleur,
  evaluer,
  type Evaluation,
  optimiser,
  permuterPoidsProches,
  type Variante,
  variantes,
} from './optimiser'
import type { Camion, Placement, Unite } from './types'
import { validerPlan } from './validateur'

const camion: Camion = { longueur: 7200, largeur: 2400, hauteur: 2500 }

function boite(id: string, poids: number, options: Partial<Unite> = {}): Unite {
  return {
    id,
    commandeRang: 1,
    dims: { l: 1200, w: 800, h: 1000 },
    poids,
    fragile: false,
    porteur: true,
    orientations: ['aPlat'],
    ...options,
  }
}

function poser(uniteId: string, x: number, y: number, z = 0, rang = 1): Placement {
  return { uniteId, x, y, z, orientation: 'aPlat', rang }
}

const uniteEn = (plan: Placement[], y: number, z = 0) =>
  plan.find((p) => p.y === y && p.z === z)?.uniteId

describe('optimiser : variantes du placeur', () => {
  it('RG-20 : propose seize variantes : quatre sens, deux ordres, avec et sans le point contre la paroi opposée', () => {
    const liste = variantes()
    expect(liste).toHaveLength(16)
    const cle = (v: Variante) =>
      [
        [1, 2, 3].map((rang) => v.sensDe(rang)).join(','),
        v.permuterPoidsProches,
        v.pointParoiOpposee,
      ].join('|')
    expect(new Set(liste.map(cle)).size).toBe(16)
    const sens = liste.map((v) => [1, 2, 3].map((rang) => v.sensDe(rang)).join(','))
    expect(new Set(sens).size).toBe(4)
    expect(liste.filter((v) => v.permuterPoidsProches)).toHaveLength(8)
    expect(liste.filter((v) => v.pointParoiOpposee)).toHaveLength(8)
  })

  it('inverse l’ordre des unités de même rang et de poids proche', () => {
    const triees = [
      boite('A', 1000),
      boite('B', 950),
      boite('C', 500),
      boite('D', 480, { commandeRang: 2 }),
    ]
    // A et B sont à moins de 10 % l'un de l'autre ; C est seul ; D est d'un autre rang.
    expect(permuterPoidsProches(triees).map((u) => u.id)).toEqual(['B', 'A', 'C', 'D'])
  })
})

describe('optimiser : comparaison des plans', () => {
  const base: Evaluation = { enTrop: 0, malCales: 0, pireEcart: 0.1, front: 5000 }

  it('RG-10 : préfère le plan qui laisse le moins d’articles en trop', () => {
    expect(estMeilleur({ ...base, pireEcart: 0.3 }, { ...base, enTrop: 1 })).toBe(true)
  })

  it('RG-19 : puis le moins d’articles mal calés', () => {
    expect(estMeilleur({ ...base, pireEcart: 0.3 }, { ...base, malCales: 1 })).toBe(true)
  })

  it('RG-20 : puis le mieux équilibré au pire moment, avant la compacité', () => {
    expect(estMeilleur({ ...base, front: 7000 }, { ...base, pireEcart: 0.2 })).toBe(true)
  })

  it('puis le plus compact', () => {
    expect(estMeilleur({ ...base, front: 4000 }, base)).toBe(true)
    expect(estMeilleur(base, base)).toBe(false)
  })

  it('RG-20 : mesure l’écart à l’axe au pire moment de la tournée', () => {
    const jeu = chargerJeuEssai('couloirs')
    const e = evaluer({ placements: jeu.placements, enTrop: [] }, jeu.unites, jeu.camion)
    expect(e.enTrop).toBe(0)
    expect(e.malCales).toBe(0)
    expect(Math.round((0.5 + e.pireEcart) * 100)).toBe(59)
    expect(e.front).toBe(7200)
  })
})

describe('optimiser : amélioration par échanges', () => {
  /**
   * Un lourd et un bloc à gauche, un léger à droite. Le bloc, plus court,
   * n'a pas le même encombrement : seuls le lourd et le léger s'échangent.
   */
  const bloc = boite('bloc', 300, { dims: { l: 1000, w: 800, h: 1000 } })
  const unites = [boite('lourd', 1000), boite('leger', 100), bloc]
  const plan = [
    poser('lourd', 0, 0, 0, 1),
    poser('leger', 0, 1600, 0, 2),
    poser('bloc', 1200, 0, 0, 3),
  ]

  it('RG-20 : échange deux unités de même encombrement de part et d’autre de l’axe', () => {
    const resultat = ameliorerParEchanges(plan, unites, camion)
    expect(uniteEn(resultat, 1600)).toBe('lourd')
    expect(uniteEn(resultat, 0)).toBe('leger')
    expect(validerPlan(resultat, unites, camion)).toEqual([])
  })

  it('garde positions et rangs de chargement : seules les unités changent de place', () => {
    const resultat = ameliorerParEchanges(plan, unites, camion)
    const forme = (p: Placement) => [p.x, p.y, p.z, p.orientation, p.rang]
    expect(resultat.map(forme)).toEqual(plan.map(forme))
  })

  it('ne touche jamais aux placements fixes', () => {
    const resultat = ameliorerParEchanges(plan, unites, camion, new Set(['lourd']))
    expect(resultat).toEqual(plan)
  })

  it('RG-04 : échange deux couloirs entiers quand l’échange d’une unité seule est refusé', () => {
    // Deux piles : lourde à gauche (y 0 à 1 000), légère à droite (y 1 000 à 2 000).
    // Échanger seulement les bas ou seulement les hauts poserait un lourd sur
    // un léger, et les hauts, moins hauts, ne s'échangent pas avec les bas :
    // seul l'échange des deux couloirs entiers est permis.
    const bas = { l: 1200, w: 1000, h: 1000 }
    const haut = { l: 1200, w: 1000, h: 800 }
    const piles = [
      boite('lourdBas', 1000, { dims: bas }),
      boite('lourdHaut', 900, { dims: haut }),
      boite('legerBas', 200, { dims: bas }),
      boite('legerHaut', 100, { dims: haut }),
    ]
    const avant = [
      poser('lourdBas', 0, 0, 0, 1),
      poser('legerBas', 0, 1000, 0, 2),
      poser('lourdHaut', 0, 0, 1000, 3),
      poser('legerHaut', 0, 1000, 1000, 4),
    ]
    const resultat = ameliorerParEchanges(avant, piles, camion)
    expect(uniteEn(resultat, 1000, 0)).toBe('lourdBas')
    expect(uniteEn(resultat, 1000, 1000)).toBe('lourdHaut')
    expect(uniteEn(resultat, 0, 0)).toBe('legerBas')
    expect(uniteEn(resultat, 0, 1000)).toBe('legerHaut')
    expect(validerPlan(resultat, piles, camion)).toEqual([])
  })

  it('rend le plan tel quel quand aucun échange n’améliore l’équilibre', () => {
    const egaux = [boite('A', 100), boite('B', 100)]
    const symetrique = [poser('A', 0, 0), poser('B', 0, 1600)]
    expect(ameliorerParEchanges(symetrique, egaux, camion)).toEqual(symetrique)
  })
})

describe('optimiser : jeu d’essai « couloirs »', () => {
  const jeu = chargerJeuEssai('couloirs')
  const resultat = optimiser(jeu.unites, jeu.camion)
  const reference = evaluer({ placements: jeu.placements, enTrop: [] }, jeu.unites, jeu.camion)
  const obtenu = evaluer(resultat, jeu.unites, jeu.camion)

  it('RG-10 : ne laisse aucun article en trop', () => {
    expect(resultat.enTrop).toEqual([])
    expect(resultat.placements).toHaveLength(12)
  })

  it('RG-04, RG-06, RG-07, RG-18, RG-19 : produit un plan accepté par le validateur', () => {
    expect(validerPlan(resultat.placements, jeu.unites, jeu.camion)).toEqual([])
    expect(diagnostiquerCalage(resultat.placements, jeu.unites, jeu.camion)).toEqual([])
  })

  // Étape 4b : sans le point contre la paroi opposée, le placeur n'atteignait
  // pas la paroi droite et la charge montait à 66 / 34 après C3.
  it('RG-20 : est au moins aussi équilibré au pire moment que le plan de référence', () => {
    expect(obtenu.pireEcart).toBeLessThanOrEqual(reference.pireEcart)
  })

  it('RG-20 : obtient 58 / 42 au pire moment, contre 59 / 41 pour la référence', () => {
    expect(Math.round((0.5 + obtenu.pireEcart) * 100)).toBe(58)
    expect(Math.round((0.5 + reference.pireEcart) * 100)).toBe(59)
  })

  it('garde les placements fixes', () => {
    const fixes = jeu.placements.filter((p) => ['A01', 'A02'].includes(p.uniteId))
    const { placements } = optimiser(jeu.unites, jeu.camion, fixes)
    expect(placements.slice(0, 2)).toEqual(fixes)
    expect(validerPlan(placements, jeu.unites, jeu.camion)).toEqual([])
  })
})
