import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe("page d'accueil", () => {
  test('affiche le titre en IBM Plex Sans, couleur encre sur fond-page', async ({ page }) => {
    await page.goto('/')

    const titre = page.getByRole('heading', { level: 1, name: 'Tournées' })
    await expect(titre).toBeVisible()

    // Les couleurs viennent des jetons : encre #1B1F24, fond-page #F4F5F7.
    await expect(titre).toHaveCSS('color', 'rgb(27, 31, 36)')
    await expect(titre).toHaveCSS('font-size', '24px')
    await expect(titre).toHaveCSS('font-weight', '700')
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(244, 245, 247)')

    // La police est bien chargée depuis l'application, pas remplacée par la police de secours.
    await expect(titre).toHaveCSS('font-family', /^"IBM Plex Sans"/)
    const policeChargee = await page.evaluate(async () => {
      await document.fonts.ready
      return document.fonts.check('700 24px "IBM Plex Sans"')
    })
    expect(policeChargee).toBe(true)
  })

  test("n'a aucune erreur d'accessibilité détectable (axe-core)", async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    const resultat = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(resultat.violations).toEqual([])
  })
})
