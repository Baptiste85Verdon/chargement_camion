// Messages de refus d'un ajustement manuel (RG-08, RG-09, capture 04f).
import { describe, expect, it } from 'vitest'
import { reglesCitees } from '@/domaine/ajustement'
import type { MotifRegle } from '@/domaine/types'
import { textes } from '@/textes/fr'

const { ajustement } = textes.plan

// Contrôle à la compilation : un texte pour chaque motif, ni plus ni moins.
const refus: Record<MotifRegle, { raison: string; explication: (a: string, b: string) => string }> =
  ajustement.refus

const a = ajustement.citer('Carton de quincaillerie', 'A12', 'C2')
const b = ajustement.citer('Fenêtre PVC 2 vantaux', 'A11', 'C2')

describe("messages de refus d'un ajustement", () => {
  it('RG-08 : reprend le message de la capture 04f pour A12 posé sur A11', () => {
    expect(ajustement.titreDeplacement(refus.surFragile.raison)).toBe(
      'Déplacement refusé : article fragile',
    )
    expect(`${refus.surFragile.explication(a, b)} ${ajustement.reprendSaPlace}`).toBe(
      "« Carton de quincaillerie » (A12, C2) reposerait sur « Fenêtre PVC 2 vantaux » (A11, C2). Un article fragile ne supporte rien au-dessus de lui. L'article reprend sa place.",
    )
  })

  it.each(Object.entries(refus))(
    'RG-08 : le motif %s a un message court, en langage courant, sans numéro de règle',
    (_motif, texte) => {
      const message = texte.explication(a, b)
      expect(texte.raison.length).toBeGreaterThan(0)
      expect(message).toContain('A12')
      // Les numéros viennent du domaine (`reglesCitees`) : pas de risque d'en citer un faux.
      expect(message).not.toMatch(/RG-\d/)
      expect(message).not.toContain('!')
    },
  )

  it("RG-04 : cite RG-04 pour l'appui, et non RG-08 seul (écart connu de la maquette)", () => {
    expect(reglesCitees({ regle: 'RG-04', motif: 'appuiInsuffisant', uniteId: 'A12' })).toEqual([
      'RG-04',
      'RG-08',
    ])
  })

  it('RG-08 : nomme les articles en cause dans un retrait refusé (décision 12)', () => {
    const a04 = ajustement.citer('Paquet de plaques BA13', 'A04', 'C3')
    const a05 = ajustement.citer('Paquet de plaques BA13', 'A05', 'C3')
    expect(ajustement.retrait.appuiInsuffisant(a04, a05)).toBe(
      `${a04} porte ${a05} : retirez d'abord ${a05}.`,
    )
    expect(ajustement.retirerAussi('A05')).toBe('Retirer aussi A05')
  })
})
