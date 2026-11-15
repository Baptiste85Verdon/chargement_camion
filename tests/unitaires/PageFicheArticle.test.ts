import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { textes } from '@/textes/fr'
import { depotsDemarrage, monterPage } from './monter-page'

const t = textes.ficheArticle

afterEach(() => {
  document.body.innerHTML = ''
})

/** Le bouton dont le texte est exactement `texte`. */
function bouton(page: VueWrapper, texte: string) {
  const trouve = page.findAll('button').find((b) => b.text() === texte)
  if (!trouve) throw new Error(`Bouton « ${texte} » introuvable`)
  return trouve
}

/** La fenêtre de confirmation ouverte, s'il y en a une. */
const fenetreOuverte = () => document.querySelector('dialog[open]')

async function ficheDe(reference: string, depots = depotsDemarrage()) {
  const article = (await depots.articles.lister()).find((a) => a.reference === reference)
  if (!article) throw new Error(`${reference} absent de la base d’exemple`)
  return { article, ...(await monterPage(`/catalogue/${article.id}`, depots)) }
}

describe('Fiche article : création (captures 08 et 08e)', () => {
  it('RG-21 : enregistrer un formulaire vide affiche le résumé des champs à corriger', async () => {
    const { page } = await monterPage('/catalogue/nouveau')
    await page.get('form').trigger('submit')
    await flushPromises()

    const resume = page.get('[role="alert"]')
    // Nom, famille, taille emballée, poids, orientations.
    expect(resume.text()).toContain(textes.composants.champsACorriger(5))
    expect(document.activeElement).toBe(resume.element)
    expect(page.get('#article-nom').attributes('aria-invalid')).toBe('true')
    expect(page.text()).toContain(textes.validation.article.orientationRequise)
  })

  it('RG-21 : une erreur disparaît dès que la valeur est corrigée', async () => {
    const { page } = await monterPage('/catalogue/nouveau')
    await page.get('form').trigger('submit')
    await page.get('#article-nom').setValue('Carton de vis')
    expect(page.get('#article-nom').attributes('aria-invalid')).toBeUndefined()
  })

  it('RG-21 : un champ est vérifié quand on le quitte', async () => {
    const { page } = await monterPage('/catalogue/nouveau')
    expect(page.text()).not.toContain(textes.validation.article.nom)
    await page.get('#article-nom').trigger('blur')
    expect(page.text()).toContain(textes.validation.article.nom)
  })

  it('CF 4.6 : les orientations sont proposées selon la famille (RG-04)', async () => {
    const { page } = await monterPage('/catalogue/nouveau')
    await page.get('#article-famille').setValue('Fenêtres')
    expect((page.get('#article-orientation-debout').element as HTMLInputElement).checked).toBe(true)
    expect((page.get('#article-orientation-aPlat').element as HTMLInputElement).checked).toBe(false)
    await page.get('#article-famille').setValue('Plaques de plâtre')
    expect((page.get('#article-orientation-aPlat').element as HTMLInputElement).checked).toBe(true)
    expect((page.get('#article-orientation-contreParoi').element as HTMLInputElement).checked).toBe(
      true,
    )
    expect(page.text()).toContain(t.orientationsParDefaut('Plaques de plâtre'))
  })

  it('RG-04 : « Dessus porteur » est désactivé, avec une explication, quand « Fragile » est coché (écart connu 08)', async () => {
    const { page } = await monterPage('/catalogue/nouveau')
    await page.get('#article-fragile').setValue(true)
    const porteur = page.get('#article-porteur').element as HTMLInputElement
    expect(porteur.disabled).toBe(true)
    expect(porteur.checked).toBe(false)
    expect(page.text()).toContain(t.porteurFragile)
  })

  it('RG-18 : une forme non rectangulaire décoche « Dessus porteur » par défaut', async () => {
    const { page } = await monterPage('/catalogue/nouveau')
    await page.get('input[value="cylindrique"]').setValue(true)
    expect((page.get('#article-porteur').element as HTMLInputElement).checked).toBe(false)
    expect(page.text()).toContain(t.porteurNonRectangulaire)
  })

  it('RG-02 : les dimensions nues n’apparaissent que si l’article peut être livré nu', async () => {
    const { page } = await monterPage('/catalogue/nouveau')
    expect(page.find('#article-nu-l').exists()).toBe(false)
    await page.get('#article-livrable-nu').setValue(true)
    expect(page.find('#article-nu-l').exists()).toBe(true)
  })

  it('RG-05 : la fiche n’a pas de champ « Poids nu » (écart connu 08)', async () => {
    const { page } = await monterPage('/catalogue/nouveau')
    await page.get('#article-livrable-nu').setValue(true)
    expect(page.text()).not.toContain('Poids nu')
  })

  it('crée l’article puis ouvre sa fiche', async () => {
    const { page, routeur, depots } = await monterPage('/catalogue/nouveau')
    await page.get('#article-nom').setValue('Carton de vis')
    await page.get('#article-famille').setValue('Quincaillerie')
    await page.get('#article-emballe-l').setValue('400')
    await page.get('#article-emballe-w').setValue('300')
    await page.get('#article-emballe-h').setValue('200')
    await page.get('#article-poids').setValue('12,5')
    await page.get('form').trigger('submit')
    await flushPromises()

    const cree = (await depots.articles.lister()).find((a) => a.nom === 'Carton de vis')
    expect(cree).toMatchObject({
      famille: 'Quincaillerie',
      dimsEmballees: { l: 400, w: 300, h: 200 },
      poids: 12.5,
      orientations: ['aPlat'],
    })
    expect(routeur.currentRoute.value.path).toBe(`/catalogue/${cree?.id}`)
  })
})

describe('Fiche article : modification (capture 08)', () => {
  it('affiche les dimensions à plat de la fenêtre (écart connu 07 et 08)', async () => {
    const { page } = await ficheDe('FEN-PVC-2V')
    expect((page.get('#article-emballe-w').element as HTMLInputElement).value).toBe('1350')
    expect((page.get('#article-emballe-h').element as HTMLInputElement).value).toBe('180')
    expect(page.text()).toContain(t.tailleEmballee)
  })

  it('liste les commandes en cours qui utilisent l’article', async () => {
    const { page } = await ficheDe('PLQ-BA13')
    expect(page.text()).toContain(t.commande('CMD-2026-0433', 'SCI Martin'))
    expect(page.text()).toContain('T-2026-118')
  })

  it('enregistre une modification et l’annonce', async () => {
    const { page, depots, article } = await ficheDe('QUI-CAR')
    await page.get('#article-poids').setValue('31')
    await page.get('form').trigger('submit')
    await flushPromises()
    expect((await depots.articles.obtenir(article.id))?.poids).toBe(31)
    expect(page.get('[role="status"]').text()).toContain(t.enregistre(article.nom))
  })

  it('RG-21 : une référence déjà prise est refusée sous le champ', async () => {
    const { page } = await ficheDe('QUI-CAR')
    await page.get('#article-reference').setValue('PLQ-BA13')
    await page.get('form').trigger('submit')
    await flushPromises()
    expect(page.text()).toContain(
      textes.validation.article.referenceDejaPrise('Paquet de plaques BA13 250 × 120'),
    )
  })
})

describe('Fiche article : suppression et archivage (RG-21, RG-22)', () => {
  it('RG-22 : un article jamais utilisé se supprime après confirmation', async () => {
    const { page, depots, article, routeur } = await ficheDe('QUI-VIS-35')
    await bouton(page, t.supprimer).trigger('click')
    await flushPromises()
    expect(fenetreOuverte()?.textContent).toContain(t.supprimerTitre(article.nom))
    expect(fenetreOuverte()?.textContent).toContain(t.supprimerConsequence)

    const confirmer = [...(fenetreOuverte()?.querySelectorAll('button') ?? [])].find(
      (b) => b.textContent?.trim() === t.supprimer,
    )
    confirmer?.click()
    await flushPromises()
    expect(await depots.articles.obtenir(article.id)).toBeNull()
    // La page du catalogue se charge à la demande : on attend la navigation.
    await vi.waitFor(() => expect(routeur.currentRoute.value.path).toBe('/catalogue'))
  })

  it('RG-22 : annuler la suppression ne supprime rien', async () => {
    const { page, depots, article } = await ficheDe('QUI-VIS-35')
    await bouton(page, t.supprimer).trigger('click')
    await flushPromises()
    const annuler = [...(fenetreOuverte()?.querySelectorAll('button') ?? [])].find(
      (b) => b.textContent?.trim() === textes.composants.annuler,
    )
    annuler?.click()
    await flushPromises()
    expect(fenetreOuverte()).toBeNull()
    expect(await depots.articles.obtenir(article.id)).not.toBeNull()
  })

  it('RG-22 : un article utilisé ne se supprime pas, la fenêtre propose de l’archiver', async () => {
    const { page, depots, article } = await ficheDe('PLQ-BA13')
    await bouton(page, t.supprimer).trigger('click')
    await flushPromises()
    expect(fenetreOuverte()?.textContent).toContain(t.archiverConsequence(1))

    const archiver = [...(fenetreOuverte()?.querySelectorAll('button') ?? [])].find(
      (b) => b.textContent?.trim() === t.archiver,
    )
    archiver?.click()
    await flushPromises()
    expect((await depots.articles.obtenir(article.id))?.archiveLe).toEqual(expect.any(String))
    expect((await depots.articles.lister()).map((a) => a.id)).not.toContain(article.id)
  })

  it('RG-21 : un article archivé se réactive depuis sa fiche', async () => {
    const depots = depotsDemarrage()
    const article = (await depots.articles.lister()).find((a) => a.reference === 'QUI-CAR')
    await depots.articles.archiver(article?.id ?? '')
    const { page } = await monterPage(`/catalogue/${article?.id}`, depots)
    expect(page.text()).toContain(t.archiveBandeau)
    await bouton(page, t.reactiver).trigger('click')
    await flushPromises()
    expect((await depots.articles.lister()).map((a) => a.id)).toContain(article?.id)
  })

  it('RG-22 : quitter une fiche modifiée demande confirmation', async () => {
    const { page, routeur } = await ficheDe('QUI-CAR')
    await page.get('#article-nom').setValue('Carton modifié')
    await routeur.push('/catalogue')
    await flushPromises()
    expect(routeur.currentRoute.value.path).not.toBe('/catalogue')
    expect(fenetreOuverte()?.textContent).toContain(textes.referentiels.quitterTitre)

    const quitter = [...(fenetreOuverte()?.querySelectorAll('button') ?? [])].find(
      (b) => b.textContent?.trim() === textes.referentiels.quitterAction,
    )
    quitter?.click()
    await vi.waitFor(() => expect(routeur.currentRoute.value.path).toBe('/catalogue'))
  })
})
