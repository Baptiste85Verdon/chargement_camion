import { describe, expect, it } from 'vitest'
import { chargerJeuEssai } from '../../tests/jeux-essai/charger'
import {
  VUES,
  dimensionsVue,
  estRecouvert,
  plusGrandeZoneVisible,
  projeter,
  projeterPlan,
  vuesOuVisible,
  type Vue,
} from './projection'
import type { Unite } from './types'

const jeu = chargerJeuEssai('couloirs')
const { camion } = jeu

function unite(id: string): Unite {
  const u = jeu.unites.find((v) => v.id === id)
  if (!u) throw new Error(id)
  return u
}

function placement(id: string) {
  const p = jeu.placements.find((v) => v.uniteId === id)
  if (!p) throw new Error(id)
  return p
}

/** Fenêtre A10, debout : de x 3 700 à 5 200, y 2 020 à 2 200, z 0 à 1 350. */
const a10 = (vue: Vue) => projeter(placement('A10'), unite('A10'), camion, vue)

describe('dimensionsVue : le viewBox de chaque vue, en mm', () => {
  it('dessus : longueur × largeur de la caisse', () => {
    expect(dimensionsVue(camion, 'dessus')).toEqual({ largeur: 7200, hauteur: 2400 })
  })

  it('côtés : longueur × hauteur', () => {
    expect(dimensionsVue(camion, 'gauche')).toEqual({ largeur: 7200, hauteur: 2500 })
    expect(dimensionsVue(camion, 'droite')).toEqual({ largeur: 7200, hauteur: 2500 })
  })

  it('avant et arrière : largeur × hauteur', () => {
    expect(dimensionsVue(camion, 'avant')).toEqual({ largeur: 2400, hauteur: 2500 })
    expect(dimensionsVue(camion, 'arriere')).toEqual({ largeur: 2400, hauteur: 2500 })
  })
})

describe('projeter : rectangle et profondeur dans chaque vue', () => {
  it('dessus : fond à gauche, paroi droite en haut, les plus hauts devant', () => {
    expect(a10('dessus')).toEqual({
      uniteId: 'A10',
      rect: { x: 3700, y: 200, largeur: 1500, hauteur: 180 },
      profondeur: { proche: 1150, loin: 2500 },
    })
  })

  it('côté gauche : fond à gauche, plancher en bas, les plus proches de la paroi gauche devant', () => {
    expect(a10('gauche')).toEqual({
      uniteId: 'A10',
      rect: { x: 3700, y: 1150, largeur: 1500, hauteur: 1350 },
      profondeur: { proche: 2020, loin: 2200 },
    })
  })

  it('côté droit : en miroir, le fond passe à droite', () => {
    expect(a10('droite')).toEqual({
      uniteId: 'A10',
      rect: { x: 2000, y: 1150, largeur: 1500, hauteur: 1350 },
      profondeur: { proche: 200, loin: 380 },
    })
  })

  it('avant : vu depuis le fond, la paroi gauche est à droite', () => {
    expect(a10('avant')).toEqual({
      uniteId: 'A10',
      rect: { x: 200, y: 1150, largeur: 180, hauteur: 1350 },
      profondeur: { proche: 3700, loin: 5200 },
    })
  })

  it('arrière : vu depuis les portes, la paroi gauche est à gauche', () => {
    expect(a10('arriere')).toEqual({
      uniteId: 'A10',
      rect: { x: 2020, y: 1150, largeur: 180, hauteur: 1350 },
      profondeur: { proche: 2000, loin: 3500 },
    })
  })

  it('tient compte de l’orientation : la même fenêtre à plat est basse et large', () => {
    const aPlat = { ...placement('A10'), y: 0, orientation: 'aPlat' as const }
    expect(projeter(aPlat, unite('A10'), camion, 'arriere').rect).toEqual({
      x: 0,
      y: 2320,
      largeur: 1350,
      hauteur: 180,
    })
  })
})

describe('estRecouvert : un rectangle est-il entièrement masqué ?', () => {
  const cible = { x: 0, y: 0, largeur: 100, hauteur: 100 }

  it('oui, par un rectangle plus grand', () => {
    expect(estRecouvert(cible, [{ x: -10, y: -10, largeur: 200, hauteur: 200 }])).toBe(true)
  })

  it('oui, par deux moitiés jointives', () => {
    const gauche = { x: 0, y: 0, largeur: 50, hauteur: 100 }
    const droite = { x: 50, y: 0, largeur: 50, hauteur: 100 }
    expect(estRecouvert(cible, [gauche, droite])).toBe(true)
  })

  it('non, s’il reste un interstice', () => {
    const gauche = { x: 0, y: 0, largeur: 50, hauteur: 100 }
    const droite = { x: 51, y: 0, largeur: 49, hauteur: 100 }
    expect(estRecouvert(cible, [gauche, droite])).toBe(false)
  })

  it('non, par un rectangle qui ne fait que toucher son bord', () => {
    expect(estRecouvert(cible, [{ x: 100, y: 0, largeur: 50, hauteur: 100 }])).toBe(false)
  })

  it('non, sans rien devant', () => {
    expect(estRecouvert(cible, [])).toBe(false)
  })
})

describe('projeterPlan : ordre de dessin et articles cachés, jeu « couloirs »', () => {
  const cachesDans = (vue: Vue) =>
    projeterPlan(jeu.placements, jeu.unites, camion, vue)
      .filter((p) => p.cache)
      .map((p) => p.uniteId)
      .sort()

  it('dessine du plus éloigné au plus proche', () => {
    const ordre = projeterPlan(jeu.placements, jeu.unites, camion, 'gauche')
    const proches = ordre.map((p) => p.profondeur.proche)
    expect(proches).toEqual([...proches].sort((a, b) => b - a))
    expect(ordre.at(-1)?.profondeur.proche).toBe(0)
  })

  it('dessus : les articles sous un autre de même emprise sont cachés', () => {
    expect(cachesDans('dessus')).toEqual(['A04', 'A06', 'A08'])
  })

  it('côté gauche : A02 dépasse de 50 mm au-dessus de A01, il reste visible', () => {
    expect(cachesDans('gauche')).toEqual(['A04', 'A05', 'A10', 'A12'])
  })

  it('côté droit', () => {
    expect(cachesDans('droite')).toEqual(['A01', 'A04', 'A05', 'A06', 'A07', 'A11', 'A12'])
  })

  it('avant', () => {
    expect(cachesDans('avant')).toEqual(['A03', 'A06', 'A07', 'A08', 'A09'])
  })

  it('arrière : seul A01, derrière A03', () => {
    expect(cachesDans('arriere')).toEqual(['A01'])
  })

  it('ne compte que les articles reçus : sans A03, A01 redevient visible en vue arrière', () => {
    const sansA03 = jeu.placements.filter((p) => p.uniteId !== 'A03')
    const caches = projeterPlan(sansA03, jeu.unites, camion, 'arriere').filter((p) => p.cache)
    expect(caches).toEqual([])
  })
})

describe('vuesOuVisible : proposer une vue plus adaptée', () => {
  it('A01, caché depuis les portes, se voit de dessus, à gauche et de l’avant', () => {
    expect(vuesOuVisible('A01', jeu.placements, jeu.unites, camion)).toEqual([
      'dessus',
      'gauche',
      'avant',
    ])
  })

  it('A12, caché à gauche et à droite, se voit dans les trois autres vues', () => {
    expect(vuesOuVisible('A12', jeu.placements, jeu.unites, camion)).toEqual([
      'dessus',
      'avant',
      'arriere',
    ])
  })

  it('suit l’ordre du sélecteur de vue', () => {
    expect(VUES).toEqual(['dessus', 'gauche', 'droite', 'avant', 'arriere'])
  })
})

describe('plusGrandeZoneVisible', () => {
  const cible = { x: 0, y: 0, largeur: 100, hauteur: 100 }

  it('rend toute la cible quand rien ne la couvre', () => {
    expect(plusGrandeZoneVisible(cible, [])).toEqual(cible)
  })

  it('assemble les cases libres voisines en un seul rectangle', () => {
    // Un carré couvre le coin bas droit : le plus grand rectangle libre est
    // la bande du haut ou celle de gauche, de même surface ; la première trouvée reste.
    const devant = [{ x: 60, y: 60, largeur: 40, hauteur: 40 }]
    expect(plusGrandeZoneVisible(cible, devant)).toEqual({ x: 0, y: 0, largeur: 100, hauteur: 60 })
  })

  it('ne rend rien pour une cible entièrement couverte', () => {
    expect(
      plusGrandeZoneVisible(cible, [{ x: -10, y: -10, largeur: 200, hauteur: 200 }]),
    ).toBeNull()
  })
})
