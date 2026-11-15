// Accueil · tournées (capture 01, CF 4.1).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { textes } from '@/textes/fr'
import { monterPage } from './monter-page'

afterEach(() => {
  document.body.innerHTML = ''
})

describe("page d'accueil (capture 01)", () => {
  it('affiche le titre de la page en h1', async () => {
    const { page } = await monterPage('/')
    expect(page.get('h1').text()).toBe(textes.accueil.titre)
  })

  it('RG-01 : liste les tournées d’exemple avec camion, codes de commande et statut', async () => {
    const { page } = await monterPage('/')
    const lignes = page.findAll('tbody tr')
    expect(lignes).toHaveLength(2)
    const t118 = lignes.find((l) => l.text().includes('T-2026-118'))
    expect(t118?.text()).toContain('Jeudi 5 novembre 2026')
    expect(t118?.text()).toContain('Porteur 7,2 m')
    expect(t118?.findAll('.code-commande').map((c) => c.text())).toEqual(['C1', 'C2', 'C3', 'C4'])
    expect(t118?.text()).toContain('4 commandes')
    expect(t118?.text()).toContain('En préparation')
    // La date est le lien vers la préparation de la tournée.
    expect(t118?.get('th a').attributes('href')).toMatch(/^\/tournees\//)
  })

  it('montre les accès rapides avec leurs nombres', async () => {
    const { page } = await monterPage('/')
    const raccourcis = page.get(`nav[aria-label="${textes.accueil.raccourcis}"]`).text()
    expect(raccourcis).toContain('24 articles · 9 familles')
    expect(raccourcis).toContain('4 modèles')
    expect(raccourcis).toContain('1 élément à affecter à une tournée')
  })

  it('crée une tournée en préparation, sans date ni camion, et ouvre sa préparation', async () => {
    const { page, routeur, depots } = await monterPage('/')
    const creer = page.findAll('button').find((b) => b.text() === textes.accueil.creer)
    await creer?.trigger('click')
    await vi.waitFor(() => expect(routeur.currentRoute.value.path).toMatch(/^\/tournees\//))

    const tournees = await depots.tournees.lister()
    expect(tournees).toHaveLength(3)
    const nouvelle = tournees.find((tr) => !['T-2026-118', 'T-2026-117'].includes(tr.reference))
    expect(nouvelle).toMatchObject({ date: null, modeleCamionId: null, statut: 'enPreparation' })
    expect(nouvelle?.reference).toMatch(/^T-\d{4}-\d{3}$/)
    expect(routeur.currentRoute.value.path).toBe(`/tournees/${nouvelle?.id}`)
  })
})
