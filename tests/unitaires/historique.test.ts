// Pile d'annulation des ajustements manuels (cahier technique 5.18).
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useHistorique } from '@/stores/historique'

const plan = (x: number) => [
  { uniteId: 'u', x, y: 0, z: 0, orientation: 'aPlat' as const, rang: 1 },
]

describe("historique d'annulation", () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('RG-08 : annule plusieurs fois de suite, du dernier changement au premier', () => {
    const h = useHistorique()
    h.empiler({ planId: 'v3', avant: plan(0), libelle: 'Déplacement de A01' })
    h.empiler({ planId: 'v3', avant: plan(50), libelle: 'Déplacement de A01' })
    expect(h.depiler('v3')?.avant).toEqual(plan(50))
    expect(h.depiler('v3')?.avant).toEqual(plan(0))
    expect(h.depiler('v3')).toBeUndefined()
  })

  it("RG-08 : n'annule jamais un changement d'une autre version", () => {
    const h = useHistorique()
    h.empiler({ planId: 'v3', avant: plan(0), libelle: 'Déplacement de A01' })
    expect(h.peutAnnuler('v4')).toBe(false)
    expect(h.depiler('v4')).toBeUndefined()
    expect(h.peutAnnuler('v3')).toBe(true)
  })

  it('se vide à chaque nouvelle version', () => {
    const h = useHistorique()
    h.empiler({ planId: 'v3', avant: plan(0), libelle: 'Déplacement de A01' })
    h.vider()
    expect(h.peutAnnuler('v3')).toBe(false)
  })
})
