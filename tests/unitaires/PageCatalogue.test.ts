import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { textes } from '@/textes/fr'
import { depotsDemarrage, monterPage } from './monter-page'

const t = textes.catalogue

afterEach(() => {
  document.body.innerHTML = ''
})

/** Noms des articles affichés dans le tableau principal. */
const noms = (page: Awaited<ReturnType<typeof monterPage>>['page']) =>
  page.findAll('.catalogue tbody th').map((th) => th.text())

describe('Catalogue des articles (capture 07)', () => {
  it('RG-01 : affiche les 24 articles de la base d’exemple', async () => {
    const { page } = await monterPage('/catalogue')
    expect(noms(page)).toHaveLength(24)
    expect(page.text()).toContain(t.compte(24, 24))
  })

  it('affiche les dimensions à plat, avec la mention « à plat » (écart connu 07)', async () => {
    const { page } = await monterPage('/catalogue')
    expect(page.text()).toContain(t.colonnes.tailleEmballee)
    const ligne = page.findAll('.catalogue tbody tr').find((tr) => tr.text().includes('FEN-PVC-2V'))
    expect(ligne?.text()).toContain('1 500 × 1 350 × 180')
  })

  it('cherche par nom ou par référence', async () => {
    const { page } = await monterPage('/catalogue')
    await page.get('#recherche-catalogue').setValue('velux')
    expect(noms(page)).toHaveLength(3)
    await page.get('#recherche-catalogue').setValue('PLQ-BA13H')
    expect(noms(page)).toEqual(['Paquet de plaques BA13 hydro 260 × 120'])
    expect(page.text()).toContain(t.compte(1, 24))
  })

  it('filtre par famille, avec le nombre d’articles de chaque famille', async () => {
    const { page } = await monterPage('/catalogue')
    const bouton = page.findAll('button').find((b) => b.text().startsWith('Fenêtres 4'))
    await bouton?.trigger('click')
    expect(bouton?.attributes('aria-pressed')).toBe('true')
    expect(noms(page)).toHaveLength(4)
  })

  it('RG-21 : un article archivé quitte le catalogue et se réactive depuis la liste des archivés', async () => {
    const depots = depotsDemarrage()
    const [premier] = await depots.articles.lister()
    await depots.articles.archiver(premier?.id ?? '')
    const { page } = await monterPage('/catalogue', depots)
    expect(noms(page)).toHaveLength(23)

    const afficher = page.findAll('button').find((b) => b.text() === t.archives.afficher(1))
    await afficher?.trigger('click')
    expect(page.get('#articles-archives').text()).toContain(premier?.nom)

    await page.get('#articles-archives button').trigger('click')
    await flushPromises()
    expect(noms(page)).toHaveLength(24)
    expect(page.get('[role="status"]').text()).toContain(t.reactive(premier?.nom ?? ''))
  })

  it('RG-21 : refuse de réactiver un article dont la référence a été reprise, et dit pourquoi', async () => {
    const depots = depotsDemarrage()
    const ba13 = (await depots.articles.lister()).find((a) => a.reference === 'PLQ-BA13')
    if (!ba13) throw new Error('PLQ-BA13 absent de la base d’exemple')
    await depots.articles.archiver(ba13.id)
    await depots.articles.enregistrer({ ...ba13, id: undefined, nom: 'BA13 nouvelle gamme' })
    const { page } = await monterPage('/catalogue', depots)

    const afficher = page.findAll('button').find((b) => b.text() === t.archives.afficher(1))
    await afficher?.trigger('click')
    await page.get('#articles-archives button').trigger('click')
    await flushPromises()
    expect(page.get('[role="status"]').text()).toContain(
      t.referenceReprise(ba13.nom, 'PLQ-BA13', 'BA13 nouvelle gamme'),
    )
  })
})
