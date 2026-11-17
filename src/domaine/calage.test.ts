import { describe, expect, it } from 'vitest'
import { chargerJeuEssai } from '../../tests/jeux-essai/charger'
import { diagnostiquerCalage } from './calage'
import { TOLERANCE_CONTACT } from './constantes'
import type { Camion, Placement, Unite } from './types'

const camion: Camion = { longueur: 7200, largeur: 2400, hauteur: 2500 }

/** Un carton 600 × 600 × 600, à plat. */
function carton(id: string): Unite {
  return {
    id,
    commandeRang: 1,
    dims: { l: 600, w: 600, h: 600 },
    poids: 30,
    fragile: false,
    porteur: true,
    orientations: ['aPlat'],
  }
}

function poser(uniteId: string, x: number, y: number, z = 0): Placement {
  return { uniteId, x, y, z, orientation: 'aPlat', rang: 1 }
}

describe('diagnostiquerCalage : articles qui ne sont pas debout (RG-19)', () => {
  const unites = [carton('K1'), carton('K2'), carton('K3')]

  it('RG-19 : ne signale rien pour un carton dans le coin du fond, côté portes libre', () => {
    expect(diagnostiquerCalage([poser('K1', 0, 0)], unites, camion)).toEqual([])
  })

  it('RG-19 : signale un carton qui ne touche rien côté fond', () => {
    expect(diagnostiquerCalage([poser('K1', 100, 0)], unites, camion)).toEqual(['K1'])
  })

  it('RG-19 : signale un carton qui ne touche rien en largeur', () => {
    expect(diagnostiquerCalage([poser('K1', 0, 900)], unites, camion)).toEqual(['K1'])
  })

  it('RG-19 : compte un article comme appui côté fond et en largeur', () => {
    // K2 touche K1 côté fond et la paroi gauche ; K3 touche le fond et K1 en largeur.
    const plan = [poser('K1', 0, 0), poser('K2', 600, 0), poser('K3', 0, 600)]
    expect(diagnostiquerCalage(plan, unites, camion)).toEqual([])
  })

  it(`RG-19 : tolère un écart de ${TOLERANCE_CONTACT} mm`, () => {
    const proche = [poser('K1', 0, 0), poser('K2', 600 + TOLERANCE_CONTACT, 0)]
    expect(diagnostiquerCalage(proche, unites, camion)).toEqual([])
    const loin = [poser('K1', 0, 0), poser('K2', 600 + TOLERANCE_CONTACT + 1, 0)]
    expect(diagnostiquerCalage(loin, unites, camion)).toEqual(['K2'])
  })

  it('RG-19 : ne compte pas un article qui ne touche que par une arête', () => {
    // K2 est en diagonale de K1 : aucune surface commune côté fond.
    const plan = [poser('K1', 0, 0), poser('K2', 600, 600)]
    expect(diagnostiquerCalage(plan, unites, camion)).toEqual(['K2'])
  })
})

describe('diagnostiquerCalage : articles debout (RG-19)', () => {
  const fenetre: Unite = {
    ...carton('F1'),
    dims: { l: 1500, w: 1350, h: 180 },
    fragile: true,
    orientations: ['debout'],
  }
  const unites = [fenetre, { ...fenetre, id: 'F2' }]

  function deboutEn(uniteId: string, y: number): Placement {
    return { uniteId, x: 0, y, z: 0, orientation: 'debout', rang: 1 }
  }

  it('RG-19 : ne signale pas une fenêtre debout contre une paroi, même sans rien côté fond', () => {
    const plan = [{ ...deboutEn('F1', 0), x: 2000 }]
    expect(diagnostiquerCalage(plan, unites, camion)).toEqual([])
  })

  it('RG-19 : signale deux fenêtres face à face, seules au milieu de la caisse', () => {
    const plan = [deboutEn('F1', 1000), deboutEn('F2', 1180)]
    expect(diagnostiquerCalage(plan, unites, camion)).toEqual(['F1', 'F2'])
  })
})

describe("diagnostiquerCalage : jeux d'essai de référence", () => {
  it.each(['couloirs', 'couloirs-sans-c4', 'fenetres-isolees'] as const)(
    'RG-19 : signale les articles mal calés attendus pour le jeu « %s »',
    (nom) => {
      const jeu = chargerJeuEssai(nom)
      expect(diagnostiquerCalage(jeu.placements, jeu.unites, jeu.camion)).toEqual(
        jeu.attendu.malCales,
      )
    },
  )
})
