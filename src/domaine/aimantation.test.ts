import { describe, expect, it } from 'vitest'
import { chargerJeuEssai } from '../../tests/jeux-essai/charger'
import { aimanter, avancer, flecheVersPas, pasClavier } from './aimantation'
import { PAS_CLAVIER, PAS_CLAVIER_GRAND } from './constantes'
import type { Camion, Dimensions, Placement, Unite } from './types'

const camion: Camion = { longueur: 7200, largeur: 2400, hauteur: 2500 }

/** Un colis à plat de 1 200 × 1 000 × 1 000 mm. */
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

const unites = [colis('P1'), colis('Q')]
/** P1 au fond, contre la paroi gauche ; Q est l'article qu'on déplace. */
const plan = [poser('P1', 0, 0, 0, 1), poser('Q', 3000, 0, 0, 2)]
const SEUIL = 30

/** La pose de Q à (x, y, z), à plat. */
const q = (x: number, y: number, z = 0) => ({ x, y, z, orientation: 'aPlat' as const })

describe('aimantation (cahier technique 5.2, étape 4)', () => {
  it('colle l’article à la paroi gauche quand il en est à moins du seuil', () => {
    expect(aimanter(plan, 'Q', q(3000, 25), ['x', 'y'], SEUIL, unites, camion)).toEqual({
      x: 3000,
      y: 0,
      z: 0,
    })
  })

  it('colle l’article à la paroi droite et aux portes', () => {
    expect(aimanter(plan, 'Q', q(5990, 1385), ['x', 'y'], SEUIL, unites, camion)).toEqual({
      x: 6000,
      y: 1400,
      z: 0,
    })
  })

  it('colle l’article contre la face d’un article qui lui fait face', () => {
    // Q à 10 mm devant P1, dans la même bande : il vient au contact.
    expect(aimanter(plan, 'Q', q(1210, 0), ['x', 'y'], SEUIL, unites, camion)).toMatchObject({
      x: 1200,
    })
    // Q à 10 mm à droite de P1, à la même distance du fond.
    expect(aimanter(plan, 'Q', q(0, 1010), ['x', 'y'], SEUIL, unites, camion)).toMatchObject({
      y: 1000,
    })
  })

  it('colle le bord avant de l’article contre le bord arrière d’un autre', () => {
    const planDevant = [poser('P1', 3000, 0, 0, 1), poser('Q', 0, 0, 0, 2)]
    // Q de 1 790 à 2 990 : son bord avant vient sur P1, en 3 000.
    expect(aimanter(planDevant, 'Q', q(1790, 0), ['x'], SEUIL, unites, camion)).toMatchObject({
      x: 1800,
    })
  })

  it('ignore un article qui ne lui fait pas face', () => {
    const planDecale = [poser('P1', 0, 1400, 0, 1), poser('Q', 3000, 0, 0, 2)]
    // P1 occupe la bande de droite : Q, dans la bande de gauche, n'est pas attiré par lui.
    expect(aimanter(planDecale, 'Q', q(1210, 0), ['x'], SEUIL, unites, camion)).toMatchObject({
      x: 1210,
    })
  })

  it('laisse l’article en place au-delà du seuil', () => {
    expect(aimanter(plan, 'Q', q(1250, 40), ['x', 'y'], SEUIL, unites, camion)).toEqual({
      x: 1250,
      y: 40,
      z: 0,
    })
  })

  it('ne touche qu’aux axes montrés par la vue', () => {
    expect(aimanter(plan, 'Q', q(1210, 25), ['x'], SEUIL, unites, camion)).toEqual({
      x: 1200,
      y: 25,
      z: 0,
    })
  })

  it('choisit le contact le plus proche quand deux sont à portée', () => {
    // Paroi gauche à 25 mm, P2 à 15 mm de l'autre côté : Q va contre P2.
    const unitesEtroites = [colis('P2'), colis('Q', { l: 1200, w: 1000, h: 1000 })]
    const planEtroit = [poser('P2', 3000, 1040, 0, 1), poser('Q', 0, 0, 0, 2)]
    expect(
      aimanter(planEtroit, 'Q', q(3000, 25), ['y'], SEUIL, unitesEtroites, camion),
    ).toMatchObject({ y: 40 })
  })

  it('aimante aussi en hauteur : sur le dessus d’un article', () => {
    expect(aimanter(plan, 'Q', q(0, 0, 1020), ['x', 'z'], SEUIL, unites, camion)).toMatchObject({
      z: 1000,
    })
  })

  it('un seuil nul n’aimante rien', () => {
    expect(aimanter(plan, 'Q', q(1210, 25), ['x', 'y'], 0, unites, camion)).toEqual({
      x: 1210,
      y: 25,
      z: 0,
    })
  })

  it('aimante un article de la zone, qui n’est pas encore dans le plan', () => {
    const sansQ = [poser('P1', 0, 0, 0, 1)]
    expect(aimanter(sansQ, 'Q', q(1215, 10), ['x', 'y'], SEUIL, unites, camion)).toEqual({
      x: 1200,
      y: 0,
      z: 0,
    })
  })
})

describe('pas au clavier (cahier technique 5.3)', () => {
  it('vaut 50 mm, et 500 mm avec Maj', () => {
    expect(PAS_CLAVIER).toBe(50)
    expect(PAS_CLAVIER_GRAND).toBe(500)
    expect(pasClavier(false)).toBe(50)
    expect(pasClavier(true)).toBe(500)
  })

  it('sans aimantation, le pas est entier, même s’il entre dans un article', () => {
    expect(avancer(plan, 'Q', q(1220, 0), 'x', -1, 50, false, unites, camion)).toEqual({
      x: 1170,
      y: 0,
      z: 0,
    })
  })

  it('sans aimantation, le pas est entier, même s’il sort de la caisse', () => {
    expect(avancer(plan, 'Q', q(3000, 30), 'y', -1, 50, false, unites, camion)).toMatchObject({
      y: -20,
    })
  })

  it('avec l’aimantation, un pas qui entrerait dans un article s’arrête au contact', () => {
    expect(avancer(plan, 'Q', q(1220, 0), 'x', -1, 50, true, unites, camion)).toMatchObject({
      x: 1200,
    })
  })

  it('avec l’aimantation, un pas qui sortirait de la caisse s’arrête contre la paroi', () => {
    expect(avancer(plan, 'Q', q(3000, 30), 'y', -1, 50, true, unites, camion)).toMatchObject({
      y: 0,
    })
    expect(avancer(plan, 'Q', q(5800, 0), 'x', 1, 500, true, unites, camion)).toMatchObject({
      x: 6000,
    })
  })

  it('avec l’aimantation, un article déjà au contact ne bouge plus dans ce sens', () => {
    expect(avancer(plan, 'Q', q(1200, 0), 'x', -1, 50, true, unites, camion)).toMatchObject({
      x: 1200,
    })
  })

  it('avec l’aimantation, le pas est entier quand rien ne gêne', () => {
    expect(avancer(plan, 'Q', q(3000, 0), 'x', -1, 500, true, unites, camion)).toMatchObject({
      x: 2500,
    })
  })

  it('avec l’aimantation, un article d’une autre bande ne l’arrête pas', () => {
    const planDecale = [poser('P1', 0, 1400, 0, 1), poser('Q', 3000, 0, 0, 2)]
    expect(avancer(planDecale, 'Q', q(1220, 0), 'x', -1, 500, true, unites, camion)).toMatchObject({
      x: 720,
    })
  })

  describe('sur « couloirs », avec l’aimantation', () => {
    const jeu = chargerJeuEssai('couloirs')
    // A12 : 600 × 600 × 600, en (3 700 ; 1 240 ; 0).
    const a12 = { x: 3700, y: 1240, z: 0, orientation: 'aPlat' as const }
    const pas = (axe: 'x' | 'y', sens: 1 | -1) =>
      avancer(
        jeu.placements,
        'A12',
        a12,
        axe,
        sens,
        PAS_CLAVIER_GRAND,
        true,
        jeu.unites,
        jeu.camion,
      )

    it('A12 ne recule pas vers le fond : il touche déjà les BA13 A04 et A05', () => {
      expect(pas('x', -1)).toEqual({ x: 3700, y: 1240, z: 0 })
    })

    it('A12 décalé vers la gauche s’arrête contre les bottes A06 et A07', () => {
      expect(pas('y', -1)).toEqual({ x: 3700, y: 1000, z: 0 })
    })

    it('A12 ne va pas à droite : il touche déjà la fenêtre A11', () => {
      expect(pas('y', 1)).toEqual({ x: 3700, y: 1240, z: 0 })
    })

    it('A12 avance d’un grand pas entier vers les portes', () => {
      expect(pas('x', 1)).toEqual({ x: 4200, y: 1240, z: 0 })
    })
  })
})

describe('flèches au clavier selon la vue (cahier technique 5.3 et 5.8)', () => {
  it('RG-09 : en vue de dessus, les flèches déplacent en x (vers les portes à droite) et en y (paroi droite en haut)', () => {
    expect(flecheVersPas('dessus', 'ArrowRight')).toEqual({ axe: 'x', sens: 1 })
    expect(flecheVersPas('dessus', 'ArrowLeft')).toEqual({ axe: 'x', sens: -1 })
    expect(flecheVersPas('dessus', 'ArrowUp')).toEqual({ axe: 'y', sens: 1 })
    expect(flecheVersPas('dessus', 'ArrowDown')).toEqual({ axe: 'y', sens: -1 })
  })

  it('RG-09 : dans les vues de côté, les flèches déplacent en x et en z ; la vue droite est en miroir', () => {
    expect(flecheVersPas('gauche', 'ArrowRight')).toEqual({ axe: 'x', sens: 1 })
    expect(flecheVersPas('gauche', 'ArrowUp')).toEqual({ axe: 'z', sens: 1 })
    expect(flecheVersPas('droite', 'ArrowRight')).toEqual({ axe: 'x', sens: -1 })
    expect(flecheVersPas('droite', 'ArrowDown')).toEqual({ axe: 'z', sens: -1 })
  })

  it('RG-09 : dans les vues avant et arrière, les flèches déplacent en y et en z', () => {
    // Depuis le fond, la paroi gauche est à droite ; depuis les portes, à gauche.
    expect(flecheVersPas('avant', 'ArrowRight')).toEqual({ axe: 'y', sens: -1 })
    expect(flecheVersPas('arriere', 'ArrowRight')).toEqual({ axe: 'y', sens: 1 })
    expect(flecheVersPas('arriere', 'ArrowUp')).toEqual({ axe: 'z', sens: 1 })
  })

  it('ignore une touche qui n’est pas une flèche', () => {
    expect(flecheVersPas('dessus', 'r')).toBeNull()
  })
})
