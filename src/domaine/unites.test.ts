import { describe, expect, it } from 'vitest'
import type { Article, CommandeAPlacer, LigneCommande } from './types'
import { preparerUnites } from './unites'

/** Une fenêtre qui peut être livrée nue ou emballée (RG-02). */
const fenetre: Article = {
  id: 'FEN',
  dimsEmballees: { l: 1500, w: 1350, h: 180 },
  dimsNues: { l: 1450, w: 1300, h: 120 },
  poids: 45,
  fragile: true,
  porteur: true,
  orientations: ['debout'],
}

/** Une palette livrée seulement emballée. */
const palette: Article = {
  id: 'PAL',
  dimsEmballees: { l: 1200, w: 1000, h: 1050 },
  poids: 1225,
  fragile: false,
  porteur: true,
  orientations: ['aPlat'],
}

const articles = [fenetre, palette]

function ligne(
  partielle: Partial<LigneCommande> & { id: string; articleId: string },
): LigneCommande {
  return { quantite: 1, nu: false, ...partielle }
}

function commande(rang: number, lignes: LigneCommande[]): CommandeAPlacer {
  return { id: `C${rang}`, rangLivraison: rang, lignes }
}

describe('preparerUnites', () => {
  it('éclate chaque ligne en autant d’unités que sa quantité', () => {
    const unites = preparerUnites(
      [commande(2, [ligne({ id: 'L1', articleId: 'PAL', quantite: 3 })])],
      articles,
    )
    expect(unites.map((u) => u.id)).toEqual(['L1-1', 'L1-2', 'L1-3'])
    expect(unites.map((u) => u.numero)).toEqual([1, 2, 3])
    expect(unites.every((u) => u.ligneCommandeId === 'L1' && u.commandeId === 'C2')).toBe(true)
    expect(unites.every((u) => u.commandeRang === 2)).toBe(true)
  })

  it('reprend les caractéristiques de l’article : fragile, porteur, orientations', () => {
    const [u] = preparerUnites([commande(1, [ligne({ id: 'L1', articleId: 'FEN' })])], articles)
    expect(u).toMatchObject({ fragile: true, porteur: true, orientations: ['debout'] })
  })

  it('RG-02 : retient par défaut la taille emballée, la plus grande', () => {
    const [u] = preparerUnites([commande(1, [ligne({ id: 'L1', articleId: 'FEN' })])], articles)
    expect(u?.dims).toEqual({ l: 1500, w: 1350, h: 180 })
  })

  it('RG-02 : retient la taille nue pour une ligne livrée nue', () => {
    const [u] = preparerUnites(
      [commande(1, [ligne({ id: 'L1', articleId: 'FEN', nu: true })])],
      articles,
    )
    expect(u?.dims).toEqual({ l: 1450, w: 1300, h: 120 })
  })

  it('RG-02 : garde la taille emballée si l’article n’a pas de taille nue', () => {
    const [u] = preparerUnites(
      [commande(1, [ligne({ id: 'L1', articleId: 'PAL', nu: true })])],
      articles,
    )
    expect(u?.dims).toEqual({ l: 1200, w: 1000, h: 1050 })
  })

  it('RG-03 : applique les dimensions et le poids propres à la commande', () => {
    const unites = preparerUnites(
      [
        commande(1, [
          ligne({
            id: 'L1',
            articleId: 'PAL',
            dimsPropres: { l: 1200, w: 800, h: 900 },
            poidsPropre: 900,
          }),
        ]),
      ],
      articles,
    )
    expect(unites[0]).toMatchObject({ dims: { l: 1200, w: 800, h: 900 }, poids: 900 })
  })

  it('RG-03 : ne touche ni au catalogue ni aux autres commandes', () => {
    const unites = preparerUnites(
      [
        commande(1, [
          ligne({ id: 'L1', articleId: 'PAL', dimsPropres: { l: 1, w: 2, h: 3 }, poidsPropre: 9 }),
        ]),
        commande(2, [ligne({ id: 'L2', articleId: 'PAL' })]),
      ],
      articles,
    )
    expect(unites[1]).toMatchObject({ dims: { l: 1200, w: 1000, h: 1050 }, poids: 1225 })
    expect(palette.dimsEmballees).toEqual({ l: 1200, w: 1000, h: 1050 })
    expect(palette.poids).toBe(1225)
  })

  it('refuse une ligne dont l’article est inconnu', () => {
    expect(() =>
      preparerUnites([commande(1, [ligne({ id: 'L1', articleId: 'XXX' })])], articles),
    ).toThrow('Article inconnu : XXX')
  })
})
