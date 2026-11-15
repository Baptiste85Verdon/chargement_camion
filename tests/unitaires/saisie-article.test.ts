import { describe, expect, it } from 'vitest'
import type { FicheArticle } from '@/domaine/modele'
import {
  articleDepuisFormulaire,
  formulaireDepuisArticle,
  formulaireVide,
  porteurParDefaut,
} from '@/domaine/saisie-article'

const fenetre: FicheArticle = {
  id: 'a1',
  reference: 'FEN-CIN-120',
  nom: 'Fenêtre cintrée PVC 120 × 140',
  famille: 'Fenêtres',
  dimsEmballees: { l: 1200, w: 1400, h: 180 },
  dimsNues: { l: 1150, w: 1350, h: 80 },
  poids: 38.5,
  fragile: true,
  orientations: ['debout'],
  forme: 'irreguliere',
  porteur: false,
}

describe('formulaire de la fiche article', () => {
  it('un nouvel article part d’un formulaire vide, rectangulaire et porteur, sans orientation', () => {
    expect(formulaireVide()).toMatchObject({
      nom: '',
      famille: '',
      livrableNu: false,
      orientations: [],
      forme: 'rectangulaire',
      porteur: true,
      fragile: false,
    })
  })

  it('remplit le formulaire depuis la fiche, poids avec la virgule', () => {
    const f = formulaireDepuisArticle(fenetre)
    expect(f.dimsEmballees).toEqual({ l: '1200', w: '1400', h: '180' })
    expect(f.livrableNu).toBe(true)
    expect(f.dimsNues).toEqual({ l: '1150', w: '1350', h: '80' })
    expect(f.poids).toBe('38,5')
    expect(f.reference).toBe('FEN-CIN-120')
  })

  it('relit la fiche à l’identique depuis son formulaire', () => {
    expect(articleDepuisFormulaire(formulaireDepuisArticle(fenetre))).toEqual(fenetre)
  })

  it('accepte les espaces dans les nombres et retire les espaces autour des textes', () => {
    const f = {
      ...formulaireDepuisArticle(fenetre),
      nom: '  Fenêtre  ',
      reference: ' ',
      dimsEmballees: { l: '1 200', w: '1 400', h: '180' },
    }
    const article = articleDepuisFormulaire(f)
    expect(article.nom).toBe('Fenêtre')
    expect(article.reference).toBeUndefined()
    expect(article.dimsEmballees).toEqual({ l: 1200, w: 1400, h: 180 })
  })

  it('RG-02 : case « Peut être livré nu » décochée, la taille nue n’est pas enregistrée', () => {
    const f = { ...formulaireDepuisArticle(fenetre), livrableNu: false }
    expect(articleDepuisFormulaire(f).dimsNues).toBeUndefined()
  })

  it('RG-18 : le dessus est porteur par défaut pour une forme rectangulaire seulement', () => {
    expect(porteurParDefaut('rectangulaire')).toBe(true)
    expect(porteurParDefaut('cylindrique')).toBe(false)
    expect(porteurParDefaut('irreguliere')).toBe(false)
  })

  it('refuse de convertir un formulaire qui ne passe pas la vérification', () => {
    expect(() => articleDepuisFormulaire(formulaireVide())).toThrow()
  })
})

describe('formulaire d’un article archivé', () => {
  it('RG-21 : modifier un article archivé le laisse archivé', () => {
    const archive = { ...fenetre, archiveLe: '2026-11-15T10:00:00.000Z' }
    const f = { ...formulaireDepuisArticle(archive), nom: 'Autre nom' }
    expect(articleDepuisFormulaire(f, archive).archiveLe).toBe(archive.archiveLe)
  })
})
