import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { textes } from '@/textes/fr'
import { depotsDemarrage, monterPage } from './monter-page'

const t = textes.ficheCamion

afterEach(() => {
  document.body.innerHTML = ''
})

function bouton(page: VueWrapper, texte: string) {
  const trouve = page.findAll('button').find((b) => b.text() === texte)
  if (!trouve) throw new Error(`Bouton « ${texte} » introuvable`)
  return trouve
}

const fenetreOuverte = () => document.querySelector('dialog[open]')

/** Clique le bouton de la fenêtre ouverte dont le texte est `texte`. */
async function cliquerDansFenetre(texte: string) {
  const b = [...(fenetreOuverte()?.querySelectorAll('button') ?? [])].find(
    (x) => x.textContent?.trim() === texte,
  )
  if (!b) throw new Error(`Bouton « ${texte} » absent de la fenêtre`)
  b.click()
  await flushPromises()
}

async function ficheDe(nom: string, depots = depotsDemarrage()) {
  const camion = (await depots.camions.lister()).find((c) => c.nom === nom)
  if (!camion) throw new Error(`${nom} absent de la base d’exemple`)
  return { camion, ...(await monterPage(`/camions/${camion.id}`, depots)) }
}

describe('Modèles de camions (capture 09)', () => {
  it('RG-01 : liste les 4 modèles d’exemple, avec leur volume et leurs tournées', async () => {
    const { page } = await monterPage('/camions')
    const lignes = page.findAll('tbody tr')
    expect(lignes).toHaveLength(4)
    const porteur = lignes.find((l) => l.text().includes('Porteur 7,2 m'))
    expect(porteur?.text()).toContain('43,2 m³')
    expect(porteur?.text()).toContain('T-2026-118')
  })

  it('RG-21 : un modèle archivé quitte la liste et se réactive', async () => {
    const depots = depotsDemarrage()
    const fourgon = (await depots.camions.lister()).find((c) => c.nom === 'Fourgon 20 m³')
    await depots.camions.archiver(fourgon?.id ?? '')
    const { page } = await monterPage('/camions', depots)
    expect(page.findAll('.tableau')[0]?.findAll('tbody tr')).toHaveLength(3)

    await bouton(page, textes.camions.archives.afficher(1)).trigger('click')
    await page
      .findAll('#camions-archives button')
      .find((b) => b.text().startsWith(textes.referentiels.reactiver))
      ?.trigger('click')
    await flushPromises()
    expect(page.findAll('.tableau')[0]?.findAll('tbody tr')).toHaveLength(4)
  })
})

describe('Fiche camion (captures 09b et 09e)', () => {
  it('RG-21 : enregistrer un formulaire incomplet affiche le résumé (capture 09e)', async () => {
    const { page } = await monterPage('/camions/nouveau')
    await page.get('#camion-longueur').setValue('7 200')
    await page.get('#camion-largeur').setValue('2,4')
    await page.get('form').trigger('submit')
    await flushPromises()
    const resume = page.get('[role="alert"]')
    expect(resume.text()).toContain(textes.composants.champsACorriger(3))
    expect(page.text()).toContain(textes.validation.camion.nom)
    expect(page.text()).toContain(textes.validation.nombre.entierPositif)
    expect(page.text()).toContain(textes.validation.camion.hauteur)
  })

  it('crée un modèle, calcule son volume, puis ouvre sa fiche', async () => {
    const { page, depots, routeur } = await monterPage('/camions/nouveau')
    await page.get('#camion-nom').setValue('Porteur 5 m')
    await page.get('#camion-longueur').setValue('5000')
    await page.get('#camion-largeur').setValue('2000')
    await page.get('#camion-hauteur').setValue('2000')
    expect(page.text()).toContain('20,0 m³')
    await page.get('form').trigger('submit')
    await flushPromises()
    const cree = (await depots.camions.lister()).find((c) => c.nom === 'Porteur 5 m')
    expect(cree).toMatchObject({ longueur: 5000, largeur: 2000, hauteur: 2000 })
    expect(routeur.currentRoute.value.path).toBe(`/camions/${cree?.id}`)
  })

  it('affiche le plan coté de la caisse, vue de dessus et vue de côté', async () => {
    const { page } = await ficheDe('Porteur 7,2 m')
    const plans = page.findAll('svg[role="img"]')
    expect(plans.map((p) => p.attributes('aria-label'))).toEqual([
      t.descriptionPlan(t.vueDessus, '7 200 mm', '2 400 mm'),
      t.descriptionPlan(t.vueCote, '7 200 mm', '2 500 mm'),
    ])
    expect(page.text()).toContain(t.tournee('T-2026-118', 'en préparation'))
  })

  it('RG-21 : refuse de supprimer ou d’archiver un modèle d’une tournée en cours, en citant la tournée', async () => {
    const { page, depots, camion } = await ficheDe('Porteur 7,2 m')
    await bouton(page, t.supprimer).trigger('click')
    await flushPromises()
    expect(fenetreOuverte()).toBeNull()
    expect(page.get('[role="status"]').text()).toContain(
      textes.validation.camion.utilise('T-2026-118'),
    )
    await bouton(page, t.archiver).trigger('click')
    await flushPromises()
    expect((await depots.camions.obtenir(camion.id))?.archiveLe).toBeUndefined()
  })

  it('RG-22 : un modèle jamais utilisé se supprime après confirmation', async () => {
    const { page, depots, camion, routeur } = await ficheDe('Fourgon 20 m³')
    await bouton(page, t.supprimer).trigger('click')
    await flushPromises()
    expect(fenetreOuverte()?.textContent).toContain(t.supprimerTitre('Fourgon 20 m³'))
    await cliquerDansFenetre(t.supprimer)
    expect(await depots.camions.obtenir(camion.id)).toBeNull()
    await vi.waitFor(() => expect(routeur.currentRoute.value.path).toBe('/camions'))
  })

  it('RG-22 : un modèle utilisé seulement par une tournée chargée s’archive au lieu d’être supprimé', async () => {
    const depots = depotsDemarrage()
    const [tournee] = await depots.tournees.lister()
    if (!tournee) throw new Error('Tournée T-2026-118 absente')
    await depots.tournees.enregistrer({ ...tournee, statut: 'chargee' })
    const { page, camion } = await ficheDe('Porteur 7,2 m', depots)

    await bouton(page, t.supprimer).trigger('click')
    await flushPromises()
    expect(fenetreOuverte()?.textContent).toContain(t.archiverConsequence(1))
    await cliquerDansFenetre(t.archiver)
    expect((await depots.camions.obtenir(camion.id))?.archiveLe).toEqual(expect.any(String))
  })

  it('RG-22 : enregistrer un modèle d’une tournée en cours demande confirmation', async () => {
    const { page, depots, camion } = await ficheDe('Porteur 7,2 m')
    await page.get('#camion-longueur').setValue('7300')
    await page.get('form').trigger('submit')
    await flushPromises()
    expect(fenetreOuverte()?.textContent).toContain(t.enregistrerConsequence('T-2026-118'))
    expect((await depots.camions.obtenir(camion.id))?.longueur).toBe(7200)

    await cliquerDansFenetre(t.enregistrer)
    expect((await depots.camions.obtenir(camion.id))?.longueur).toBe(7300)
  })

  it('enregistre sans confirmation un modèle qui ne sert à aucune tournée en cours', async () => {
    const { page, depots, camion } = await ficheDe('Fourgon 20 m³')
    await page.get('#camion-hauteur').setValue('2300')
    await page.get('form').trigger('submit')
    await flushPromises()
    expect(fenetreOuverte()).toBeNull()
    expect((await depots.camions.obtenir(camion.id))?.hauteur).toBe(2300)
  })
})
