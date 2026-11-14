import { describe, expect, it } from 'vitest'
import { chargerJeuEssai } from '../../tests/jeux-essai/charger'
import { SEUIL_APPUI, TOLERANCE_CONTACT } from './constantes'
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
  /** Des colis aussi hauts que la caisse, puis 1 mm de trop. */
  const pleineHauteur: Unite = { ...palette('H0'), dims: { l: 1200, w: 1000, h: 2500 } }
  const tropHaut: Unite = { ...palette('H1'), dims: { l: 1200, w: 1000, h: 2501 } }
  const unites = [palette('P1'), pleineHauteur, tropHaut]

  it('RG-06 : accepte une unité posée dans le coin du fond', () => {
    expect(valider(poser('P1', 0, 0), [], unites, camion)).toEqual([])
  })

  it('RG-06 : accepte une unité qui touche exactement les parois et le plafond', () => {
    expect(valider(poser('P1', 6000, 1400), [], unites, camion)).toEqual([])
    expect(valider(poser('H0', 0, 0), [], unites, camion)).toEqual([])
  })

  it.each([
    ['côté portes', poser('P1', 6001, 0)],
    ['côté paroi droite', poser('P1', 0, 1401)],
    ['par le haut', poser('H1', 0, 0)],
    ['côté fond', poser('P1', -1, 0)],
    ['côté paroi gauche', poser('P1', 0, -1)],
    ['sous le plancher', poser('P1', 0, 0, -1)],
  ])('RG-06 : refuse une unité qui dépasse %s', (_cote, p) => {
    expect(valider(p, [], unites, camion)).toEqual([
      { regle: 'RG-06', motif: 'horsCaisse', uniteId: p.uniteId },
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

describe('valider : orientation autorisée (RG-04)', () => {
  /** Une plaque 2 500 × 1 200 × 250, à plat ou contre une paroi. */
  const plaque: Unite = {
    ...palette('B1'),
    dims: { l: 2500, w: 1200, h: 250 },
    orientations: ['aPlat', 'contreParoi'],
  }
  const unites = [palette('P1'), plaque]

  function plaqueEn(orientation: Placement['orientation'], y: number): Placement {
    return { uniteId: 'B1', x: 0, y, z: 0, orientation, rang: 1 }
  }

  it('RG-04 : refuse une orientation que l’unité n’autorise pas', () => {
    expect(valider(plaqueEn('debout', 1000), [], unites, camion)).toEqual([
      { regle: 'RG-04', motif: 'orientationInterdite', uniteId: 'B1' },
    ])
  })

  it('RG-04 : refuse une palette posée debout', () => {
    const p: Placement = { ...poser('P1', 0, 0), orientation: 'debout' }
    expect(valider(p, [], unites, camion)).toContainEqual({
      regle: 'RG-04',
      motif: 'orientationInterdite',
      uniteId: 'P1',
    })
  })

  it('RG-04 : accepte une plaque contre la paroi gauche', () => {
    expect(valider(plaqueEn('contreParoi', 0), [], unites, camion)).toEqual([])
  })

  it('RG-04 : accepte une plaque contre la paroi droite', () => {
    // Contre une paroi, la plaque fait 250 mm de large : 2 400 − 250 = 2 150.
    expect(valider(plaqueEn('contreParoi', 2150), [], unites, camion)).toEqual([])
  })

  it(`RG-04 : tolère un écart de ${TOLERANCE_CONTACT} mm avec la paroi`, () => {
    expect(valider(plaqueEn('contreParoi', TOLERANCE_CONTACT), [], unites, camion)).toEqual([])
    expect(valider(plaqueEn('contreParoi', 2150 - TOLERANCE_CONTACT), [], unites, camion)).toEqual(
      [],
    )
  })

  it('RG-04 : refuse une plaque « contre une paroi » qui ne touche aucune paroi', () => {
    expect(valider(plaqueEn('contreParoi', TOLERANCE_CONTACT + 1), [], unites, camion)).toEqual([
      { regle: 'RG-04', motif: 'paroiAbsente', uniteId: 'B1' },
    ])
  })
})

describe("valider : jeux d'essai de référence, règles 1 à 3", () => {
  it.each(['couloirs', 'fenetres-isolees'] as const)(
    'RG-04 et RG-06 : chaque placement du jeu « %s » est dans la caisse, sans chevauchement et bien orienté',
    (nom) => {
      const jeu = chargerJeuEssai(nom)
      for (const p of jeu.placements) {
        expect(valider(p, jeu.placements, jeu.unites, jeu.camion), p.uniteId).toEqual([])
      }
    },
  )
})

describe('valider : unité inconnue', () => {
  it('lève une erreur si le placement désigne une unité absente', () => {
    expect(() => valider(poser('X', 0, 0), [], [], camion)).toThrow('X')
  })
})

describe('valider : appui (règle 4, RG-04)', () => {
  const unites = [palette('P1'), palette('P2'), palette('P3')]
  const p1 = poser('P1', 0, 0)

  it('RG-04 : accepte une unité posée entièrement sur une autre', () => {
    expect(valider(poser('P2', 0, 0, 1000), [p1], unites, camion)).toEqual([])
  })

  it(`RG-04 : accepte une unité appuyée sur ${SEUIL_APPUI * 100} % de sa base`, () => {
    // Décalée de 480 mm, la palette repose sur 720 mm de ses 1 200 : 60 %.
    expect(valider(poser('P2', 480, 0, 1000), [p1], unites, camion)).toEqual([])
  })

  it('RG-04 : refuse une unité appuyée sur moins du seuil de sa base', () => {
    // Décalée de 492 mm : 708 / 1 200 = 59 %.
    expect(valider(poser('P2', 492, 0, 1000), [p1], unites, camion)).toEqual([
      { regle: 'RG-04', motif: 'appuiInsuffisant', uniteId: 'P2' },
    ])
  })

  it('RG-04 : refuse une unité suspendue en l’air', () => {
    expect(valider(poser('P2', 0, 0, 1001), [p1], unites, camion)).toEqual([
      { regle: 'RG-04', motif: 'appuiInsuffisant', uniteId: 'P2' },
    ])
  })

  it('RG-04 : additionne l’appui de plusieurs unités', () => {
    // À cheval sur P1 et P3 : 50 % sur chacune, 100 % en tout.
    const p3 = poser('P3', 1200, 0)
    expect(valider(poser('P2', 600, 0, 1000), [p1, p3], unites, camion)).toEqual([])
  })
})

describe('valider : fragiles, dessus non porteurs et lourds en bas (règles 5 et 6)', () => {
  const fragile: Unite = { ...palette('F1'), fragile: true }
  const nonPorteur: Unite = { ...palette('N1'), porteur: false }
  const legere: Unite = { ...palette('L1'), poids: 300 }
  const unites = [palette('P1'), palette('P2'), fragile, nonPorteur, legere]

  it('RG-04 : refuse un article posé sur un article fragile', () => {
    expect(valider(poser('P2', 0, 0, 1000), [poser('F1', 0, 0)], unites, camion)).toEqual([
      { regle: 'RG-04', motif: 'surFragile', uniteId: 'P2', autreUniteId: 'F1' },
    ])
  })

  it('RG-18 : refuse un article posé sur un dessus non porteur', () => {
    expect(valider(poser('P2', 0, 0, 1000), [poser('N1', 0, 0)], unites, camion)).toEqual([
      { regle: 'RG-18', motif: 'surNonPorteur', uniteId: 'P2', autreUniteId: 'N1' },
    ])
  })

  it('RG-04 : refuse un article posé sur un article plus léger', () => {
    expect(valider(poser('P2', 0, 0, 1000), [poser('L1', 0, 0)], unites, camion)).toEqual([
      { regle: 'RG-04', motif: 'surPlusLeger', uniteId: 'P2', autreUniteId: 'L1' },
    ])
  })

  it('RG-04 : accepte un article posé sur un article plus lourd ou de même poids', () => {
    expect(valider(poser('L1', 0, 0, 1000), [poser('P1', 0, 0)], unites, camion)).toEqual([])
    expect(valider(poser('P2', 0, 0, 1000), [poser('P1', 0, 0)], unites, camion)).toEqual([])
  })

  it('RG-04 : accepte un fragile qui touche un autre article sans le porter', () => {
    expect(valider(poser('P2', 1200, 0), [poser('F1', 0, 0)], unites, camion)).toEqual([])
  })
})

describe('valider : accès au déchargement (règle 7, RG-07)', () => {
  /** Une palette de la commande livrée au rang `rang`. */
  function livree(id: string, rang: number): Unite {
    return { ...palette(id), commandeRang: rang }
  }
  const unites = [livree('T1', 1), livree('T2', 1), livree('R2', 2)]

  it('RG-07 : refuse un article bloqué par un article livré plus tard, devant lui dans son couloir', () => {
    expect(valider(poser('T1', 0, 0), [poser('R2', 1200, 0)], unites, camion)).toEqual([
      { regle: 'RG-07', motif: 'accesBloque', uniteId: 'T1', autreUniteId: 'R2' },
    ])
  })

  it('RG-07 : refuse un article livré plus tard qui bloque la sortie d’un article livré plus tôt', () => {
    expect(valider(poser('R2', 1200, 0), [poser('T1', 0, 0)], unites, camion)).toEqual([
      { regle: 'RG-07', motif: 'bloqueAcces', uniteId: 'R2', autreUniteId: 'T1' },
    ])
  })

  it('RG-07 : refuse un article livré plus tard posé sur un article livré plus tôt', () => {
    const t1 = poser('T1', 0, 0)
    const r2 = poser('R2', 0, 0, 1000)
    expect(valider(r2, [t1, r2], unites, camion)).toEqual([
      { regle: 'RG-07', motif: 'bloqueAcces', uniteId: 'R2', autreUniteId: 'T1' },
    ])
    expect(valider(t1, [t1, r2], unites, camion)).toEqual([
      { regle: 'RG-07', motif: 'accesBloque', uniteId: 'T1', autreUniteId: 'R2' },
    ])
  })

  it('RG-07 : accepte un article livré tôt au fond d’un autre couloir', () => {
    const t1 = poser('T1', 0, 0)
    const r2 = poser('R2', 1200, 1000)
    expect(valider(t1, [t1, r2], unites, camion)).toEqual([])
    expect(valider(r2, [t1, r2], unites, camion)).toEqual([])
  })

  it('RG-07 : accepte un article livré tôt posé sur un article livré plus tard', () => {
    const r2 = poser('R2', 0, 0)
    const t1 = poser('T1', 0, 0, 1000)
    expect(valider(r2, [r2, t1], unites, camion)).toEqual([])
    expect(valider(t1, [r2, t1], unites, camion)).toEqual([])
  })

  it('RG-07 : accepte deux articles de la même commande l’un devant l’autre', () => {
    expect(valider(poser('T1', 0, 0), [poser('T2', 1200, 0)], unites, camion)).toEqual([])
  })
})
