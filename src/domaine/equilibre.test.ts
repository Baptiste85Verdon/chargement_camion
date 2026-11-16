import { describe, expect, it } from 'vitest'
import { chargerJeuEssai } from '../../tests/jeux-essai/charger'
import { mesurerEquilibre, pourcentagesAffiches } from './equilibre'
import type { Camion, Placement, Unite } from './types'

/** Une caisse de 1 000 mm de large : 1 mm de centre de gravité = 0,1 %. */
const etroit: Camion = { longueur: 4000, largeur: 1000, hauteur: 2000 }

/** Un colis de 100 mm de large et 100 kg, de la commande de rang `rang`. */
function colis(id: string, rang = 1, poids = 100): Unite {
  return {
    id,
    commandeRang: rang,
    dims: { l: 100, w: 100, h: 100 },
    poids,
    fragile: false,
    porteur: true,
    orientations: ['aPlat'],
  }
}

function poser(uniteId: string, x: number, y: number, z = 0): Placement {
  return { uniteId, x, y, z, orientation: 'aPlat', rang: 1 }
}

/** Statut d'un plan d'un seul colis dont le centre est à `centreY` mm de la paroi gauche. */
function statutPourCentre(centreY: number) {
  return mesurerEquilibre([poser('A', 0, centreY - 50)], [colis('A')], etroit).statut
}

describe('mesurerEquilibre : jeu d’essai « couloirs sans C4 » (RG-20)', () => {
  const jeu = chargerJeuEssai('couloirs-sans-c4')
  const mesure = mesurerEquilibre(jeu.placements, jeu.unites, jeu.camion)

  it('RG-20 : donne 56 / 44 au départ, 60 / 40 après C1 et après C2, « À surveiller »', () => {
    expect(mesure.etapes.map((e) => pourcentagesAffiches(e.partGauche))).toEqual([
      [56, 44],
      [60, 40],
      [60, 40],
    ])
    expect(mesure.statut).toBe('aSurveiller')
  })
})

describe('mesurerEquilibre : jeu d’essai « couloirs » (RG-20)', () => {
  const jeu = chargerJeuEssai('couloirs')
  const mesure = mesurerEquilibre(jeu.placements, jeu.unites, jeu.camion)
  const parts = mesure.etapes.map((e) => pourcentagesAffiches(e.partGauche))

  it('RG-20 : mesure au départ puis après chaque livraison sauf la dernière', () => {
    expect(mesure.etapes.map((e) => e.apres)).toEqual([null, 1, 2, 3])
  })

  it('RG-20 : donne le poids restant dans le camion à chaque étape', () => {
    const total = jeu.unites.reduce((s, u) => s + u.poids, 0)
    expect(mesure.etapes[0]?.poids).toBe(total)
    const poids = mesure.etapes.map((e) => e.poids)
    expect(poids).toEqual([...poids].sort((a, b) => b - a))
  })

  it('RG-20 : donne 55 / 45 au départ, 59 / 41 après C1 et C2, 58 / 42 après C3', () => {
    expect(parts).toEqual([
      [55, 45],
      [59, 41],
      [59, 41],
      [58, 42],
    ])
  })

  it('RG-20 : place le centre de gravité à environ 2,22 m du fond et 12 cm à gauche de l’axe', () => {
    const depart = mesure.etapes[0]
    // Valeur exacte à 1 mm près : 2 225 mm tombe pile sur une limite
    // d'arrondi à 10 mm (2 224,98 mm avec les poutres de 219,8 kg).
    expect(Math.abs((depart?.cgX ?? 0) - 2225)).toBeLessThanOrEqual(1)
    expect(Math.round((depart?.cgY ?? 0) - jeu.camion.largeur / 2)).toBe(-124)
  })

  it('RG-20 : retient le statut « À surveiller » au pire moment de la tournée', () => {
    expect(mesure.statut).toBe('aSurveiller')
  })
})

describe('mesurerEquilibre : calcul et statut (RG-20)', () => {
  it('RG-20 : calcule le centre de gravité pondéré par les poids', () => {
    const unites = [colis('A', 1, 300), colis('B', 1, 100)]
    const mesure = mesurerEquilibre([poser('A', 0, 0), poser('B', 400, 800)], unites, etroit)
    // Centres : A (50 ; 50), B (450 ; 850). cgX = (300×50 + 100×450) / 400 = 150.
    expect(mesure.etapes[0]).toEqual({
      apres: null,
      poids: 400,
      partGauche: 0.75,
      cgX: 150,
      cgY: 250,
    })
  })

  it('RG-20 : retire les commandes livrées et saute les rangs absents', () => {
    const unites = [colis('A', 3), colis('B', 1)]
    const mesure = mesurerEquilibre([poser('A', 0, 0), poser('B', 0, 900)], unites, etroit)
    expect(mesure.etapes.map((e) => [e.apres, e.partGauche])).toEqual([
      [null, 0.5],
      [1, 0.95],
    ])
  })

  it('RG-20 : juge le statut sur les pourcentages arrondis tels qu’affichés', () => {
    expect(statutPourCentre(500)).toBe('equilibre') // 50 / 50
    expect(statutPourCentre(446)).toBe('equilibre') // 55,4 % affiché 55
    expect(statutPourCentre(445)).toBe('aSurveiller') // 55,5 % affiché 56
    expect(statutPourCentre(396)).toBe('aSurveiller') // 60,4 % affiché 60
    expect(statutPourCentre(394)).toBe('desequilibre') // 60,6 % affiché 61
  })

  it('RG-20 : juge les deux côtés de la même façon', () => {
    expect(statutPourCentre(554)).toBe('equilibre') // 44,6 / 55,4
    expect(statutPourCentre(606)).toBe('desequilibre') // 39,4 / 60,6
  })

  it('RG-20 : affiche des pourcentages dont la somme fait 100', () => {
    expect(pourcentagesAffiches(0.555)).toEqual([56, 44])
    expect(pourcentagesAffiches(0.445)).toEqual([45, 55])
  })

  it('RG-20 : retient le pire moment, même s’il vient après une livraison', () => {
    // Équilibré au départ, tout à gauche une fois la commande 1 livrée.
    const unites = [colis('A', 2), colis('B', 1)]
    const mesure = mesurerEquilibre([poser('A', 0, 0), poser('B', 0, 900)], unites, etroit)
    expect(mesure.statut).toBe('desequilibre')
  })

  it('RG-20 : un plan vide n’a aucune étape et reste équilibré', () => {
    expect(mesurerEquilibre([], [], etroit)).toEqual({ etapes: [], statut: 'equilibre' })
  })
})
