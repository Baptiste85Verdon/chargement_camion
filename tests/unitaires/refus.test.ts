// Message d'un ajustement refusé (RG-08, RG-09, capture 04f).
import { describe, expect, it } from 'vitest'
import { type ArticleCite, messageRefus } from '@/composants/refus'

const articles: Record<string, ArticleCite> = {
  a12: { nom: 'Carton de quincaillerie', repere: 'A12', code: 2 },
  a11: { nom: 'Fenêtre PVC 2 vantaux', repere: 'A11', code: 2 },
  a04: { nom: 'Paquet de plaques BA13', repere: 'A04', code: 3 },
  a05: { nom: 'Paquet de plaques BA13', repere: 'A05', code: 3 },
}
const citer = (id: string) => articles[id]

describe("message d'un ajustement refusé", () => {
  it('RG-08 : reprend le bandeau de la capture 04f pour A12 posé sur A11', () => {
    const message = messageRefus(
      [
        { regle: 'RG-04', motif: 'surFragile', uniteId: 'a12', autreUniteId: 'a11' },
        { regle: 'RG-04', motif: 'fragileCharge', uniteId: 'a11', autreUniteId: 'a12' },
      ],
      'deplacement',
      citer,
    )
    expect(message).toEqual({
      titre: 'Déplacement refusé : article fragile',
      regles: 'RG-04 · RG-08',
      texte:
        "« Carton de quincaillerie » (A12, C2) reposerait sur « Fenêtre PVC 2 vantaux » (A11, C2). Un article fragile ne supporte rien au-dessus de lui. L'article reprend sa place.",
    })
  })

  it('RG-09 : cite RG-06 et RG-09 pour un chevauchement', () => {
    const message = messageRefus(
      [{ regle: 'RG-06', motif: 'chevauchement', uniteId: 'a12', autreUniteId: 'a11' }],
      'deplacement',
      citer,
    )
    expect(message.titre).toBe('Déplacement refusé : place occupée')
    expect(message.regles).toBe('RG-06 · RG-09')
  })

  it("RG-08 : un changement d'orientation refusé a son propre titre", () => {
    const message = messageRefus(
      [{ regle: 'RG-04', motif: 'orientationUnique', uniteId: 'a12' }],
      'orientation',
      citer,
    )
    expect(message.titre).toBe("Changement d'orientation refusé : une seule orientation")
    expect(message.texte).toBe(
      "« Carton de quincaillerie » (A12, C2) n'a qu'une orientation autorisée. L'article reprend sa place.",
    )
  })

  it('RG-08 : un article de la zone refusé à une place y reste, sans « reprend sa place »', () => {
    const message = messageRefus(
      [{ regle: 'RG-08', motif: 'ordreImpossible', uniteId: 'a12' }],
      'remise',
      citer,
    )
    expect(message.titre).toBe('Placement refusé : aucun ordre de chargement')
    expect(message.regles).toBe('RG-08')
    expect(message.texte).not.toContain('reprend sa place')
  })

  it('RG-08 : un retrait refusé nomme l’article retiré et celui qu’il porte (décision 12)', () => {
    const message = messageRefus(
      [{ regle: 'RG-04', motif: 'appuiInsuffisant', uniteId: 'a05', autreUniteId: 'a04' }],
      'retrait',
      citer,
    )
    expect(message.titre).toBe('Retrait refusé : appui insuffisant')
    expect(message.texte).toBe(
      "« Paquet de plaques BA13 » (A04, C3) porte « Paquet de plaques BA13 » (A05, C3) : retirez d'abord « Paquet de plaques BA13 » (A05, C3).",
    )
  })

  it('RG-19 : un retrait refusé dit quel article debout ne serait plus calé', () => {
    const message = messageRefus(
      [{ regle: 'RG-19', motif: 'deboutNonCale', uniteId: 'a11', autreUniteId: 'a12' }],
      'retrait',
      citer,
    )
    expect(message.regles).toBe('RG-19 · RG-08')
    expect(message.texte).toBe(
      "Sans « Carton de quincaillerie » (A12, C2), « Fenêtre PVC 2 vantaux » (A11, C2) n'est plus calé.",
    )
  })
})
