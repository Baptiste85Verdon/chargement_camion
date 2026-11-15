// Préparation d'une tournée, saisie express et liste d'attente
// (captures 02, 02e, 03, 03b, 03e, 10 ; CF 4.2, 4.3, 4.8).
import { flushPromises, type DOMWrapper, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { textes } from '@/textes/fr'
import { depotsDemarrage, monterPage } from './monter-page'

const T118 = 'b0000000-0000-4000-8000-000000000118'
const C1 = 'd0000000-0000-4000-8000-000000000001'
const PORTEUR_72 = 'c0000000-0000-4000-8000-000000000001'

afterEach(() => {
  document.body.innerHTML = ''
})

function bouton(page: VueWrapper, texte: string) {
  const trouve = page.findAll('button').find((b) => b.text() === texte)
  if (!trouve) throw new Error(`Bouton « ${texte} » introuvable`)
  return trouve
}

function boutonNomme(page: VueWrapper, nom: string) {
  const trouve = page.find(`button[aria-label="${nom}"]`)
  if (!trouve.exists()) throw new Error(`Bouton nommé « ${nom} » introuvable`)
  return trouve
}

/** Clique le bouton de la fenêtre de confirmation ouverte. */
async function confirmer(texte: string) {
  const b = [...(document.querySelector('dialog[open]')?.querySelectorAll('button') ?? [])].find(
    (x) => x.textContent?.trim() === texte,
  )
  if (!b) throw new Error(`Bouton « ${texte} » absent de la fenêtre`)
  b.click()
  await flushPromises()
}

const destinations = (page: VueWrapper) =>
  page.findAll('tbody .commande__lien').map((l) => l.text())

// --- Préparation -----------------------------------------------------------------

describe('Préparation d’une tournée (capture 02)', () => {
  const p = textes.preparation

  it('RG-07 : liste les commandes dans l’ordre de livraison, avec leur résumé', async () => {
    const { page } = await monterPage(`/tournees/${T118}`)
    expect(page.get('h1').text()).toContain(p.titre)
    expect(page.text()).toContain('T-2026-118 · Jeudi 5 novembre 2026')
    expect(destinations(page)).toEqual([
      'Menuiserie Dubois',
      'Chantier Les Ormeaux',
      'SCI Martin',
      'Maçonnerie Pereira',
    ])
    const premiere = page.findAll('tbody tr')[0]
    expect(premiere?.text()).toContain('1re')
    expect(premiere?.text()).toContain(p.dimensionsPropres)
    // 2 poutres de 220 kg : poids propre à la commande (RG-03).
    expect(premiere?.text()).toMatch(/440\s?kg/)
    // Le camion choisi est coché.
    expect(page.get(`input[value="${PORTEUR_72}"]`).element).toHaveProperty('checked', true)
    expect(page.get('.calcul').text()).toContain('Porteur 7,2 m')
  })

  it('RG-07 : une flèche change l’ordre de livraison et l’enregistre', async () => {
    const { page, depots } = await monterPage(`/tournees/${T118}`)
    await boutonNomme(page, p.descendre('C1')).trigger('click')
    await flushPromises()
    expect(destinations(page).slice(0, 2)).toEqual(['Chantier Les Ormeaux', 'Menuiserie Dubois'])
    const enregistrees = await depots.commandes.listerParTournee(T118)
    expect(enregistrees.map((c) => [c.commande.destination, c.commande.rangLivraison])).toEqual([
      ['Chantier Les Ormeaux', 1],
      ['Menuiserie Dubois', 2],
      ['SCI Martin', 3],
      ['Maçonnerie Pereira', 4],
    ])
    expect(page.text()).toContain(p.ordreChange('Menuiserie Dubois', '2e'))
  })

  it('RG-07 : glisser une commande sur une autre la pose à sa place', async () => {
    const { page, depots } = await monterPage(`/tournees/${T118}`)
    const lignes = page.findAll('tbody tr.commande')
    await lignes[3]?.trigger('dragstart', { dataTransfer: { setData: vi.fn() } })
    await lignes[0]?.trigger('drop')
    await flushPromises()
    const ordre = (await depots.commandes.listerParTournee(T118)).map((c) => c.commande.destination)
    expect(ordre[0]).toBe('Maçonnerie Pereira')
  })

  it('RG-21 : enregistre le camion dès qu’il est choisi', async () => {
    const { page, depots } = await monterPage(`/tournees/${T118}`)
    const autre = (await depots.camions.lister()).find((c) => c.nom === 'Porteur 8,5 m')
    await page.get(`input[value="${autre?.id}"]`).setValue(true)
    await flushPromises()
    expect((await depots.tournees.obtenir(T118))?.modeleCamionId).toBe(autre?.id)
  })

  it('RG-21 : une tournée vide ne se calcule pas ; trois champs à corriger (capture 02e)', async () => {
    const depots = depotsDemarrage()
    const vide = await depots.tournees.enregistrer({
      reference: 'T-2026-119',
      date: null,
      modeleCamionId: null,
      statut: 'enPreparation',
    })
    const { page } = await monterPage(`/tournees/${vide.id}`, depots)
    await bouton(page, p.lancer).trigger('click')
    await flushPromises()
    const resume = page.get('[role="alert"]')
    expect(resume.text()).toContain('3 champs à corriger')
    expect(resume.text()).toContain(textes.validation.tournee.date)
    expect(resume.text()).toContain(textes.validation.tournee.camion)
    expect(resume.text()).toContain(textes.validation.tournee.commandeRequise)
    expect(page.text()).toContain(p.aucuneCommande)
    expect(await depots.plans.obtenirDernier(vide.id)).toBeNull()
  })

  it('RG-10 : « Lancer le calcul » enregistre une version du plan avec toutes les unités', async () => {
    const { page, depots } = await monterPage(`/tournees/${T118}`)
    await bouton(page, p.lancer).trigger('click')
    await flushPromises()
    const plan = await depots.plans.obtenirDernier(T118)
    expect(plan?.plan.version).toBe(1)
    // Jeu « couloirs » : 12 articles, tous placés.
    expect(plan?.placements).toHaveLength(12)
    expect(page.text()).toContain(p.planCalcule(1, 12))
  })

  it('RG-22 : supprimer une commande demande confirmation, puis garde des rangs continus', async () => {
    const { page, depots } = await monterPage(`/tournees/${T118}`)
    const ligne = page.findAll('tbody tr.commande')[0] as DOMWrapper<Element>
    await ligne
      .findAll('button')
      .find((b) => b.text().startsWith(p.supprimerCommande))
      ?.trigger('click')
    expect(document.querySelector('dialog[open]')?.textContent).toContain(
      p.supprimerCommandeTitre('C1', 'Menuiserie Dubois'),
    )
    await confirmer(p.supprimerCommandeAction)
    const restantes = await depots.commandes.listerParTournee(T118)
    expect(restantes.map((c) => c.commande.rangLivraison)).toEqual([1, 2, 3])
    expect(await depots.commandes.obtenir(C1)).toBeNull()
  })

  it('RG-22 : supprimer la tournée demande confirmation et revient à l’accueil', async () => {
    const { page, depots, routeur } = await monterPage(`/tournees/${T118}`)
    await bouton(page, p.supprimer).trigger('click')
    expect(document.querySelector('dialog[open]')?.textContent).toContain(p.supprimerConsequence(4))
    await confirmer(p.supprimer)
    await vi.waitFor(() => expect(routeur.currentRoute.value.path).toBe('/'))
    expect(await depots.tournees.obtenir(T118)).toBeNull()
  })
})

// --- Saisie express ------------------------------------------------------------------

describe('Saisie express (captures 03, 03b, 03e)', () => {
  const s = textes.saisieExpress

  async function nouvelleCommande() {
    const montee = await monterPage(`/tournees/${T118}/commandes/nouvelle`)
    return montee
  }

  async function chercherEtAjouter(page: VueWrapper, texte: string) {
    await page.get('#catalogue-recherche').setValue(texte)
    await page.get('#catalogue-recherche').trigger('keydown', { key: 'Enter' })
  }

  it('propose le numéro suivant et le code C5 dans la tournée', async () => {
    const { page } = await nouvelleCommande()
    expect((page.get('#commande-numero').element as HTMLInputElement).value).toMatch(
      /^CMD-\d{4}-\d{4}$/,
    )
    expect(page.get('h1').text()).toContain('C5')
    expect(page.get('h1').text()).toContain(s.codeDansTournee('T-2026-118'))
  })

  it('RG-21 : Entrée ajoute le premier résultat ; les articles archivés ne sont pas proposés', async () => {
    const depots = depotsDemarrage()
    const velux = (await depots.articles.lister()).find((a) => a.reference === 'VLX-GGL-MK04')
    await depots.articles.archiver(velux?.id ?? '')
    const { page } = await monterPage(`/tournees/${T118}/commandes/nouvelle`, depots)
    expect(page.get('.catalogue__liste').text()).not.toContain('Fenêtre de toit Velux 78 × 98')

    await chercherEtAjouter(page, 'pin 4')
    expect(page.findAll('tbody .ligne__nom').map((n) => n.text())).toEqual([
      'Botte de planches de pin 4 m',
    ])
  })

  it('RG-03 : trois dimensions propres proposent un poids estimé au prorata', async () => {
    const { page } = await nouvelleCommande()
    await chercherEtAjouter(page, 'POU-LC-2040')
    await page.get('#ligne-0-l').setValue('6000')
    await page.get('#ligne-0-w').setValue('200')
    await page.get('#ligne-0-h').setValue('400')
    await page.get('#ligne-0-h').trigger('change')

    expect((page.get('#ligne-0-poids').element as HTMLInputElement).value).toBe('219,8')
    expect(page.text()).toContain(s.estime)
    expect(page.text()).toContain(s.sourcePropre)
    expect(page.text()).toContain(textes.validation.commande.poidsEstime)

    // Le poids changé à la main n'est plus estimé.
    await page.get('#ligne-0-poids').setValue('225')
    expect(page.find('.poids__estime').exists()).toBe(false)

    // « Rétablir le catalogue » efface les valeurs propres.
    await page
      .findAll('button')
      .find((b) => b.text().startsWith(s.retablir))
      ?.trigger('click')
    expect((page.get('#ligne-0-l').element as HTMLInputElement).value).toBe('')
    expect(page.text()).toContain(s.sourceCatalogue(false))
  })

  it('RG-10 : avertit qu’un article ne rentre pas dans le camion de la tournée', async () => {
    const { page } = await nouvelleCommande()
    // La poutre du catalogue fait 8 m : plus que la caisse de 7,2 m.
    await chercherEtAjouter(page, 'POU-LC-2040')
    expect(page.text()).toContain(textes.validation.commande.horsCamion)
  })

  it('RG-21 : à l’enregistrement, résume les champs à corriger (capture 03e)', async () => {
    const { page, depots } = await nouvelleCommande()
    await page.get('#commande-numero').setValue('CMD-2026-0432')
    await chercherEtAjouter(page, 'pin 4')
    await page.get('#ligne-0-quantite').setValue('0')
    await page.get('#ligne-0-w').setValue('')
    await page.get('#ligne-0-l').setValue('4000')
    await page.get('form').trigger('submit')
    await flushPromises()

    const resume = page.get('[role="alert"]')
    expect(resume.text()).toContain('4 champs à corriger')
    expect(resume.text()).toContain(textes.validation.commande.dimsPropresIncompletes)
    expect(resume.text()).toContain(
      textes.validation.commande.numeroDoublon('C2', 'Chantier Les Ormeaux'),
    )
    expect(resume.text()).toContain(textes.validation.commande.destination)
    expect(resume.text()).toContain(
      s.champLigne(1, 'Botte de planches de pin 4 m', s.champs.quantite),
    )
    expect(await depots.commandes.listerParTournee(T118)).toHaveLength(4)
  })

  it('RG-03 : enregistre une nouvelle commande, livrée en dernier, sans toucher au catalogue', async () => {
    const { page, depots, routeur } = await nouvelleCommande()
    await page.get('#commande-destination').setValue('Chantier Les Pins')
    await chercherEtAjouter(page, 'pin 4')
    await page.get('#ligne-0-l').setValue('3000')
    await page.get('#ligne-0-w').setValue('1000')
    await page.get('#ligne-0-h').setValue('400')
    await page.get('#ligne-0-h').trigger('change')
    await page.get('form').trigger('submit')
    await vi.waitFor(() => expect(routeur.currentRoute.value.path).toBe(`/tournees/${T118}`))

    const commandes = await depots.commandes.listerParTournee(T118)
    const nouvelle = commandes.at(-1)
    expect(nouvelle?.commande).toMatchObject({ destination: 'Chantier Les Pins', rangLivraison: 5 })
    expect(nouvelle?.lignes[0]).toMatchObject({
      quantite: 1,
      dimsPropres: { l: 3000, w: 1000, h: 400 },
      poidsPropre: 600,
      poidsEstime: true,
    })
    const pin = (await depots.articles.lister()).find((a) => a.reference === 'PLA-PIN-4')
    expect(pin?.dimsEmballees).toEqual({ l: 4000, w: 1000, h: 400 })
  })

  it('modifier le client garde le plan ; une quantité changée met sa ligne à replacer', async () => {
    const depots = depotsDemarrage()
    const preparation = await monterPage(`/tournees/${T118}`, depots)
    await bouton(preparation.page, textes.preparation.lancer).trigger('click')
    await flushPromises()
    preparation.page.unmount()

    const { page, routeur } = await monterPage(`/tournees/${T118}/commandes/${C1}`, depots)
    expect(page.get('h1').text()).toContain(s.titreModification('C1'))
    await page.get('#commande-destination').setValue('Menuiserie Dubois et fils')
    await page.get('#ligne-0-quantite').setValue('3')
    await page.get('form').trigger('submit')
    await vi.waitFor(() => expect(routeur.currentRoute.value.path).toBe(`/tournees/${T118}`))
    await flushPromises()

    const plan = await depots.plans.obtenirDernier(T118)
    // Les 2 poutres de C1 ont perdu leur place ; les 10 autres articles la gardent.
    expect(plan?.placements).toHaveLength(10)
    expect(page.text()).toContain(s.aReplacer(1))
  })
})

// --- Liste d'attente -------------------------------------------------------------------

describe('Liste d’attente (capture 10)', () => {
  const a = textes.attente

  it('RG-11 : montre la commande reportée, son origine, son motif et son code d’origine', async () => {
    const { page } = await monterPage('/attente')
    const lignes = page.findAll('tbody tr')
    expect(lignes).toHaveLength(1)
    const texte = lignes[0]?.text() ?? ''
    expect(texte).toContain('Couverture Bernard')
    expect(texte).toContain('CMD-2026-0412')
    expect(texte).toContain('2 × Palette de tuiles mécaniques')
    expect(texte).toContain(a.commandeEntiere)
    expect(texte).toContain('T-2026-117')
    expect(texte).toContain(a.motifDepassement('Porteur 8,5 m'))
    expect(lignes[0]?.find('.code-commande').text()).toBe('C5')
  })

  it('RG-11 : affecte la commande à une tournée en préparation, livrée en dernier', async () => {
    const { page, depots } = await monterPage(`/attente?tournee=${T118}`)
    expect((page.get('select').element as HTMLSelectElement).value).toBe(T118)
    await page
      .findAll('button')
      .find((b) => b.text().startsWith(a.affecter))
      ?.trigger('click')
    await flushPromises()

    expect(await depots.attente.lister()).toEqual([])
    const commandes = await depots.commandes.listerParTournee(T118)
    expect(commandes.at(-1)?.commande).toMatchObject({
      destination: 'Couverture Bernard',
      rangLivraison: 5,
    })
    expect(page.text()).toContain(a.affecte('Couverture Bernard CMD-2026-0412', 'T-2026-118'))
    expect(page.text()).toContain(a.vide)
  })

  it('RG-22 : supprimer un élément demande confirmation', async () => {
    const { page, depots } = await monterPage('/attente')
    await boutonNomme(page, a.supprimer('Couverture Bernard CMD-2026-0412')).trigger('click')
    expect(document.querySelector('dialog[open]')?.textContent).toContain(
      a.supprimerCommandeConsequence,
    )
    await confirmer(a.supprimerAction)
    expect(await depots.attente.lister()).toEqual([])
    expect(await depots.commandes.listerSansTournee()).toEqual([])
  })

  it('filtre par motif', async () => {
    const { page } = await monterPage('/attente')
    const signalement = page
      .findAll('input[type="radio"]')
      .find((r) => (r.element as HTMLInputElement).value === 'signalement')
    await signalement?.setValue(true)
    expect(page.text()).toContain(a.videFiltre)
  })
})
