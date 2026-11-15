// Plan de chargement en lecture (étape 10a). Dépôts en mémoire, remplis avec
// supabase/seed.sql : le plan de T-2026-118 est calculé au début de chaque test.
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const NORMES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const T118 = '/tournees/b0000000-0000-4000-8000-000000000118'

/**
 * axe-core sur toute la page. Une seule exception, limitée aux blocs du plan :
 * la taille de cible (WCAG 2.5.8). Un bloc a la taille de son article à
 * l'échelle (une poutre de 200 mm fait une vingtaine de pixels) : cette
 * présentation est essentielle, exception prévue par le critère. La même
 * sélection se fait aussi depuis le tableau des placements et l'ordre de
 * chargement, avec des boutons à la bonne taille. Partout ailleurs, la règle
 * s'applique.
 */
async function sansErreurAxe(page: Page) {
  const resultat = await new AxeBuilder({ page })
    .withTags(NORMES)
    .disableRules(['target-size'])
    .analyze()
  expect(resultat.violations).toEqual([])
  const cibles = await new AxeBuilder({ page })
    .withRules(['target-size'])
    .exclude('.calque__bouton')
    .analyze()
  expect(cibles.violations).toEqual([])
}

/** Calcule le plan depuis la préparation : la page du plan s'ouvre. */
async function ouvrirPlan(page: Page) {
  await page.goto(T118)
  await page.getByRole('button', { name: 'Lancer le calcul' }).click()
  await expect(page).toHaveURL(new RegExp(`${T118}/plan$`))
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Plan de chargement')
}

const cadre = (page: Page, titre: string) =>
  page.locator('section.cadre').filter({ has: page.getByRole('heading', { name: titre }) })

test.describe('accessibilité du plan (axe-core)', () => {
  test('plan complet, avec un article sélectionné (capture 04)', async ({ page }) => {
    await ouvrirPlan(page)
    await page.getByRole('button', { name: /^A03 / }).click()
    await expect(page.getByRole('button', { name: 'Désélectionner' })).toBeVisible()
    await sansErreurAxe(page)
  })

  test('vue par étape avec silhouettes (capture 04c)', async ({ page }) => {
    await ouvrirPlan(page)
    await page.getByText('Par étape', { exact: true }).click()
    await page.getByRole('button', { name: 'Suivant' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Étape 2 sur 12' })).toBeVisible()
    await sansErreurAxe(page)
  })

  test('filtre de profondeur, commande en évidence, liste des cachés (04d, 04e)', async ({
    page,
  }) => {
    await ouvrirPlan(page)
    const gauche = cadre(page, 'Côté gauche')
    await gauche.getByRole('slider', { name: 'À' }).fill('1000')
    await expect(gauche.getByText('Filtre de profondeur actif')).toBeVisible()
    const c2 = page.locator('.legende__bouton', { hasText: 'Chantier Les Ormeaux' })
    await c2.click()
    await expect(c2).toHaveAttribute('aria-pressed', 'true')
    const dessus = cadre(page, 'Vue de dessus')
    await dessus.getByRole('button', { name: 'Voir la liste' }).click()
    await sansErreurAxe(page)
  })
})

test.describe('parcours du plan', () => {
  test('les cinq vues montrent le plan, avec le fond et les portes indiqués', async ({ page }) => {
    await ouvrirPlan(page)
    const second = page.locator('section.cadre').nth(1)
    const attendus = {
      Droite: ['Fond (cabine)', 'Portes · entrée des articles'],
      Avant: ['Gauche', 'Droite', 'vu depuis le fond'],
      Arrière: ['Gauche', 'Droite', 'vu depuis les portes'],
      Gauche: ['Fond (cabine)', 'Portes · entrée des articles'],
    }
    for (const [vue, reperes] of Object.entries(attendus)) {
      await second.getByRole('radio', { name: vue, exact: true }).check({ force: true })
      for (const repere of reperes) {
        await expect(second.locator('.scene__reperes').getByText(repere)).toBeVisible()
      }
      expect(await second.locator('.calque__bouton').count()).toBeGreaterThan(0)
    }
  })

  test('au clavier : sélectionner un article, zoomer, déplacer la vue', async ({ page }) => {
    await ouvrirPlan(page)
    const dessus = cadre(page, 'Vue de dessus')
    const article = dessus.locator('.calque__bouton').first()
    await article.focus()
    await page.keyboard.press('Enter')
    await expect(article).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.detail')).toBeVisible()

    await dessus.getByRole('button', { name: 'Zoom +' }).click()
    await dessus.getByRole('button', { name: 'Zoom +' }).click()
    const dessin = dessus.locator('svg.scene__dessin')
    await expect(dessin).toHaveAttribute('viewBox', '1800 600 3600 1200')
    await dessus.getByRole('group', { name: /zoomée/ }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(dessin).toHaveAttribute('viewBox', '2160 600 3600 1200')
    await dessus.getByRole('button', { name: 'Ajuster' }).click()
    await expect(dessin).toHaveAttribute('viewBox', '0 0 7200 2400')
  })
})

test.describe('filtre de profondeur au clavier (5.10)', () => {
  test('chaque poignée a son nom et se règle aux flèches', async ({ page }) => {
    await ouvrirPlan(page)
    const gauche = cadre(page, 'Côté gauche')
    const de = gauche.getByRole('slider', { name: 'Profondeur, De' })
    const a = gauche.getByRole('slider', { name: 'Profondeur, À' })
    await expect(a).toHaveAttribute('aria-valuetext', /2\s400 mm de la paroi gauche/)

    await a.focus()
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowLeft')
    await de.focus()
    for (let i = 0; i < 2; i++) await page.keyboard.press('ArrowRight')
    await expect(gauche.locator('.filtre__valeur')).toHaveText(/200 à 2\s100 mm/)
    await expect(gauche.getByText('Filtre de profondeur actif')).toBeVisible()

    // Les poignées ne se croisent pas : il reste au moins 100 mm.
    await page.keyboard.press('End')
    await expect(de).toHaveAttribute('aria-valuetext', /2\s000 mm/)
  })
})

test.describe('zoom au pincement sur tablette (5.11)', () => {
  test.use({ hasTouch: true, viewport: { width: 1194, height: 834 } })

  test('écarter deux doigts zoome, les rapprocher dézoome', async ({ page, context }) => {
    await ouvrirPlan(page)
    const dessus = cadre(page, 'Vue de dessus')
    const toile = dessus.locator('.scene__toile')
    await toile.scrollIntoViewIfNeeded()
    const boite = await toile.boundingBox()
    if (!boite) throw new Error('Vue de dessus non affichée')
    const cx = boite.x + boite.width / 2
    const cy = boite.y + boite.height / 2
    // Playwright n'a pas de geste à deux doigts : on passe par le protocole de Chromium.
    const cdp = await context.newCDPSession(page)
    async function pincer(depart: number, arrivee: number) {
      const doigts = (d: number) => [
        { x: cx - d, y: cy, id: 1 },
        { x: cx + d, y: cy, id: 2 },
      ]
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: doigts(depart),
      })
      for (let i = 1; i <= 6; i++) {
        const d = depart + ((arrivee - depart) * i) / 6
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: doigts(d) })
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    }
    const zoom = dessus.locator('.cadre__zoom-valeur')
    await pincer(40, 120)
    await expect(zoom).toHaveText(/300\s?%/)
    await pincer(120, 60)
    await expect(zoom).toHaveText(/150\s?%/)
    // La page elle-même ne zoome pas : seul le plan change d'échelle.
    expect(await page.evaluate(() => window.visualViewport?.scale)).toBe(1)
  })
})
