import { describe, expect, it } from 'vitest'
import { comparerValeurs, sensSuivant, trierLignes } from '@/composants/tri'

describe('tri des tableaux', () => {
  it('compare les textes à la française, sans tenir compte de la casse ni des accents', () => {
    const noms = ['élan', 'Zèbre', 'abeille', 'Éclair']
    expect([...noms].sort(comparerValeurs)).toEqual(['abeille', 'Éclair', 'élan', 'Zèbre'])
  })

  it('compare les nombres contenus dans les textes comme des nombres', () => {
    expect(['Porteur 8,5 m', 'Porteur 12 m', 'Porteur 6,2 m'].sort(comparerValeurs)).toEqual([
      'Porteur 6,2 m',
      'Porteur 8,5 m',
      'Porteur 12 m',
    ])
  })

  it('compare des listes élément par élément (longueur, puis largeur, puis hauteur)', () => {
    expect(comparerValeurs([1200, 1000, 1050], [1200, 1000, 1100])).toBeLessThan(0)
    expect(comparerValeurs([4000, 175, 63], [1200, 1000, 1100])).toBeGreaterThan(0)
  })

  it('trie dans le sens demandé, sans modifier la liste d’origine', () => {
    const lignes = [{ p: 30 }, { p: 4 }, { p: 1225 }]
    expect(trierLignes(lignes, (l) => l.p, 'croissant').map((l) => l.p)).toEqual([4, 30, 1225])
    expect(trierLignes(lignes, (l) => l.p, 'decroissant').map((l) => l.p)).toEqual([1225, 30, 4])
    expect(lignes.map((l) => l.p)).toEqual([30, 4, 1225])
  })

  it('garde l’ordre d’origine entre deux lignes égales (tri stable)', () => {
    const lignes = [
      { nom: 'b', f: 1 },
      { nom: 'a', f: 1 },
      { nom: 'c', f: 0 },
    ]
    expect(trierLignes(lignes, (l) => l.f, 'croissant').map((l) => l.nom)).toEqual(['c', 'b', 'a'])
    expect(trierLignes(lignes, (l) => l.f, 'decroissant').map((l) => l.nom)).toEqual([
      'b',
      'a',
      'c',
    ])
  })

  it('un clic sur une autre colonne trie en croissant ; sur la même colonne, inverse le sens', () => {
    expect(sensSuivant(null, 'poids', null)).toEqual({ cle: 'poids', sens: 'croissant' })
    expect(sensSuivant({ cle: 'nom', sens: 'decroissant' }, 'poids', null)).toEqual({
      cle: 'poids',
      sens: 'croissant',
    })
    expect(sensSuivant({ cle: 'poids', sens: 'croissant' }, 'poids', null)).toEqual({
      cle: 'poids',
      sens: 'decroissant',
    })
  })

  it('un troisième clic sur la même colonne revient au tri de départ', () => {
    // Catalogue : pas de tri de départ, l'ordre par famille revient.
    expect(sensSuivant({ cle: 'poids', sens: 'decroissant' }, 'poids', null)).toBeNull()
    // Camions : le tri par nom revient.
    const parNom = { cle: 'nom', sens: 'croissant' } as const
    expect(sensSuivant({ cle: 'poids', sens: 'decroissant' }, 'poids', parNom)).toEqual(parNom)
  })

  it('sur la colonne du tri de départ, le cycle est croissant, décroissant, puis départ', () => {
    const parNom = { cle: 'nom', sens: 'croissant' } as const
    expect(sensSuivant(parNom, 'nom', parNom)).toEqual({ cle: 'nom', sens: 'decroissant' })
    expect(sensSuivant({ cle: 'nom', sens: 'decroissant' }, 'nom', parNom)).toEqual(parNom)
  })
})
