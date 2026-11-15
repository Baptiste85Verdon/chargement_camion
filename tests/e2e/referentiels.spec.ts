// Référentiels (étape 8) : catalogue, fiche article, modèles de camions et
// fiche camion. L'application tourne avec les dépôts en mémoire, remplis
// avec supabase/seed.sql (playwright.config.ts) : chaque test repart de la
// base d'exemple, sans jamais toucher la vraie base.
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const NORMES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function sansErreurAxe(page: Page) {
  const resultat = await new AxeBuilder({ page }).withTags(NORMES).analyze()
  expect(resultat.violations).toEqual([])
}

test.describe('accessibilité des référentiels (axe-core)', () => {
  test('catalogue, avec la liste des archivés ouverte', async ({ page }) => {
    await page.goto('/catalogue')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Catalogue des articles' }),
    ).toBeVisible()
    await page.getByRole('button', { name: /Afficher les articles archivés/ }).click()
    await sansErreurAxe(page)
  })

  test('fiche article, avec les erreurs de saisie (capture 08e)', async ({ page }) => {
    await page.goto('/catalogue/nouveau')
    await page.getByRole('button', { name: 'Enregistrer l’article' }).click()
    await expect(page.getByRole('alert')).toBeFocused()
    await sansErreurAxe(page)
  })

  test('fiche article existante', async ({ page }) => {
    await page.goto('/catalogue')
    await page.getByRole('link', { name: 'Fenêtre cintrée PVC 120 × 140' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Fenêtre cintrée')
    await sansErreurAxe(page)
  })

  test('modèles de camions', async ({ page }) => {
    await page.goto('/camions')
    await expect(page.getByRole('heading', { level: 1, name: 'Modèles de camions' })).toBeVisible()
    await sansErreurAxe(page)
  })

  test('fiche camion, avec les erreurs de saisie (capture 09e)', async ({ page }) => {
    await page.goto('/camions/nouveau')
    await page.getByRole('button', { name: 'Enregistrer le modèle' }).click()
    await expect(page.getByRole('alert')).toBeFocused()
    await sansErreurAxe(page)
  })
})

test.describe('parcours des référentiels', () => {
  test('RG-21 : un article incomplet est refusé, puis enregistré une fois corrigé', async ({
    page,
  }) => {
    await page.goto('/catalogue')
    await page.getByRole('link', { name: 'Créer un article' }).click()
    await page.getByLabel('Nom (obligatoire)').fill('Carton de vis inox')
    await page.getByRole('button', { name: 'Enregistrer l’article' }).click()

    const resume = page.getByRole('alert')
    await expect(resume).toBeFocused()
    await expect(resume).toContainText('4 champs à corriger')

    // Le lien du résumé amène au champ à corriger.
    await resume.getByRole('link', { name: /^Famille/ }).click()
    await expect(page.getByLabel('Famille (obligatoire)')).toBeFocused()
    await page.getByLabel('Famille (obligatoire)').selectOption('Quincaillerie')
    // CF 4.6 : l'orientation « à plat » est proposée pour la quincaillerie.
    await expect(page.getByRole('checkbox', { name: 'À plat' })).toBeChecked()

    await page.getByLabel('Longueur, en millimètres').first().fill('400')
    await page.getByLabel('Largeur, en millimètres').first().fill('300')
    await page.getByLabel('Hauteur, en millimètres').first().fill('200')
    await page.getByLabel('Poids emballé (obligatoire)').fill('8,5')
    await page.getByRole('button', { name: 'Enregistrer l’article' }).click()

    await expect(page.getByRole('status').first()).toContainText(
      '« Carton de vis inox » est enregistré.',
    )
    await page.getByRole('link', { name: 'Catalogue', exact: true }).first().click()
    await expect(page.getByText('25 articles sur 25')).toBeVisible()
  })

  test('RG-22 : la suppression d’un article inutilisé est annulée, puis confirmée', async ({
    page,
  }) => {
    await page.goto('/catalogue')
    await page.getByRole('link', { name: 'Boîte de vis à plaque 3,5 × 35' }).click()
    await page.getByRole('button', { name: 'Supprimer l’article' }).click()

    const fenetre = page.getByRole('dialog', {
      name: 'Supprimer « Boîte de vis à plaque 3,5 × 35 » ?',
    })
    await expect(fenetre).toBeVisible()
    // Le focus va d'abord sur « Annuler » ; Échap ferme sans rien faire.
    await expect(fenetre.getByRole('button', { name: 'Annuler' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(fenetre).toBeHidden()

    await page.getByRole('button', { name: 'Supprimer l’article' }).click()
    await fenetre.getByRole('button', { name: 'Supprimer l’article' }).click()
    await expect(page).toHaveURL(/\/catalogue$/)
    await expect(page.getByText('23 articles sur 23')).toBeVisible()
  })

  test('RG-22 : un article utilisé s’archive, puis se réactive depuis la liste des archivés', async ({
    page,
  }) => {
    await page.goto('/catalogue')
    await page.getByRole('link', { name: 'Paquet de plaques BA13 250 × 120' }).click()
    await page.getByRole('button', { name: 'Supprimer l’article' }).click()
    const fenetre = page.getByRole('dialog')
    await expect(fenetre).toContainText('Cet article est utilisé dans 1 commande')
    await fenetre.getByRole('button', { name: 'Archiver l’article' }).click()

    await expect(page).toHaveURL(/\/catalogue$/)
    await expect(page.getByText('23 articles sur 24')).toBeHidden()
    await expect(page.getByText('23 articles sur 23')).toBeVisible()
    await page.getByRole('button', { name: 'Afficher les articles archivés (1)' }).click()
    await page.getByRole('button', { name: /Réactiver/ }).click()
    await expect(page.getByText('24 articles sur 24')).toBeVisible()
  })

  test('un clic n’importe où sur la ligne ouvre la fiche ; « Réactiver » reste cliquable seul', async ({
    page,
  }) => {
    await page.goto('/camions')
    // Clic au milieu de la cellule des dimensions, pas sur le nom : le lien
    // étiré recouvre la cellule (Playwright refuse d'ailleurs de cliquer la
    // cellule elle-même, puisque c'est le lien qui reçoit le clic).
    const cellule = page
      .getByRole('row', { name: /Porteur 6,2 m/ })
      .getByRole('cell')
      .nth(1)
    const boite = await cellule.boundingBox()
    if (!boite) throw new Error('Cellule introuvable')
    await page.mouse.click(boite.x + boite.width / 2, boite.y + boite.height / 2)
    await expect(page.getByRole('heading', { level: 1, name: 'Porteur 6,2 m' })).toBeVisible()

    await page.goto('/catalogue')
    await page.getByRole('link', { name: 'Carton de quincaillerie' }).click()
    await page.getByRole('button', { name: 'Archiver l’article' }).click()
    await expect(page).toHaveURL(/\/catalogue$/)
    await page.getByRole('button', { name: 'Afficher les articles archivés (1)' }).click()
    await page.getByRole('button', { name: /Réactiver/ }).click()
    // Le bouton a réactivé l'article sans ouvrir sa fiche.
    await expect(page).toHaveURL(/\/catalogue$/)
    await expect(page.getByText('24 articles sur 24')).toBeVisible()
  })

  test('RG-21 : le camion d’une tournée en préparation ne se supprime pas', async ({ page }) => {
    await page.goto('/camions')
    await page.getByRole('link', { name: 'Porteur 7,2 m' }).click()
    await page.getByRole('button', { name: 'Supprimer le modèle' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page.getByRole('status').first()).toContainText('T-2026-118')
  })

  test('RG-22 : quitter une fiche modifiée demande confirmation', async ({ page }) => {
    await page.goto('/camions')
    await page.getByRole('link', { name: 'Fourgon 20 m³' }).click()
    await page.getByLabel('Hauteur utile (obligatoire)').fill('2300')
    await page.getByRole('link', { name: 'Catalogue', exact: true }).first().click()

    const fenetre = page.getByRole('dialog', { name: 'Quitter sans enregistrer ?' })
    await expect(fenetre).toBeVisible()
    await fenetre.getByRole('button', { name: 'Annuler' }).click()
    await expect(page).toHaveURL(/\/camions\//)

    await page.getByRole('link', { name: 'Catalogue', exact: true }).first().click()
    await fenetre.getByRole('button', { name: 'Quitter sans enregistrer' }).click()
    await expect(page).toHaveURL(/\/catalogue$/)
  })
})
