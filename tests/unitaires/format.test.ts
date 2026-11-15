import { describe, expect, it } from 'vitest'
import {
  formaterDimensions,
  formaterJour,
  formaterMetresCubes,
  formaterMillimetres,
  formaterPoids,
  formaterPourcentage,
  formaterVolume,
} from '@/composants/format'

// Le français sépare les milliers par une espace fine insécable (U+202F).
const f = ' '

describe('mise en forme des nombres', () => {
  it('sépare les milliers des millimètres', () => {
    expect(formaterMillimetres(1500)).toBe(`1${f}500`)
    expect(formaterMillimetres(180)).toBe('180')
  })

  it('écrit trois dimensions séparées par ×', () => {
    expect(formaterDimensions({ l: 1500, w: 1350, h: 180 })).toBe(`1${f}500 × 1${f}350 × 180`)
  })

  it('écrit un poids avec la virgule décimale', () => {
    expect(formaterPoids(1225)).toBe(`1${f}225 kg`)
    expect(formaterPoids(22.5)).toBe('22,5 kg')
  })

  it('écrit le volume utile en mètres cubes, à une décimale', () => {
    expect(formaterVolume({ longueur: 7200, largeur: 2400, hauteur: 2500 })).toBe('43,2 m³')
    expect(formaterVolume({ longueur: 6200, largeur: 2450, hauteur: 2400 })).toBe('36,5 m³')
  })

  it('écrit une date de livraison en toutes lettres, avec une majuscule', () => {
    expect(formaterJour('2026-11-05')).toBe('Jeudi 5 novembre 2026')
  })

  it('écrit un volume chargé et une part', () => {
    expect(formaterMetresCubes(10.42)).toBe('10,4 m³')
    expect(formaterPourcentage(0.24)).toMatch(/^24\s%$/)
  })
})
