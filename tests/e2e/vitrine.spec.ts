import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const NORMES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function ouvrirVitrine(page: Page) {
  await page.goto('/vitrine')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Vitrine des composants' }),
  ).toBeVisible()
}

test.describe('vitrine des composants', () => {
  test("n'a aucune erreur d'accessibilité détectable (axe-core)", async ({ page }) => {
    await ouvrirVitrine(page)
    const resultat = await new AxeBuilder({ page }).withTags(NORMES).analyze()
    expect(resultat.violations).toEqual([])
  })

  test('les couleurs viennent des jetons : bouton principal en encre, jamais en bleu', async ({
    page,
  }) => {
    await ouvrirVitrine(page)
    const principal = page.getByRole('button', { name: 'Passer en mode quai' })
    await expect(principal).toHaveCSS('background-color', 'rgb(27, 31, 36)')
    await expect(principal).toHaveCSS('color', 'rgb(255, 255, 255)')
  })

  test('le sélecteur de vues se parcourt aux flèches et saute la vue indisponible', async ({
    page,
  }) => {
    await ouvrirVitrine(page)
    const groupe = page.getByRole('group', { name: 'Vue affichée' })
    await groupe.getByRole('radio', { name: 'Dessus' }).focus()
    await page.keyboard.press('ArrowRight')
    // « Gauche » est affichée dans l'autre cadre : le navigateur passe directement à « Droite ».
    await expect(groupe.getByRole('radio', { name: 'Droite' })).toBeChecked()
    await expect(groupe.getByRole('radio', { name: 'Droite' })).toBeFocused()
  })

  test("l'interrupteur se bascule au clavier", async ({ page }) => {
    await ouvrirVitrine(page)
    const interrupteur = page.getByRole('switch', { name: 'Aimantation', exact: true })
    await expect(interrupteur).toHaveAttribute('aria-checked', 'true')
    await interrupteur.focus()
    await page.keyboard.press('Space')
    await expect(interrupteur).toHaveAttribute('aria-checked', 'false')
  })

  test('RG-21 : à l’enregistrement, le résumé reçoit le focus et ses liens mènent aux champs', async ({
    page,
  }) => {
    await ouvrirVitrine(page)
    await page.getByRole('button', { name: 'Enregistrer' }).click()

    const resume = page.getByRole('alert')
    await expect(resume).toBeFocused()
    await expect(resume).toContainText('2 champs à corriger')

    await resume.getByRole('link', { name: /^Longueur/ }).click()
    const longueur = page.getByRole('textbox', { name: /^Longueur/ })
    await expect(longueur).toBeFocused()
    await expect(longueur).toHaveAttribute('aria-invalid', 'true')
    await expect(longueur).toHaveCSS('border-top-width', '2px')
  })

  test('RG-22 : la fenêtre s’ouvre sur « Annuler », Échap la ferme et rend le focus', async ({
    page,
  }) => {
    await ouvrirVitrine(page)
    const ouvrir = page.getByRole('button', { name: 'Supprimer', exact: true })
    await ouvrir.click()

    const fenetre = page.getByRole('dialog', { name: 'Supprimer « Poutre lamellé-collé » ?' })
    await expect(fenetre).toBeVisible()
    await expect(fenetre.getByRole('button', { name: 'Annuler' })).toBeFocused()
    await expect(fenetre.getByRole('button', { name: 'Supprimer l’article' })).toHaveCSS(
      'background-color',
      'rgb(180, 35, 24)',
    )

    // Le reste de la page est inerte : axe-core ne voit plus que la fenêtre.
    const resultat = await new AxeBuilder({ page }).withTags(NORMES).analyze()
    expect(resultat.violations).toEqual([])

    await page.keyboard.press('Escape')
    await expect(fenetre).toBeHidden()
    await expect(ouvrir).toBeFocused()
    await expect(page.getByText('Action annulée.')).toBeVisible()
  })

  test('RG-22 : le focus reste piégé dans la fenêtre et l’action de ton neutre est en encre', async ({
    page,
  }) => {
    await ouvrirVitrine(page)
    await page.getByRole('button', { name: 'Archiver', exact: true }).click()

    const fenetre = page.getByRole('dialog', { name: /^Archiver/ })
    const action = fenetre.getByRole('button', { name: 'Archiver l’article' })
    await expect(action).toHaveCSS('background-color', 'rgb(27, 31, 36)')

    // Annuler → Maj+Tab revient sur l'action, sans sortir de la fenêtre.
    await page.keyboard.press('Shift+Tab')
    await expect(action).toBeFocused()
    await action.click()
    await expect(fenetre).toBeHidden()
    await expect(page.getByText('Action confirmée : Archiver l’article.')).toBeVisible()
  })
})
