import { describe, expect, it } from 'vitest'
import { chargerJeuEssai } from '../../tests/jeux-essai/charger'
import { deplacer, remettre, retirer } from './ajustement'
import { MAX_PLACES_PROPOSEES } from './constantes'
import { placerDepuisZone, proposerPlaces } from './places'
import type { Camion, Dimensions, Placement, Unite } from './types'
import { validerPlan } from './validateur'

const camion: Camion = { longueur: 7200, largeur: 2400, hauteur: 2500 }

/** Un colis à plat de 500 kg, porteur, de la commande livrée en premier. */
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

function poser(uniteId: string, x: number, y: number, z: number, rang = 1): Placement {
  return { uniteId, x, y, z, orientation: 'aPlat', rang }
}

/** Les positions proposées, sous forme (x ; y ; z) pour des messages lisibles. */
const enTexte = (poses: { x: number; y: number; z: number }[]) =>
  poses.map((p) => `${p.x};${p.y};${p.z}`)

describe('places proposées par « Choisir une place » (cahier technique 5.3)', () => {
  it('propose les points candidats du placeur, classés par son score', () => {
    // P1 au fond à gauche. Pour Q, le placeur préfère le fond (compacité),
    // puis, à égalité de calage, la place qui équilibre le mieux la charge :
    // contre la paroi droite, puis contre P1, puis sur P1. Devant P1 vient en dernier.
    const unites = [colis('P1'), colis('Q')]
    const places = proposerPlaces([poser('P1', 0, 0, 0)], 'Q', unites, camion)
    expect(enTexte(places)).toEqual(['0;1400;0', '0;1000;0', '0;0;1000', '1200;0;0'])
    expect(places.every((p) => p.orientation === 'aPlat')).toBe(true)
  })

  it(`en propose au plus ${MAX_PLACES_PROPOSEES}`, () => {
    const unites = [colis('P1'), colis('P2'), colis('P3'), colis('Q', { l: 600, w: 600, h: 600 })]
    const plan = [poser('P1', 0, 0, 0), poser('P2', 1200, 1400, 0), poser('P3', 3000, 0, 0)]
    expect(proposerPlaces(plan, 'Q', unites, camion)).toHaveLength(MAX_PLACES_PROPOSEES)
    expect(proposerPlaces(plan, 'Q', unites, camion, { max: 2 })).toHaveLength(2)
  })

  it('RG-04 : ne propose aucune place que le validateur refuse (rien sur un fragile)', () => {
    const unites = [{ ...colis('P1'), fragile: true }, colis('Q')]
    const places = proposerPlaces([poser('P1', 0, 0, 0)], 'Q', unites, camion)
    expect(places.length).toBeGreaterThan(0)
    expect(places.every((p) => p.z === 0)).toBe(true)
  })

  it('RG-08 : pour un article du plan, chaque place proposée est un déplacement accepté', () => {
    const unites = [colis('P1'), colis('Q')]
    const plan = [poser('P1', 0, 0, 0, 1), poser('Q', 1200, 0, 0, 2)]
    const places = proposerPlaces(plan, 'Q', unites, camion)
    expect(places.length).toBeGreaterThan(0)
    for (const p of places) expect(deplacer(plan, 'Q', p, unites, camion).accepte).toBe(true)
  })

  it('ne propose pas la place où l’article se trouve déjà, ni un point créé par lui-même', () => {
    const unites = [colis('P1'), colis('Q')]
    const plan = [poser('P1', 0, 0, 0, 1), poser('Q', 1200, 0, 0, 2)]
    const places = enTexte(proposerPlaces(plan, 'Q', unites, camion))
    expect(places).not.toContain('1200;0;0')
    // Devant Q (x = 2 400) n'est un point candidat que parce que Q est là.
    expect(places.some((p) => p.startsWith('2400;'))).toBe(false)
  })

  it('garde l’orientation actuelle d’un article du plan', () => {
    const fenetre: Unite = {
      ...colis('F', { l: 1500, w: 1350, h: 180 }),
      orientations: ['aPlat', 'debout'],
    }
    const unites = [colis('P1'), fenetre]
    const plan = [
      poser('P1', 0, 0, 0, 1),
      { ...poser('F', 3000, 0, 0, 2), orientation: 'debout' as const },
    ]
    const places = proposerPlaces(plan, 'F', unites, camion)
    expect(places.length).toBeGreaterThan(0)
    expect(places.every((p) => p.orientation === 'debout')).toBe(true)
  })

  it('pour un article de la zone, prend l’orientation demandée, sinon la première autorisée', () => {
    const fenetre: Unite = {
      ...colis('F', { l: 1500, w: 1350, h: 180 }),
      orientations: ['aPlat', 'debout'],
    }
    const unites = [colis('P1'), fenetre]
    const plan = [poser('P1', 0, 0, 0, 1)]
    expect(proposerPlaces(plan, 'F', unites, camion).every((p) => p.orientation === 'aPlat')).toBe(
      true,
    )
    const debout = proposerPlaces(plan, 'F', unites, camion, { orientation: 'debout' })
    expect(debout.length).toBeGreaterThan(0)
    expect(debout.every((p) => p.orientation === 'debout')).toBe(true)
  })

  it('ne propose rien quand aucune place n’est permise', () => {
    const unites = [colis('GRAND', { l: 7200, w: 2400, h: 2500 }), colis('Q')]
    expect(proposerPlaces([poser('GRAND', 0, 0, 0)], 'Q', unites, camion)).toEqual([])
  })

  describe('sur « couloirs »', () => {
    const jeu = chargerJeuEssai('couloirs')
    const { unites, placements: plan } = jeu

    it('RG-08 : chaque place proposée pour A12 est un déplacement accepté, avec un ordre réalisable', () => {
      const places = proposerPlaces(plan, 'A12', unites, jeu.camion)
      expect(places.length).toBeGreaterThan(0)
      expect(places.length).toBeLessThanOrEqual(MAX_PLACES_PROPOSEES)
      for (const p of places) {
        const resultat = deplacer(plan, 'A12', p, unites, jeu.camion)
        expect(resultat.accepte).toBe(true)
        if (resultat.accepte) expect(validerPlan(resultat.plan, unites, jeu.camion)).toEqual([])
      }
    })

    it('RG-08 : chaque place proposée pour A12 retiré est une remise acceptée', () => {
      const sansA12 = plan.filter((p) => p.uniteId !== 'A12')
      const places = proposerPlaces(sansA12, 'A12', unites, jeu.camion)
      expect(places.length).toBeGreaterThan(0)
      for (const p of places) {
        expect(remettre(sansA12, 'A12', p, unites, jeu.camion).accepte).toBe(true)
      }
    })
  })
})

describe('« Placer » et « Tout placer » (cahier technique 5.7)', () => {
  it('place un article de la zone sans déplacer les autres', () => {
    const unites = [colis('P1'), colis('Q')]
    const plan = [poser('P1', 0, 0, 0, 1)]
    const resultat = placerDepuisZone(plan, ['Q'], unites, camion)
    expect(resultat.restants).toEqual([])
    expect(resultat.plan.find((p) => p.uniteId === 'P1')).toMatchObject({ x: 0, y: 0, z: 0 })
    expect(resultat.plan.map((p) => p.uniteId).sort()).toEqual(['P1', 'Q'])
  })

  it('place l’article sur la première place proposée', () => {
    // Ce que « Choisir une place » montre en tête est ce que fait « Placer » :
    // Q va au fond, contre la paroi droite.
    const unites = [colis('P1'), colis('Q')]
    const plan = [poser('P1', 0, 0, 0, 1)]
    const premiere = proposerPlaces(plan, 'Q', unites, camion)[0]
    const resultat = placerDepuisZone(plan, ['Q'], unites, camion)
    expect(resultat.plan.find((p) => p.uniteId === 'Q')).toMatchObject({ x: 0, y: 1400, z: 0 })
    expect(resultat.plan.find((p) => p.uniteId === 'Q')).toMatchObject({ ...premiere })
    expect(resultat.places).toEqual(['Q'])
  })

  it('place un article de la zone dans l’orientation demandée, sinon la première autorisée', () => {
    const fenetre: Unite = {
      ...colis('F', { l: 1500, w: 1350, h: 180 }),
      orientations: ['aPlat', 'debout'],
    }
    const unites = [colis('P1'), fenetre]
    const plan = [poser('P1', 0, 0, 0, 1)]
    const aPlat = placerDepuisZone(plan, ['F'], unites, camion)
    expect(aPlat.plan.find((p) => p.uniteId === 'F')?.orientation).toBe('aPlat')
    const debout = placerDepuisZone(plan, ['F'], unites, camion, { F: 'debout' })
    expect(debout.plan.find((p) => p.uniteId === 'F')?.orientation).toBe('debout')
  })

  it('« Tout placer » place tous les articles de la zone, rangs renumérotés', () => {
    const unites = [colis('P1'), colis('Q1'), colis('Q2'), colis('Q3')]
    const plan = [poser('P1', 0, 0, 0, 1)]
    const resultat = placerDepuisZone(plan, ['Q1', 'Q2', 'Q3'], unites, camion)
    expect(resultat.restants).toEqual([])
    expect(resultat.plan).toHaveLength(4)
    expect(resultat.plan.map((p) => p.rang)).toEqual([1, 2, 3, 4])
    expect(validerPlan(resultat.plan, unites, camion)).toEqual([])
  })

  it('RG-10 : un article qui ne trouve pas de place reste dans la zone, les autres sont placés', () => {
    // P1 occupe les 6 premiers mètres sur toute la largeur et toute la hauteur :
    // il reste 1 200 mm devant lui. Q y tient ; LONG (2 000 mm) non.
    const unites = [
      colis('P1', { l: 6000, w: 2400, h: 2500 }),
      colis('Q'),
      colis('LONG', { l: 2000, w: 1000, h: 1000 }),
    ]
    const plan = [poser('P1', 0, 0, 0, 1)]
    const resultat = placerDepuisZone(plan, ['LONG', 'Q'], unites, camion)
    expect(resultat.restants).toEqual(['LONG'])
    expect(resultat.plan.find((p) => p.uniteId === 'Q')).toMatchObject({ x: 6000, z: 0 })
    expect(resultat.plan.find((p) => p.uniteId === 'P1')).toEqual(poser('P1', 0, 0, 0, 1))
  })

  it('sur « couloirs », A12 retiré puis replacé : rien d’autre ne bouge, le plan reste accepté', () => {
    const jeu = chargerJeuEssai('couloirs')
    const retrait = retirer(jeu.placements, ['A12'], jeu.unites, jeu.camion)
    if (!retrait.accepte) throw new Error('Le retrait de A12 aurait dû être accepté.')
    const resultat = placerDepuisZone(retrait.plan, ['A12'], jeu.unites, jeu.camion)
    expect(resultat.restants).toEqual([])
    expect(resultat.plan).toHaveLength(12)
    for (const avant of retrait.plan) {
      expect(resultat.plan.find((p) => p.uniteId === avant.uniteId)).toMatchObject({
        x: avant.x,
        y: avant.y,
        z: avant.z,
        orientation: avant.orientation,
      })
    }
    expect(validerPlan(resultat.plan, jeu.unites, jeu.camion)).toEqual([])
  })
})
