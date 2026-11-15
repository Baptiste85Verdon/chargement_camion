// Plan de chargement en lecture (captures 04, 04c, 04d, 04e ; CF 4.4 ;
// cahier technique 5.1, 5.8 à 5.12, 5.14). Base d'exemple : la tournée
// T-2026-118 et ses 12 articles, calculés avant d'ouvrir la page.
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { composerVue } from '@/domaine/contenu-vue'
import { lirePlan, calculerPlan } from '@/domaine/tournee'
import type { Depots } from '@/donnees/depots'
import { textes } from '@/textes/fr'
import { depotsDemarrage, monterPage } from './monter-page'

const T118 = 'b0000000-0000-4000-8000-000000000118'
const t = textes.plan

/** Dépôts de démarrage, avec un plan calculé pour T-2026-118. */
async function depotsAvecPlan(): Promise<Depots> {
  const depots = depotsDemarrage()
  const [tournee, articles, commandes] = await Promise.all([
    depots.tournees.obtenir(T118),
    depots.articles.lister({ avecArchives: true }),
    depots.commandes.listerParTournee(T118),
  ])
  const camion = await depots.camions.obtenir(tournee?.modeleCamionId ?? '')
  if (!camion) throw new Error('Camion de T-2026-118 introuvable')
  const { placements } = calculerPlan(commandes, articles, camion)
  await depots.plans.enregistrerVersion(T118, placements)
  return depots
}

async function ouvrir() {
  const depots = await depotsAvecPlan()
  return { ...(await monterPage(`/tournees/${T118}/plan`, depots)), depots }
}

const cadres = (page: VueWrapper) => page.findAll('section.cadre')

/** Texte lisible, espaces fines insécables (« 7 200 ») ramenées à des espaces simples. */
const texte = (w: { text(): string } | undefined) => (w?.text() ?? '').replace(/\s/g, ' ')

function bouton(page: VueWrapper, texte: string) {
  const trouve = page.findAll('button').find((b) => b.text() === texte)
  if (!trouve) throw new Error(`Bouton « ${texte} » introuvable`)
  return trouve
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Plan de chargement : la page', () => {
  it('résume le camion, les commandes et les articles placés', async () => {
    const { page } = await ouvrir()
    expect(page.get('h1').text()).toContain(t.titre)
    expect(texte(page)).toContain('Porteur 7,2 m · caisse 7 200 × 2 400 × 2 500 mm')
    expect(texte(page)).toContain('4 commandes · 12 articles placés')
  })

  it('dit qu’aucun plan n’est calculé, et renvoie à la préparation', async () => {
    const { page } = await monterPage(`/tournees/${T118}/plan`)
    expect(page.text()).toContain(t.aucunPlan)
    expect(page.find(`a[href="/tournees/${T118}"]`).exists()).toBe(true)
  })

  it('liste les placements dans l’ordre de chargement, de A01 à A12', async () => {
    const { page } = await ouvrir()
    const reperes = page.findAll('.placements tbody tr').map((l) => l.find('.placements__repere'))
    expect(reperes.map((r) => r.text())).toEqual(
      Array.from({ length: 12 }, (_, i) => `A${String(i + 1).padStart(2, '0')}`),
    )
    expect(page.findAll('.ordre li')).toHaveLength(12)
  })
})

describe('Plan de chargement : cadres de vue (5.8)', () => {
  it('affiche Dessus et Côté gauche par défaut, chacun avec son sélecteur', async () => {
    const { page } = await ouvrir()
    const [premier, second] = cadres(page)
    expect(premier?.find('h2').text()).toBe(t.titresVues.dessus)
    expect(second?.find('h2').text()).toBe(t.titresVues.gauche)
  })

  it('rend indisponible, dans un cadre, la vue déjà affichée dans l’autre', async () => {
    const { page } = await ouvrir()
    const [premier, second] = cadres(page)
    const radio = (cadre: typeof premier, vue: string) =>
      cadre?.find(`input[type="radio"][value="${vue}"]`).element as HTMLInputElement
    expect(radio(premier, 'gauche').disabled).toBe(true)
    expect(radio(second, 'dessus').disabled).toBe(true)
    expect(premier?.text()).toContain(t.dejaAffichee(t.vues.gauche))

    await second?.find('input[value="arriere"]').setValue(true)
    expect(second?.find('h2').text()).toBe(t.titresVues.arriere)
    expect(radio(premier, 'gauche').disabled).toBe(false)
    expect(radio(premier, 'arriere').disabled).toBe(true)
  })

  it('indique toujours le fond et les portes', async () => {
    const { page } = await ouvrir()
    const [premier, second] = cadres(page)
    for (const cadre of [premier, second]) {
      expect(cadre?.text()).toContain(t.reperes.fond)
      expect(cadre?.text()).toContain(t.reperes.portes)
    }
    // Vue arrière : ni le fond ni les portes sur un bord, le sens est rappelé.
    await second?.find('input[value="arriere"]').setValue(true)
    expect(second?.text()).toContain(t.reperes.depuisPortes)
    expect(second?.text()).toContain(t.reperes.gauche)
    expect(
      second?.find('svg[role="img"][aria-label^="Point de vue"]').attributes('aria-label'),
    ).toBe(t.pictogramme.arriere)
  })

  it('donne un nom accessible à chaque article visible', async () => {
    const { page } = await ouvrir()
    const noms = cadres(page)[0]
      ?.findAll('.calque__bouton')
      .map((b) => b.attributes('aria-label'))
    expect(noms?.length).toBeGreaterThan(0)
    // Repère, article, commande, orientation, position dans la caisse, appui, étape.
    const forme =
      /^A\d\d, .+, commande C\d .+, (à plat|debout|contre une paroi), (au fond|au milieu|près des portes) (à gauche|dans l'axe|à droite), (au plancher|sur A\d\d(, A\d\d)*), étape \d+$/
    expect(noms?.every((n) => forme.test(n ?? ''))).toBe(true)
  })

  it('6 : le nom d’un article dit sa pose, sa place dans la caisse et ce qui le porte', async () => {
    const { page } = await ouvrir()
    // A07, plaques de plâtre de C3 : de 1 200 à 3 700 mm du fond, de 1 200 à
    // 2 400 mm de la paroi gauche, posées à 1 050 mm sur A06.
    const nom = cadres(page)[0]
      ?.findAll('.calque__bouton')
      .map((b) => texte({ text: () => b.attributes('aria-label') ?? '' }))
      .find((n) => n.startsWith('A07,'))
    expect(nom).toBe(
      'A07, Paquet de plaques BA13 250 × 120, commande C3 SCI Martin, à plat, au milieu à droite, sur A06, étape 7',
    )
  })

  it('cote la caisse : longueur et largeur en vue de dessus', async () => {
    const { page } = await ouvrir()
    const premier = cadres(page)[0]
    expect(texte(premier)).toContain('7 200 mm')
    expect(texte(premier)).toContain('2 400 mm')
  })
})

describe('Plan de chargement : articles cachés et filtre de profondeur (5.10)', () => {
  it('signale les articles cachés de chaque vue, d’après projeterPlan', async () => {
    const { page, depots } = await ouvrir()
    const [articles, commandes, plan, tournee] = await Promise.all([
      depots.articles.lister({ avecArchives: true }),
      depots.commandes.listerParTournee(T118),
      depots.plans.obtenirDernier(T118),
      depots.tournees.obtenir(T118),
    ])
    const camion = await depots.camions.obtenir(tournee?.modeleCamionId ?? '')
    if (!camion || !plan) throw new Error('données')
    const { placements, unites } = lirePlan(commandes, articles, plan.placements)
    const attendus = composerVue(placements, unites, camion, 'gauche').caches.length
    const second = cadres(page)[1]
    if (attendus === 0) {
      expect(second?.find('.cadre__caches').exists()).toBe(false)
    } else {
      expect(second?.text()).toContain(t.caches(attendus))
      await bouton(page, t.voirCaches).trigger('click')
      expect(second?.findAll('.cadre__cache')).toHaveLength(attendus)
    }
  })

  it('montre un bandeau tant qu’un filtre est actif, et « Tout afficher » le retire', async () => {
    const { page } = await ouvrir()
    const second = cadres(page)[1]
    const fin = second?.findAll('.filtre input')[1]
    await fin?.setValue('1000')
    expect(second?.text()).toContain(t.filtreActif)
    expect(texte(second)).toContain('de 0 à 1 000 mm de la paroi gauche')
    expect(second?.find('.scene__contour--filtre').exists()).toBe(true)

    await second
      ?.findAll('button')
      .find((b) => b.text() === t.toutAfficher)
      ?.trigger('click')
    expect(second?.text()).not.toContain(t.filtreActif)
  })
})

describe('Plan de chargement : zoom (5.11)', () => {
  it('Zoom + réduit le viewBox, Ajuster revient à la caisse entière', async () => {
    const { page } = await ouvrir()
    const premier = cadres(page)[0]
    const viewBox = () => premier?.find('svg.scene__dessin').attributes('viewBox')
    expect(viewBox()).toBe('0 0 7200 2400')

    await premier?.find(`button[aria-label="${t.zoomPlus}"]`).trigger('click')
    expect(viewBox()).toBe('1200 400 4800 1600')
    expect(premier?.find('.cadre__zoom-valeur').text()).toMatch(/150\s?%/)

    await premier
      ?.findAll('button')
      .find((b) => b.text() === t.ajuster)
      ?.trigger('click')
    expect(viewBox()).toBe('0 0 7200 2400')
  })
})

describe('Plan de chargement : sélection et mise en évidence (5.1, 5.12)', () => {
  it('sélectionner un article dans le tableau le met en évidence dans les deux vues', async () => {
    const { page } = await ouvrir()
    await page.findAll('.placements__article')[0]?.trigger('click')
    expect(page.text()).toContain(t.selection)
    expect(page.find('.detail').text()).toContain(t.etapeSur(1, 12))
    for (const cadre of cadres(page)) {
      const choisi = cadre.findAll('.calque__bouton[aria-pressed="true"]')
      // Visible dans la vue : son bouton est pressé et l'anneau est posé.
      if (choisi.length) expect(cadre.find('.calque__selection').exists()).toBe(true)
    }
    await bouton(page, t.deselectionner).trigger('click')
    expect(page.text()).toContain(t.selectionVide)
  })

  it('un clic sur une commande de la légende grise les autres, un second clic les rétablit', async () => {
    const { page } = await ouvrir()
    const legende = page.findAll('.legende__bouton')
    await legende[1]?.trigger('click')
    expect(legende[1]?.attributes('aria-pressed')).toBe('true')
    expect(page.findAll('.bloc--attenue').length).toBeGreaterThan(0)
    // Aucun article de C2 n'est atténué.
    expect(page.findAll('.code-commande--attenue').every((c) => c.text() !== 'C2')).toBe(true)

    await legende[1]?.trigger('click')
    expect(legende[1]?.attributes('aria-pressed')).toBe('false')
    expect(page.findAll('.bloc--attenue')).toHaveLength(0)
  })
})

describe('Plan de chargement : vue par étape (5.9)', () => {
  async function parEtape() {
    const ouvert = await ouvrir()
    await ouvert.page.find('input[type="radio"][value="etape"]').setValue(true)
    return ouvert
  }

  it('avance d’une étape et décrit l’article à charger', async () => {
    const { page } = await parEtape()
    expect(page.text()).toContain(t.etapeSur(1, 12))
    await bouton(page, t.suivant).trigger('click')
    const description = page.find('[role="status"] .bandeau').text()
    expect(description).toContain(t.etapeSur(2, 12))
    expect(description).toMatch(/du fond/)
    expect(page.find('.ordre__bouton[aria-current="step"] .ordre__rang').text()).toBe('02')
  })

  it('à l’étape 0, le camion est vide', async () => {
    const { page } = await parEtape()
    await bouton(page, t.precedent).trigger('click')
    expect(page.text()).toContain(t.etapeVide(12))
    expect(cadres(page)[0]?.findAll('.bloc:not(.bloc--silhouette)')).toHaveLength(0)
  })

  it('montre les étapes suivantes en silhouette, ou les masque, au choix mémorisé', async () => {
    const { page } = await parEtape()
    const premier = () => cadres(page)[0]
    // Étape 1 : 1 article chargé, 11 silhouettes.
    expect(premier()?.findAll('.bloc--silhouette')).toHaveLength(11)
    expect(premier()?.find('.bloc--en-cours').exists()).toBe(true)

    await page.find('input[type="checkbox"]').setValue(false)
    expect(premier()?.findAll('.bloc--silhouette')).toHaveLength(0)
    expect(localStorage.getItem('plan-de-chargement.silhouettes')).toBe('non')
  })

  it('annonce les silhouettes « pas encore chargé »', async () => {
    const { page } = await parEtape()
    const noms = page.findAll('.calque__bouton').map((b) => b.attributes('aria-label') ?? '')
    expect(noms.some((n) => n.endsWith(t.pasEncoreCharge))).toBe(true)
    expect(noms.some((n) => n.endsWith(t.enCours))).toBe(true)
  })

  it('un article de l’ordre de chargement mène à son étape', async () => {
    const { page } = await parEtape()
    await page.findAll('.ordre__bouton')[4]?.trigger('click')
    await flushPromises()
    expect(page.text()).toContain(t.etapeSur(5, 12))
  })
})
