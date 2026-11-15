import { describe, expect, it } from 'vitest'
import { chargerJeuEssai } from '../../tests/jeux-essai/charger'
import {
  HAUTEUR_MAX_LOURD,
  POIDS_LOURD,
  SEUIL_APPUI,
  SEUIL_CALAGE,
  TOLERANCE_CONTACT,
} from './constantes'
import type { Camion, Placement, Unite } from './types'
import { valider, validerPlan } from './validateur'

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
    expect(valider(poser('P2', 1200, 0, 500), [p1], unites, camion)).toEqual([
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

  // Vu du dessous : `p` est glissé sous un article déjà posé. C'est ce que
  // fera un déplacement manuel (prototype 2) ou un échange d'`optimiser`.

  it('RG-04 : refuse un fragile glissé sous un article déjà posé', () => {
    expect(valider(poser('F1', 0, 0), [poser('P2', 0, 0, 1000)], unites, camion)).toEqual([
      { regle: 'RG-04', motif: 'fragileCharge', uniteId: 'F1', autreUniteId: 'P2' },
    ])
  })

  it('RG-18 : refuse un dessus non porteur glissé sous un article déjà posé', () => {
    expect(valider(poser('N1', 0, 0), [poser('P2', 0, 0, 1000)], unites, camion)).toEqual([
      { regle: 'RG-18', motif: 'nonPorteurCharge', uniteId: 'N1', autreUniteId: 'P2' },
    ])
  })

  it('RG-04 : refuse un article léger glissé sous un plus lourd', () => {
    expect(valider(poser('L1', 0, 0), [poser('P2', 0, 0, 1000)], unites, camion)).toEqual([
      { regle: 'RG-04', motif: 'sousPlusLourd', uniteId: 'L1', autreUniteId: 'P2' },
    ])
  })

  it('RG-04 : refuse l’échange d’une pile qui met le léger sous le lourd', () => {
    // Avant : L1 sur P1, permis. Après l'échange des deux positions, P1 est
    // sur L1 : chacun des deux placements échangés est refusé.
    const lourdDessus = poser('P1', 0, 0, 1000)
    const legerDessous = poser('L1', 0, 0)
    const apres = [legerDessous, lourdDessus]
    expect(valider(lourdDessus, apres, unites, camion)).toEqual([
      { regle: 'RG-04', motif: 'surPlusLeger', uniteId: 'P1', autreUniteId: 'L1' },
    ])
    expect(valider(legerDessous, apres, unites, camion)).toEqual([
      { regle: 'RG-04', motif: 'sousPlusLourd', uniteId: 'L1', autreUniteId: 'P1' },
    ])
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

  // Règle 7 élargie : un article livré plus tard gêne dès que son bas est
  // plus bas que le dessus de A, même s'il ne chevauche pas A en hauteur.
  // On ne fait pas passer un article par-dessus le chargement.
  describe('par-dessus le chargement', () => {
    /** Carton 600 × 600 × 600, livré au rang 1. */
    const carton: Unite = { ...livree('T3', 1), dims: { l: 600, w: 600, h: 600 }, poids: 30 }
    /** Botte basse 1 200 × 1 000 × 400, livrée au rang 2 comme la palette R2. */
    const botte: Unite = { ...livree('B2', 2), dims: { l: 1200, w: 1000, h: 400 } }
    const tous = [...unites, carton, botte]
    // Au fond : la palette R2 (z 0 à 1 000) et le carton posé dessus (z 1 000
    // à 1 600). Devant, côté portes : la botte B2 (z 0 à 400), plus basse.
    const r2 = poser('R2', 0, 0)
    const t3 = poser('T3', 0, 200, 1000)
    const b2 = poser('B2', 1200, 0)
    const plan = [r2, t3, b2]

    it('RG-07 : refuse un article derrière un article livré plus tard et plus bas que son dessus', () => {
      expect(valider(t3, plan, tous, camion)).toEqual([
        { regle: 'RG-07', motif: 'accesBloque', uniteId: 'T3', autreUniteId: 'B2' },
      ])
      expect(valider(b2, plan, tous, camion)).toEqual([
        { regle: 'RG-07', motif: 'bloqueAcces', uniteId: 'B2', autreUniteId: 'T3' },
      ])
    })

    it('RG-07 : accepte un article livré plus tard dont le bas est au niveau du dessus de A', () => {
      // T1 au plancher (z 0 à 1 000). Devant, T2 de la même commande, et sur
      // T2 la palette R2, livrée plus tard, de z 1 000 à 2 000.
      const plan2 = [poser('T1', 0, 0), poser('T2', 1200, 0), poser('R2', 1200, 0, 1000)]
      expect(valider(poser('T1', 0, 0), plan2, unites, camion)).toEqual([])
    })

    it('RG-07 : accepte un article livré plus tard devant A, hors de sa bande en largeur', () => {
      const plan3 = [r2, t3, poser('B2', 1200, 1400)]
      expect(valider(t3, plan3, tous, camion)).toEqual([])
    })
  })
})

describe('valider : calage des articles debout (règle 8, RG-19)', () => {
  /** Fenêtre 1 500 × 1 350 × 180 à plat, soit 1 500 × 180 × 1 350 debout. */
  function fenetre(id: string): Unite {
    return {
      ...palette(id),
      dims: { l: 1500, w: 1350, h: 180 },
      poids: 45,
      fragile: true,
      orientations: ['debout'],
    }
  }
  /** Palette basse : 1 200 × 600 = 36 % de la grande face d'une fenêtre. */
  const basse: Unite = { ...palette('B1'), dims: { l: 1200, w: 1000, h: 600 } }
  const unites = [palette('P1'), basse, fenetre('F1'), fenetre('F2')]

  function deboutEn(uniteId: string, y: number, x = 0): Placement {
    return { uniteId, x, y, z: 0, orientation: 'debout', rang: 1 }
  }

  it('RG-19 : accepte une fenêtre debout contre une paroi', () => {
    expect(valider(deboutEn('F1', 0), [], unites, camion)).toEqual([])
    expect(valider(deboutEn('F1', 2400 - 180), [], unites, camion)).toEqual([])
  })

  it(`RG-19 : tolère un écart de ${TOLERANCE_CONTACT} mm avec la paroi`, () => {
    expect(valider(deboutEn('F1', TOLERANCE_CONTACT), [], unites, camion)).toEqual([])
  })

  it('RG-19 : refuse une fenêtre debout seule au milieu de la caisse', () => {
    expect(valider(deboutEn('F1', 1000), [], unites, camion)).toEqual([
      { regle: 'RG-19', motif: 'deboutNonCale', uniteId: 'F1' },
    ])
  })

  it(`RG-19 : accepte une fenêtre appuyée contre un article qui couvre ${SEUIL_CALAGE * 100} % de sa face ou plus`, () => {
    // La palette couvre 1 200 × 1 000 mm de la face de 1 500 × 1 350 : 59 %.
    const plan = [poser('P1', 0, 0)]
    expect(valider(deboutEn('F1', 1000), plan, unites, camion)).toEqual([])
    expect(valider(deboutEn('F1', 1000 + TOLERANCE_CONTACT), plan, unites, camion)).toEqual([])
  })

  it('RG-19 : refuse une fenêtre appuyée contre un article qui couvre moins du seuil', () => {
    expect(valider(deboutEn('F1', 1000), [poser('B1', 0, 0)], unites, camion)).toEqual([
      { regle: 'RG-19', motif: 'deboutNonCale', uniteId: 'F1' },
    ])
  })

  it('RG-19 : accepte une fenêtre appuyée contre une fenêtre calée par une paroi', () => {
    const f1 = deboutEn('F1', 0)
    const f2 = deboutEn('F2', 180)
    expect(valider(f2, [f1, f2], unites, camion)).toEqual([])
  })

  it('RG-19 : accepte un groupe de fenêtres dont l’une s’appuie contre un article qui n’est pas debout', () => {
    const plan = [poser('P1', 0, 0), deboutEn('F1', 1000), deboutEn('F2', 1180)]
    expect(valider(deboutEn('F2', 1180), plan, unites, camion)).toEqual([])
  })

  it('RG-19 : refuse deux fenêtres face à face, seules au milieu de la caisse', () => {
    const f1 = deboutEn('F1', 1000)
    const f2 = deboutEn('F2', 1180)
    expect(valider(f1, [f1, f2], unites, camion)).toEqual([
      { regle: 'RG-19', motif: 'deboutNonCale', uniteId: 'F1' },
    ])
    expect(valider(f2, [f1, f2], unites, camion)).toEqual([
      { regle: 'RG-19', motif: 'deboutNonCale', uniteId: 'F2' },
    ])
  })
})

describe('valider : articles debout au plancher (règle 9, RG-04)', () => {
  /** Paquet de BA13 2 500 × 1 200 × 250, soit 2 500 × 250 × 1 200 contre une paroi. */
  function plaque(id: string): Unite {
    return {
      ...palette(id),
      dims: { l: 2500, w: 1200, h: 250 },
      poids: 500,
      orientations: ['aPlat', 'contreParoi'],
    }
  }
  /** Fenêtre 1 500 × 180 × 1 350 debout. */
  const fenetre: Unite = {
    ...palette('F1'),
    dims: { l: 1500, w: 1350, h: 180 },
    poids: 45,
    fragile: true,
    orientations: ['debout'],
  }
  const carton: Unite = { ...palette('K1'), dims: { l: 600, w: 200, h: 200 }, poids: 30 }
  const unites = [palette('P1'), plaque('B1'), plaque('B2'), fenetre, carton]

  function contreParoi(uniteId: string, z: number): Placement {
    return { uniteId, x: 0, y: 0, z, orientation: 'contreParoi', rang: 1 }
  }

  it('RG-04 : accepte une plaque contre une paroi, seule au plancher', () => {
    expect(valider(contreParoi('B1', 0), [], unites, camion)).toEqual([])
  })

  it('RG-04 : refuse une plaque contre une paroi posée sur une autre plaque contre une paroi', () => {
    const b1 = contreParoi('B1', 0)
    const b2 = contreParoi('B2', 1200)
    expect(valider(b2, [b1, b2], unites, camion)).toEqual([
      { regle: 'RG-04', motif: 'deboutHorsPlancher', uniteId: 'B2' },
      { regle: 'RG-04', motif: 'surDebout', uniteId: 'B2', autreUniteId: 'B1' },
    ])
    // Vu du dessous : un article est posé sur B1.
    expect(valider(b1, [b1, b2], unites, camion)).toEqual([
      { regle: 'RG-04', motif: 'deboutCharge', uniteId: 'B1', autreUniteId: 'B2' },
    ])
  })

  it('RG-04 : refuse une fenêtre debout posée sur une palette, même bien appuyée et calée', () => {
    const f1: Placement = { uniteId: 'F1', x: 0, y: 0, z: 1000, orientation: 'debout', rang: 1 }
    expect(valider(f1, [poser('P1', 0, 0)], unites, camion)).toEqual([
      { regle: 'RG-04', motif: 'deboutHorsPlancher', uniteId: 'F1' },
    ])
  })

  it('RG-04 : refuse un article à plat posé sur une plaque contre une paroi', () => {
    const b1 = contreParoi('B1', 0)
    const k1 = poser('K1', 0, 0, 1200)
    expect(valider(k1, [b1, k1], unites, camion)).toEqual([
      { regle: 'RG-04', motif: 'surDebout', uniteId: 'K1', autreUniteId: 'B1' },
    ])
    expect(valider(b1, [b1, k1], unites, camion)).toEqual([
      { regle: 'RG-04', motif: 'deboutCharge', uniteId: 'B1', autreUniteId: 'K1' },
    ])
  })

  it('RG-04 : accepte une plaque à plat posée sur une palette', () => {
    const socle: Unite = { ...palette('P1'), dims: { l: 2500, w: 1200, h: 1000 } }
    const b1 = poser('B1', 0, 0, 1000)
    expect(valider(b1, [poser('P1', 0, 0)], [socle, plaque('B1')], camion)).toEqual([])
  })
})

describe('valider : lourds en hauteur (règle 10, RG-04)', () => {
  /** Palette de parpaings 1 200 × 1 000 × 1 050, de `poids` kg. */
  function parpaings(id: string, poids: number): Unite {
    return { ...palette(id), dims: { l: 1200, w: 1000, h: 1050 }, poids }
  }
  /** Socle de 1 000 mm de haut, plus lourd que tout ce qu'il porte. */
  const socle: Unite = { ...palette('S1'), poids: 2000 }
  const unites = [
    parpaings('A01', 1225),
    parpaings('A03', 1225),
    parpaings('M1', POIDS_LOURD),
    parpaings('M2', POIDS_LOURD + 1),
    socle,
  ]

  it(`RG-04 : refuse un article de plus de ${POIDS_LOURD} kg dont la base est à plus de ${HAUTEUR_MAX_LOURD} mm du plancher`, () => {
    const a01 = poser('A01', 0, 0)
    expect(valider(poser('A03', 0, 0, 1050), [a01], unites, camion)).toEqual([
      { regle: 'RG-04', motif: 'lourdEnHauteur', uniteId: 'A03' },
    ])
    expect(valider(poser('M2', 0, 0, 1050), [a01], unites, camion)).toEqual([
      { regle: 'RG-04', motif: 'lourdEnHauteur', uniteId: 'M2' },
    ])
  })

  it(`RG-04 : accepte un article de ${POIDS_LOURD} kg pile posé en hauteur`, () => {
    expect(valider(poser('M1', 0, 0, 1050), [poser('A01', 0, 0)], unites, camion)).toEqual([])
  })

  it(`RG-04 : accepte un lourd dont la base est à ${HAUTEUR_MAX_LOURD} mm pile du plancher`, () => {
    expect(valider(poser('A03', 0, 0, 1000), [poser('S1', 0, 0)], unites, camion)).toEqual([])
  })
})

describe("valider : jeux d'essai de référence", () => {
  /** Valide chaque placement du jeu contre tout le plan et regroupe les refus. */
  function refusDuJeu(nom: 'couloirs' | 'fenetres-isolees') {
    const jeu = chargerJeuEssai(nom)
    const refus = jeu.placements.flatMap((p) => valider(p, jeu.placements, jeu.unites, jeu.camion))
    return { jeu, refus }
  }

  it('RG-04, RG-06, RG-07, RG-18 et RG-19 : le jeu « couloirs » n’enfreint aucune règle', () => {
    const { jeu, refus } = refusDuJeu('couloirs')
    expect(jeu.attendu.reglesEnfreintes).toEqual([])
    expect(refus).toEqual([])
  })

  it('RG-19 : la variante « fenêtres isolées » refuse A10 et A11, articles debout sans calage', () => {
    const { jeu, refus } = refusDuJeu('fenetres-isolees')
    const attendus = jeu.attendu.reglesEnfreintes.map((r) => ({ uniteId: r.unite, regle: r.regle }))
    expect(refus.map((r) => ({ uniteId: r.uniteId, regle: r.regle }))).toEqual(attendus)
    expect(refus.every((r) => r.motif === 'deboutNonCale')).toBe(true)
  })
})

describe('validerPlan', () => {
  it('RG-06 : regroupe les refus de chaque placement du plan', () => {
    const unites = [palette('P1'), palette('P2')]
    const plan = [poser('P1', 0, 0), poser('P2', 600, 0)]
    expect(validerPlan(plan, unites, camion)).toEqual([
      { regle: 'RG-06', motif: 'chevauchement', uniteId: 'P1', autreUniteId: 'P2' },
      { regle: 'RG-06', motif: 'chevauchement', uniteId: 'P2', autreUniteId: 'P1' },
    ])
  })

  it('accepte le jeu « couloirs »', () => {
    const jeu = chargerJeuEssai('couloirs')
    expect(validerPlan(jeu.placements, jeu.unites, jeu.camion)).toEqual([])
  })
})
