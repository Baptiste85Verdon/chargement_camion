// Zoom et déplacement d'une vue du plan (cahier technique, 5.11).
import { describe, expect, it } from 'vitest'
import { cadrer, centreDe, deplacerCadrage, zoomAutour, zoomSuivant } from '@/composants/cadrage'

const caisse = { largeur: 7200, hauteur: 2400 }

describe('cadrer', () => {
  it('à 100 %, le cadrage est la caisse entière', () => {
    expect(cadrer(caisse, 1)).toEqual({ x: 0, y: 0, largeur: 7200, hauteur: 2400 })
  })

  it('à 200 %, il montre la moitié de chaque dimension, centrée', () => {
    expect(cadrer(caisse, 2)).toEqual({ x: 1800, y: 600, largeur: 3600, hauteur: 1200 })
  })

  it('ne sort jamais de la caisse', () => {
    expect(cadrer(caisse, 2, { x: 0, y: 0 })).toEqual({ x: 0, y: 0, largeur: 3600, hauteur: 1200 })
    expect(cadrer(caisse, 2, { x: 9000, y: 9000 })).toMatchObject({ x: 3600, y: 1200 })
  })
})

describe('deplacerCadrage', () => {
  it('fait glisser la zone visible, sans sortir de la caisse', () => {
    const c = cadrer(caisse, 2)
    expect(deplacerCadrage(c, caisse, 500, -100)).toMatchObject({ x: 2300, y: 500 })
    expect(deplacerCadrage(c, caisse, 99999, 0)).toMatchObject({ x: 3600 })
  })

  it('à 100 %, rien ne bouge', () => {
    expect(deplacerCadrage(cadrer(caisse, 1), caisse, 500, 500)).toMatchObject({ x: 0, y: 0 })
  })
})

describe('zoomSuivant', () => {
  it('passe au cran suivant ou précédent, entre 100 % et 800 %', () => {
    expect(zoomSuivant(1, 1)).toBe(1.5)
    expect(zoomSuivant(1.5, 1)).toBe(2)
    expect(zoomSuivant(2, -1)).toBe(1.5)
    expect(zoomSuivant(1, -1)).toBe(1)
    expect(zoomSuivant(8, 1)).toBe(8)
  })

  it('part du cran le plus proche pour un zoom libre', () => {
    expect(zoomSuivant(1.7, 1)).toBe(2)
    expect(zoomSuivant(1.7, -1)).toBe(1.5)
  })
})

describe('zoomAutour', () => {
  it('garde immobile le point visé, sous le pointeur', () => {
    const c = cadrer(caisse, 1)
    const zoome = zoomAutour(c, caisse, 1, 2, { x: 1000, y: 600 })
    // Le point visé reste à la même place relative dans le cadrage.
    expect((1000 - zoome.x) / zoome.largeur).toBeCloseTo(1000 / 7200)
    expect((600 - zoome.y) / zoome.hauteur).toBeCloseTo(600 / 2400)
  })

  it('centreDe rend le centre du cadrage', () => {
    expect(centreDe(cadrer(caisse, 2, { x: 2000, y: 700 }))).toEqual({ x: 2000, y: 700 })
  })
})
