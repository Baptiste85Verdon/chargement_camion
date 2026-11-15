import { describe, expect, it } from 'vitest'
import { chercherArticles, compterParFamille, filtrerCatalogue } from '@/domaine/catalogue'
import type { FicheArticle } from '@/domaine/modele'

const article = (id: string, nom: string, famille: FicheArticle['famille'], reference?: string) =>
  ({
    id,
    nom,
    famille,
    reference,
    dimsEmballees: { l: 1000, w: 1000, h: 1000 },
    poids: 10,
    fragile: false,
    orientations: ['aPlat'],
    forme: 'rectangulaire',
    porteur: true,
  }) satisfies FicheArticle

const catalogue = [
  article('1', 'Fenêtre PVC 2 vantaux 150 × 135', 'Fenêtres', 'FEN-PVC-2V'),
  article('2', 'Fenêtre de toit Velux 78 × 98', 'Fenêtres de toit', 'VLX-GGL-MK04'),
  article('3', 'Paquet de plaques BA13 250 × 120', 'Plaques de plâtre', 'PLQ-BA13'),
  article('4', 'Carton sans référence', 'Quincaillerie'),
]

describe('catalogue : recherche et filtre (CF 4.6)', () => {
  it('sans recherche ni famille, rend tout le catalogue dans son ordre', () => {
    expect(filtrerCatalogue(catalogue, { recherche: '', famille: null })).toEqual(catalogue)
  })

  it('cherche dans le nom, sans tenir compte de la casse ni des accents', () => {
    const ids = filtrerCatalogue(catalogue, { recherche: 'fenetre', famille: null }).map(
      (a) => a.id,
    )
    expect(ids).toEqual(['1', '2'])
  })

  it('cherche aussi dans la référence', () => {
    const ids = filtrerCatalogue(catalogue, { recherche: 'plq-ba', famille: null }).map((a) => a.id)
    expect(ids).toEqual(['3'])
  })

  it('combine la recherche et la famille', () => {
    const ids = filtrerCatalogue(catalogue, { recherche: 'fenêtre', famille: 'Fenêtres de toit' })
    expect(ids.map((a) => a.id)).toEqual(['2'])
  })

  it('ignore les espaces autour de la recherche', () => {
    expect(filtrerCatalogue(catalogue, { recherche: '  carton ', famille: null })).toHaveLength(1)
  })

  it('compte les articles de chaque famille, familles vides comprises', () => {
    const comptes = compterParFamille(catalogue)
    expect(comptes.get('Fenêtres')).toBe(1)
    expect(comptes.get('Maçonnerie')).toBe(0)
    expect(comptes.size).toBe(9)
  })
})

describe('recherche de la saisie express', () => {
  it('cherche dans le nom, la référence et la famille, sans accents', () => {
    expect(chercherArticles(catalogue, 'fenetres').map((a) => a.id)).toContain('1')
    expect(chercherArticles(catalogue, 'fen-pvc').map((a) => a.id)).toEqual(['1'])
  })

  it('rend tout le catalogue pour une recherche vide', () => {
    expect(chercherArticles(catalogue, '  ')).toHaveLength(catalogue.length)
  })
})
