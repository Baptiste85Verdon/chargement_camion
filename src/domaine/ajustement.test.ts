import { describe, expect, it } from 'vitest'
import { chargerJeuEssai } from '../../tests/jeux-essai/charger'
import {
  changerOrientation,
  deplacer,
  orientationSuivante,
  poserAuPlusBas,
  reglesCitees,
  remettre,
  retirer,
} from './ajustement'
import { SANS_RANG } from './constantes'
import { boiteDe, gene, trouverUnite } from './geometrie'
import type { Camion, Dimensions, Orientation, Placement, RegleEnfreinte, Unite } from './types'
import { validerPlan } from './validateur'

const camion: Camion = { longueur: 7200, largeur: 2400, hauteur: 2500 }

/** Un colis à plat, porteur, de la commande livrée en premier. */
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

function poser(
  uniteId: string,
  x: number,
  y: number,
  z: number,
  rang: number,
  orientation: Orientation = 'aPlat',
): Placement {
  return { uniteId, x, y, z, orientation, rang }
}

/** Les identifiants dans l'ordre de chargement. */
function ordre(plan: Placement[]): string[] {
  return plan.map((p) => p.uniteId)
}

/** Le placement d'une unité dans un plan rendu. */
function placementDe(plan: Placement[], uniteId: string): Placement | undefined {
  return plan.find((p) => p.uniteId === uniteId)
}

/** Les règles enfreintes d'un refus ; échoue si le changement a été accepté. */
function enfreintesDe(
  resultat: { accepte: true } | { accepte: false; enfreintes: RegleEnfreinte[] },
): RegleEnfreinte[] {
  if (resultat.accepte) throw new Error('Le changement aurait dû être refusé.')
  return resultat.enfreintes
}

/** Le plan d'un changement accepté ; échoue s'il a été refusé. */
function planDe(
  resultat: { accepte: true; plan: Placement[] } | { accepte: false; enfreintes: RegleEnfreinte[] },
): Placement[] {
  if (!resultat.accepte) {
    throw new Error(`Refus inattendu : ${JSON.stringify(resultat.enfreintes)}`)
  }
  return resultat.plan
}

/** Contraintes de 4.8 non respectées par les rangs : si B gêne A, A est chargé avant B. */
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

describe('deplacer : chevauchement et sortie de la caisse (RG-09)', () => {
  const unites = [colis('P1'), colis('P2')]
  const plan = [poser('P1', 0, 0, 0, 1), poser('P2', 1200, 0, 0, 2)]

  it('RG-09 : refuse un déplacement qui fait sortir un article de la caisse', () => {
    expect(enfreintesDe(deplacer(plan, 'P2', { x: 6100, y: 0, z: 0 }, unites, camion))).toEqual([
      { regle: 'RG-06', motif: 'horsCaisse', uniteId: 'P2' },
    ])
  })

  it('RG-09 : refuse un déplacement qui fait chevaucher un autre article', () => {
    expect(enfreintesDe(deplacer(plan, 'P2', { x: 600, y: 0, z: 0 }, unites, camion))).toEqual([
      { regle: 'RG-06', motif: 'chevauchement', uniteId: 'P2', autreUniteId: 'P1' },
    ])
  })

  it("RG-09 : ne cite que le chevauchement, même s'il entraîne d'autres règles", () => {
    // P2 à 300 mm du plancher chevauche P1 et flotte : seul RG-06 est cité.
    const enfreintes = enfreintesDe(deplacer(plan, 'P2', { x: 600, y: 0, z: 300 }, unites, camion))
    expect(enfreintes.map((e) => e.motif)).toEqual(['chevauchement'])
  })

  it('RG-09 : cite RG-06 et RG-09 pour un chevauchement ou une sortie de la caisse', () => {
    expect(reglesCitees({ regle: 'RG-06', motif: 'chevauchement', uniteId: 'P2' })).toEqual([
      'RG-06',
      'RG-09',
    ])
  })
})

describe('deplacer : autres règles de placement (RG-04, RG-07, RG-08, RG-19)', () => {
  it('RG-08 : accepte un déplacement permis et rend le plan avec ses rangs', () => {
    const unites = [colis('P1'), colis('P2')]
    const plan = [poser('P1', 0, 0, 0, 1), poser('P2', 1200, 0, 0, 2)]
    const nouveau = planDe(deplacer(plan, 'P2', { x: 0, y: 1400, z: 0 }, unites, camion))
    expect(nouveau).toEqual([poser('P1', 0, 0, 0, 1), poser('P2', 0, 1400, 0, 2)])
  })

  it('RG-08 : ne modifie pas le plan reçu', () => {
    const unites = [colis('P1'), colis('P2')]
    const plan = [poser('P1', 0, 0, 0, 1), poser('P2', 1200, 0, 0, 2)]
    const copie = structuredClone(plan)
    deplacer(plan, 'P2', { x: 0, y: 1400, z: 0 }, unites, camion)
    expect(plan).toEqual(copie)
  })

  it('RG-04 : refuse un article posé sur un fragile, et cite RG-04 et RG-08', () => {
    const unites = [{ ...colis('FRAGILE'), fragile: true }, colis('P2', { l: 600, w: 600, h: 600 })]
    const plan = [poser('FRAGILE', 0, 0, 0, 1), poser('P2', 1200, 0, 0, 2)]
    const enfreintes = enfreintesDe(deplacer(plan, 'P2', { x: 0, y: 0, z: 1000 }, unites, camion))
    expect(enfreintes[0]).toEqual({
      regle: 'RG-04',
      motif: 'surFragile',
      uniteId: 'P2',
      autreUniteId: 'FRAGILE',
    })
    expect(reglesCitees(enfreintes[0] as RegleEnfreinte)).toEqual(['RG-04', 'RG-08'])
  })

  it("RG-04 : refuse un déplacement qui retire l'appui d'un article posé dessus", () => {
    const unites = [colis('BAS'), colis('HAUT')]
    const plan = [poser('BAS', 0, 0, 0, 1), poser('HAUT', 0, 0, 1000, 2)]
    const enfreintes = enfreintesDe(deplacer(plan, 'BAS', { x: 2400, y: 0, z: 0 }, unites, camion))
    expect(enfreintes).toContainEqual({
      regle: 'RG-04',
      motif: 'appuiInsuffisant',
      uniteId: 'HAUT',
    })
  })

  it('RG-07 : refuse un article de C1 placé derrière un article de C3 dans sa bande', () => {
    const c1 = { ...colis('C1'), commandeRang: 1 }
    const c3 = { ...colis('C3'), commandeRang: 3 }
    const plan = [poser('C3', 1200, 0, 0, 1), poser('C1', 3600, 0, 0, 2)]
    const enfreintes = enfreintesDe(deplacer(plan, 'C1', { x: 0, y: 0, z: 0 }, [c1, c3], camion))
    expect(enfreintes[0]).toEqual({
      regle: 'RG-07',
      motif: 'accesBloque',
      uniteId: 'C1',
      autreUniteId: 'C3',
    })
    expect(reglesCitees(enfreintes[0] as RegleEnfreinte)).toEqual(['RG-07', 'RG-08'])
  })

  it('RG-19 : refuse une fenêtre debout déplacée sans calage, et cite RG-19 et RG-08', () => {
    const fenetre: Unite = {
      ...colis('F', { l: 1500, w: 1350, h: 180 }),
      orientations: ['debout'],
    }
    const plan = [poser('F', 0, 0, 0, 1, 'debout')]
    const enfreintes = enfreintesDe(deplacer(plan, 'F', { x: 0, y: 1000, z: 0 }, [fenetre], camion))
    expect(enfreintes).toEqual([{ regle: 'RG-19', motif: 'deboutNonCale', uniteId: 'F' }])
    expect(reglesCitees(enfreintes[0] as RegleEnfreinte)).toEqual(['RG-19', 'RG-08'])
  })

  it("RG-08 : cite d'abord les règles enfreintes par l'article déplacé", () => {
    const unites = [{ ...colis('FRAGILE'), fragile: true }, colis('P2', { l: 600, w: 600, h: 600 })]
    const plan = [poser('FRAGILE', 0, 0, 0, 1), poser('P2', 1200, 0, 0, 2)]
    const enfreintes = enfreintesDe(deplacer(plan, 'P2', { x: 0, y: 0, z: 1000 }, unites, camion))
    // Le même défaut, vu du dessous (« fragile chargé »), vient après.
    expect(enfreintes.map((e) => `${e.uniteId} ${e.motif}`)).toEqual([
      'P2 surFragile',
      'FRAGILE fragileCharge',
    ])
  })

  it('RG-08 : ignore les règles déjà enfreintes avant le déplacement', () => {
    // FLOTTANT est mal appuyé depuis le départ ; déplacer P2 ailleurs ne
    // l'aggrave pas et reste permis.
    const unites = [colis('FLOTTANT'), colis('P2')]
    const plan = [poser('FLOTTANT', 0, 0, 500, 1), poser('P2', 1200, 0, 0, 2)]
    expect(deplacer(plan, 'P2', { x: 2400, y: 0, z: 0 }, unites, camion).accepte).toBe(true)
  })
})

describe('deplacer : ordre de chargement (RG-07, RG-08)', () => {
  it("RG-07 : recalcule l'ordre : un article posé à la main sur un autre passe après lui", () => {
    const unites = [colis('P1'), colis('P2')]
    // P2 était chargé en premier ; posé sur P1, il doit maintenant attendre P1.
    const plan = [poser('P2', 2400, 0, 0, 1), poser('P1', 0, 0, 0, 2)]
    const nouveau = planDe(deplacer(plan, 'P2', { x: 0, y: 0, z: 1000 }, unites, camion))
    expect(ordre(nouveau)).toEqual(['P1', 'P2'])
    expect(nouveau.map((p) => p.rang)).toEqual([1, 2])
  })

  it('RG-08 : refuse un déplacement qui ne laisse aucun ordre de chargement possible', () => {
    // Même disposition que le test de cycle de `ordonnerChargement` : HAUT,
    // posé sur PLANCHE, doit être chargé avant AVANT, qui est devant lui dans
    // sa bande ; mais PLANCHE repose sur AVANT, qui doit donc passer avant.
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
      poser('HAUT', 5000, 0, 0, 4),
    ]
    const enfreintes = enfreintesDe(
      deplacer(plan, 'HAUT', { x: 1000, y: 0, z: 700 }, unites, camion),
    )
    expect(enfreintes).toEqual([{ regle: 'RG-08', motif: 'ordreImpossible', uniteId: 'HAUT' }])
    expect(reglesCitees(enfreintes[0] as RegleEnfreinte)).toEqual(['RG-08'])
  })
})

describe('poserAuPlusBas : hauteur d’un article déplacé en vue de dessus', () => {
  const unites = [colis('BAS'), colis('PLAQUE', { l: 2400, w: 1000, h: 200 }), colis('P3')]
  const plan = [poser('BAS', 0, 0, 0, 1), poser('P3', 4000, 0, 0, 2)]

  it('pose au plancher quand rien ne se trouve sous son emprise', () => {
    expect(poserAuPlusBas(plan, 'PLAQUE', { x: 0, y: 1200 }, 'aPlat', unites)).toBe(0)
  })

  it('pose sur le dessus le plus haut de ce qui se trouve sous son emprise', () => {
    const avecHaut = [...plan, poser('HAUT', 0, 0, 1000, 3)]
    const tous = [...unites, colis('HAUT', { l: 600, w: 600, h: 300 })]
    expect(poserAuPlusBas(avecHaut, 'PLAQUE', { x: 0, y: 0 }, 'aPlat', tous)).toBe(1300)
  })

  it("ne tient pas compte de l'article lui-même ni de ce qui ne fait que le toucher", () => {
    const avecPlaque = [...plan, poser('PLAQUE', 0, 0, 1000, 3)]
    // PLAQUE est posée sur BAS ; déplacée en x = 1 200, son emprise
    // (1 200…3 600) touche BAS sans le recouvrir et s'arrête avant P3.
    expect(poserAuPlusBas(avecPlaque, 'PLAQUE', { x: 1200, y: 0 }, 'aPlat', unites)).toBe(0)
  })
})

describe('changerOrientation (RG-04)', () => {
  /** Une plaque 2 500 × 1 200 × 250, à plat ou contre une paroi. */
  const plaque: Unite = {
    ...colis('PL', { l: 2500, w: 1200, h: 250 }),
    orientations: ['aPlat', 'contreParoi'],
  }

  it('RG-04 : passe à l’orientation autorisée suivante, dans l’ordre à plat, debout, contre une paroi', () => {
    const toutes: Unite = { ...plaque, orientations: ['aPlat', 'debout', 'contreParoi'] }
    expect(orientationSuivante(toutes, 'aPlat')).toBe('debout')
    expect(orientationSuivante(toutes, 'debout')).toBe('contreParoi')
    expect(orientationSuivante(toutes, 'contreParoi')).toBe('aPlat')
    expect(orientationSuivante(plaque, 'aPlat')).toBe('contreParoi')
    expect(orientationSuivante(plaque, 'contreParoi')).toBe('aPlat')
  })

  it("RG-04 : n'a pas d'orientation suivante pour un article à une seule orientation", () => {
    expect(orientationSuivante(colis('P1'), 'aPlat')).toBeNull()
  })

  it('RG-04 : accepte une orientation permise et garde la position', () => {
    const plan = [poser('PL', 0, 0, 0, 1)]
    const nouveau = planDe(changerOrientation(plan, 'PL', [plaque], camion))
    expect(nouveau).toEqual([poser('PL', 0, 0, 0, 1, 'contreParoi')])
  })

  it('RG-04 : refuse une orientation qui enfreint une règle', () => {
    // Contre une paroi, au milieu de la caisse : aucune paroi n'est touchée.
    const plan = [poser('PL', 0, 600, 0, 1)]
    expect(enfreintesDe(changerOrientation(plan, 'PL', [plaque], camion))).toContainEqual({
      regle: 'RG-04',
      motif: 'paroiAbsente',
      uniteId: 'PL',
    })
  })

  it("RG-04 : refuse de changer l'orientation d'un article qui n'en a qu'une", () => {
    const plan = [poser('P1', 0, 0, 0, 1)]
    expect(enfreintesDe(changerOrientation(plan, 'P1', [colis('P1')], camion))).toEqual([
      { regle: 'RG-04', motif: 'orientationUnique', uniteId: 'P1' },
    ])
  })
})

describe('retirer et remettre (zone « Articles à placer »)', () => {
  it("RG-08 : retire un article libre et recalcule l'ordre de chargement", () => {
    const unites = [colis('P1'), colis('P2'), colis('P3')]
    const plan = [poser('P1', 0, 0, 0, 1), poser('P2', 1200, 0, 0, 2), poser('P3', 2400, 0, 0, 3)]
    const nouveau = planDe(retirer(plan, ['P2'], unites, camion))
    expect(ordre(nouveau)).toEqual(['P1', 'P3'])
    expect(nouveau.map((p) => p.rang)).toEqual([1, 2])
  })

  it('RG-08 : refuse de retirer un article qui en porte un autre, et propose de retirer aussi celui-ci', () => {
    const unites = [colis('BAS'), colis('MILIEU'), colis('HAUT')]
    const plan = [
      poser('BAS', 0, 0, 0, 1),
      poser('MILIEU', 0, 0, 1000, 2),
      poser('HAUT', 0, 0, 2000, 3),
    ]
    const resultat = retirer(plan, ['BAS'], unites, { ...camion, hauteur: 3000 })
    expect(resultat).toEqual({
      accepte: false,
      enfreintes: [
        { regle: 'RG-04', motif: 'appuiInsuffisant', uniteId: 'MILIEU', autreUniteId: 'BAS' },
      ],
      // De proche en proche : sans MILIEU, HAUT n'aurait plus d'appui non plus.
      aRetirerAussi: ['MILIEU', 'HAUT'],
    })
  })

  it('RG-08 : retire ensemble un article et ceux qu’il porte', () => {
    const unites = [colis('BAS'), colis('HAUT')]
    const plan = [poser('BAS', 0, 0, 0, 1), poser('HAUT', 0, 0, 1000, 2)]
    expect(planDe(retirer(plan, ['BAS', 'HAUT'], unites, camion))).toEqual([])
  })

  it("RG-19 : refuse de retirer l'article qui cale une fenêtre debout", () => {
    const fenetre: Unite = {
      ...colis('F', { l: 1500, w: 1350, h: 180 }),
      orientations: ['debout'],
    }
    const unites = [colis('APPUI'), fenetre]
    // F est debout contre APPUI, au milieu de la caisse.
    const plan = [poser('APPUI', 0, 0, 0, 1), poser('F', 0, 1000, 0, 2, 'debout')]
    const resultat = retirer(plan, ['APPUI'], unites, camion)
    expect(resultat).toEqual({
      accepte: false,
      enfreintes: [{ regle: 'RG-19', motif: 'deboutNonCale', uniteId: 'F', autreUniteId: 'APPUI' }],
      aRetirerAussi: ['F'],
    })
  })

  it('RG-08 : remet un article de la zone à une position permise ; il est chargé le plus tard possible', () => {
    const unites = [colis('P1'), colis('P2'), colis('REMIS')]
    const plan = [poser('P1', 0, 0, 0, 1), poser('P2', 0, 1400, 0, 2)]
    const nouveau = planDe(
      remettre(plan, 'REMIS', { x: 3000, y: 0, z: 0, orientation: 'aPlat' }, unites, camion),
    )
    expect(ordre(nouveau)).toEqual(['P1', 'P2', 'REMIS'])
    expect(nouveau.every((p) => p.rang !== SANS_RANG)).toBe(true)
  })

  it('RG-09 : refuse de remettre un article à une place déjà occupée', () => {
    const unites = [colis('P1'), colis('REMIS')]
    const plan = [poser('P1', 0, 0, 0, 1)]
    const resultat = remettre(
      plan,
      'REMIS',
      { x: 0, y: 0, z: 0, orientation: 'aPlat' },
      unites,
      camion,
    )
    expect(enfreintesDe(resultat)).toEqual([
      { regle: 'RG-06', motif: 'chevauchement', uniteId: 'REMIS', autreUniteId: 'P1' },
    ])
  })
})

describe('ajustement : jeu « couloirs » (référence)', () => {
  const jeu = chargerJeuEssai('couloirs')
  const { unites, placements: plan } = jeu
  const camionJeu = jeu.camion

  it('RG-04 : refuse A12 posé sur A11, fenêtre fragile (capture 04f), et cite RG-04 et RG-08', () => {
    const z = poserAuPlusBas(plan, 'A12', { x: 3700, y: 1800 }, 'aPlat', unites)
    expect(z).toBe(1350)
    const enfreintes = enfreintesDe(
      deplacer(plan, 'A12', { x: 3700, y: 1800, z }, unites, camionJeu),
    )
    expect(enfreintes[0]?.uniteId).toBe('A12')
    expect(enfreintes).toContainEqual({
      regle: 'RG-04',
      motif: 'surFragile',
      uniteId: 'A12',
      autreUniteId: 'A11',
    })
    expect(reglesCitees(enfreintes[0] as RegleEnfreinte)).toEqual(['RG-04', 'RG-08'])
  })

  it('RG-09 : refuse un chevauchement (A12 sur la place de A11)', () => {
    const enfreintes = enfreintesDe(
      deplacer(plan, 'A12', { x: 3700, y: 1500, z: 0 }, unites, camionJeu),
    )
    expect(enfreintes.every((e) => e.motif === 'chevauchement')).toBe(true)
    expect(enfreintes.filter((e) => e.uniteId === 'A12').map((e) => e.autreUniteId)).toEqual([
      'A10',
      'A11',
    ])
  })

  it('RG-09 : refuse une sortie de la caisse (A12 au-delà des portes)', () => {
    expect(
      enfreintesDe(deplacer(plan, 'A12', { x: 6700, y: 1240, z: 0 }, unites, camionJeu)),
    ).toEqual([{ regle: 'RG-06', motif: 'horsCaisse', uniteId: 'A12' }])
  })

  it('RG-19 : refuse la fenêtre A10 déplacée debout sans calage', () => {
    const enfreintes = enfreintesDe(
      deplacer(plan, 'A10', { x: 5500, y: 1000, z: 0 }, unites, camionJeu),
    )
    expect(enfreintes[0]).toEqual({ regle: 'RG-19', motif: 'deboutNonCale', uniteId: 'A10' })
  })

  it('RG-07 : refuse A12 (C2) posé au fond sur A01, derrière A03 (C4) et A06, A07 (C3)', () => {
    // Aucun article de C1 ne peut passer derrière C3 sur « couloirs » : les
    // poutres de 6 m vont jusqu'aux portes. A12, livré avant C3 et C4, sert
    // d'exemple ; le cas C1 derrière C3 est couvert par un test plus haut.
    const enfreintes = enfreintesDe(
      deplacer(plan, 'A12', { x: 0, y: 0, z: 1050 }, unites, camionJeu),
    )
    expect(enfreintes.filter((e) => e.uniteId === 'A12')).toEqual(
      ['A03', 'A06', 'A07'].map((autre) => ({
        regle: 'RG-07',
        motif: 'accesBloque',
        uniteId: 'A12',
        autreUniteId: autre,
      })),
    )
  })

  it('RG-08 : un déplacement permis rend un plan accepté par le validateur, avec un ordre recalculé', () => {
    const nouveau = planDe(deplacer(plan, 'A12', { x: 5200, y: 1240, z: 0 }, unites, camionJeu))
    expect(placementDe(nouveau, 'A12')).toMatchObject({ x: 5200, y: 1240, z: 0 })
    expect(validerPlan(nouveau, unites, camionJeu)).toEqual([])
    expect(nouveau.map((p) => p.rang)).toEqual(nouveau.map((_p, i) => i + 1))
    expect(contraintesNonRespectees(nouveau, unites)).toEqual([])
  })

  it('RG-08 : refuse de retirer A04, qui porte A05, et propose de retirer aussi A05', () => {
    const resultat = retirer(plan, ['A04'], unites, camionJeu)
    expect(resultat).toMatchObject({ accepte: false, aRetirerAussi: ['A05'] })
    expect(planDe(retirer(plan, ['A04', 'A05'], unites, camionJeu))).toHaveLength(10)
  })

  it('RG-04 : refuse de mettre A05 contre une paroi, posé sur A04', () => {
    const enfreintes = enfreintesDe(changerOrientation(plan, 'A05', unites, camionJeu))
    expect(enfreintes.map((e) => e.motif)).toContain('deboutHorsPlancher')
  })
})
