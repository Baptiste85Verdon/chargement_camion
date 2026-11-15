import { describe, expect, it } from 'vitest'
import { chargerJeuEssai } from '../../tests/jeux-essai/charger'
import { diagnostiquerCalage } from './calage'
import { placer, placerVariante, trierUnites } from './placeur'
import type { Camion, Placement, Unite } from './types'
import { validerPlan } from './validateur'

const camion: Camion = { longueur: 7200, largeur: 2400, hauteur: 2500 }

/** Une boîte à plat seulement, porteuse, non fragile. */
function boite(id: string, l: number, w: number, h: number, options: Partial<Unite> = {}): Unite {
  return {
    id,
    commandeRang: 1,
    dims: { l, w, h },
    poids: 100,
    fragile: false,
    porteur: true,
    orientations: ['aPlat'],
    ...options,
  }
}

function fixe(uniteId: string, x: number, y: number, z = 0, rang = 1): Placement {
  return { uniteId, x, y, z, orientation: 'aPlat', rang }
}

/** Position d'une unité dans le résultat. */
function position(placements: Placement[], uniteId: string) {
  const p = placements.find((q) => q.uniteId === uniteId)
  return p && { x: p.x, y: p.y, z: p.z }
}

describe('trierUnites', () => {
  it('RG-07 : range d’abord la commande livrée en dernier', () => {
    const unites = [boite('C1', 100, 100, 100), boite('C3', 100, 100, 100, { commandeRang: 3 })]
    expect(trierUnites(unites).map((u) => u.id)).toEqual(['C3', 'C1'])
  })

  it('RG-05 : dans une commande, les plus lourds d’abord, puis les plus volumineux', () => {
    const unites = [
      boite('leger', 100, 100, 100, { poids: 10 }),
      boite('petit', 100, 100, 100, { poids: 50 }),
      boite('gros', 200, 200, 200, { poids: 50 }),
    ]
    expect(trierUnites(unites).map((u) => u.id)).toEqual(['gros', 'petit', 'leger'])
  })

  it('ne modifie pas la liste reçue', () => {
    const unites = [boite('A', 100, 100, 100), boite('B', 100, 100, 100, { poids: 500 })]
    trierUnites(unites)
    expect(unites.map((u) => u.id)).toEqual(['A', 'B'])
  })
})

describe('placer', () => {
  it('pose la première unité dans le coin du fond, à gauche, au plancher', () => {
    const { placements, enTrop } = placer([boite('P', 1200, 1000, 1000)], camion)
    expect(placements).toEqual([fixe('P', 0, 0)])
    expect(enTrop).toEqual([])
  })

  it('comble le fond en largeur avant d’avancer vers les portes (compacité)', () => {
    const unites = [boite('P1', 1200, 1000, 1000), boite('P2', 1200, 1000, 1000)]
    const { placements } = placer(unites, camion)
    expect(position(placements, 'P2')).toEqual({ x: 0, y: 1000, z: 0 })
  })

  it('préfère, à compacité égale, la place la mieux calée', () => {
    // Un vide de 600 mm entre P et Q, au fond : U s'y loge, calé des deux côtés,
    // plutôt que sur P où il ne toucherait que la paroi gauche.
    const unites = [
      boite('P', 1200, 1000, 1000),
      boite('Q', 1200, 800, 1000),
      boite('U', 1200, 600, 500, { poids: 50 }),
    ]
    const fixes = [fixe('P', 0, 0), fixe('Q', 0, 1600)]
    const { placements } = placer(unites, camion, fixes)
    expect(position(placements, 'U')).toEqual({ x: 0, y: 1000, z: 0 })
  })

  it('RG-04 : met le plus lourd en bas quand il faut empiler', () => {
    const colonne: Camion = { longueur: 1200, largeur: 1000, hauteur: 2500 }
    const unites = [
      boite('leger', 1200, 1000, 1000, { poids: 100 }),
      boite('lourd', 1200, 1000, 1000, { poids: 900 }),
    ]
    const { placements } = placer(unites, colonne)
    expect(position(placements, 'lourd')).toEqual({ x: 0, y: 0, z: 0 })
    expect(position(placements, 'leger')).toEqual({ x: 0, y: 0, z: 1000 })
  })

  it('RG-07 : met au fond la commande livrée en dernier', () => {
    const couloir: Camion = { longueur: 3000, largeur: 1000, hauteur: 1000 }
    const unites = [
      boite('livreeEnPremier', 1200, 1000, 1000, { commandeRang: 1 }),
      boite('livreeEnDernier', 1200, 1000, 1000, { commandeRang: 2 }),
    ]
    const { placements } = placer(unites, couloir)
    expect(position(placements, 'livreeEnDernier')).toEqual({ x: 0, y: 0, z: 0 })
    expect(position(placements, 'livreeEnPremier')).toEqual({ x: 1200, y: 0, z: 0 })
  })

  it('RG-04 : essaie les orientations autorisées, ici debout contre une paroi', () => {
    const fenetre = boite('F', 1500, 1350, 180, { orientations: ['debout'] })
    const { placements } = placer([fenetre], camion)
    expect(placements[0]).toMatchObject({ x: 0, y: 0, z: 0, orientation: 'debout' })
  })

  it('RG-10 : met en trop une unité trop grande pour la caisse', () => {
    const unites = [boite('P', 1200, 1000, 1000), boite('geant', 8000, 1000, 1000)]
    const { placements, enTrop } = placer(unites, camion)
    expect(placements.map((p) => p.uniteId)).toEqual(['P'])
    expect(enTrop.map((u) => u.id)).toEqual(['geant'])
  })

  it('RG-10 : met en trop ce qui ne rentre plus une fois la caisse pleine', () => {
    const petite: Camion = { longueur: 1200, largeur: 1000, hauteur: 1000 }
    const unites = [boite('P1', 1200, 1000, 1000), boite('P2', 1200, 1000, 1000)]
    const { placements, enTrop } = placer(unites, petite)
    expect(placements).toHaveLength(1)
    expect(enTrop).toHaveLength(1)
  })

  it('garde les placements fixes et numérote les nouveaux à leur suite', () => {
    const unites = [boite('F', 1200, 1000, 1000), boite('N', 1200, 1000, 1000)]
    const { placements } = placer(unites, camion, [fixe('F', 0, 0, 0, 1)])
    expect(placements).toEqual([fixe('F', 0, 0, 0, 1), fixe('N', 0, 1000, 0, 2)])
  })

  it('numérote le rang de chargement dans l’ordre où les places sont trouvées', () => {
    const unites = [boite('A', 1200, 1000, 1000), boite('B', 1200, 1000, 1000)]
    expect(placer(unites, camion).placements.map((p) => p.rang)).toEqual([1, 2])
  })
})

describe('placerVariante : sens de parcours en largeur', () => {
  it('part de la paroi droite dans le sens droite-gauche', () => {
    const unites = [boite('P1', 1200, 1000, 1000), boite('P2', 1200, 1000, 1000)]
    const { placements } = placerVariante(unites, camion, [], () => 'droiteGauche')
    expect(position(placements, 'P1')).toEqual({ x: 0, y: 1400, z: 0 })
    expect(position(placements, 'P2')).toEqual({ x: 0, y: 400, z: 0 })
  })
})

describe('placerVariante : point contre la paroi opposée', () => {
  // Deux palettes de 1 000 mm de large dans une caisse de 2 400 mm. Sans le
  // point, la seconde se colle à la première ; avec, elle peut aussi aller
  // contre la paroi d'en face : même compacité, même surface de contact
  // (la paroi au lieu de la palette), mais un centre de gravité sur l'axe.
  const unites = [boite('P1', 1200, 1000, 1000), boite('P2', 1200, 1000, 1000)]

  it('RG-20 : pousse la seconde palette contre la paroi droite, en partant de la gauche', () => {
    const { placements } = placerVariante(unites, camion, [], () => 'gaucheDroite', {
      pointParoiOpposee: true,
    })
    expect(position(placements, 'P1')).toEqual({ x: 0, y: 0, z: 0 })
    expect(position(placements, 'P2')).toEqual({ x: 0, y: 1400, z: 0 })
  })

  it('RG-20 : pousse la seconde palette contre la paroi gauche, en partant de la droite', () => {
    const { placements } = placerVariante(unites, camion, [], () => 'droiteGauche', {
      pointParoiOpposee: true,
    })
    expect(position(placements, 'P1')).toEqual({ x: 0, y: 1400, z: 0 })
    expect(position(placements, 'P2')).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('n’ajoute pas ce point par défaut', () => {
    const { placements } = placerVariante(unites, camion, [], () => 'gaucheDroite')
    expect(position(placements, 'P2')).toEqual({ x: 0, y: 1000, z: 0 })
  })

  it('ajoute aussi ce point autour des placements fixes', () => {
    const { placements } = placerVariante(
      unites,
      camion,
      [fixe('P1', 0, 0)],
      () => 'gaucheDroite',
      {
        pointParoiOpposee: true,
      },
    )
    expect(position(placements, 'P2')).toEqual({ x: 0, y: 1400, z: 0 })
  })
})

describe('placer : jeu d’essai « couloirs »', () => {
  const jeu = chargerJeuEssai('couloirs')
  const { placements, enTrop } = placer(jeu.unites, jeu.camion)

  it('RG-10 : place toutes les unités, aucune en trop', () => {
    expect(enTrop).toEqual([])
    expect(placements).toHaveLength(12)
  })

  it('RG-04, RG-06, RG-07, RG-18, RG-19 : produit un plan accepté par le validateur', () => {
    expect(validerPlan(placements, jeu.unites, jeu.camion)).toEqual([])
  })

  it('ne laisse aucun article mal calé', () => {
    expect(diagnostiquerCalage(placements, jeu.unites, jeu.camion)).toEqual([])
  })
})
