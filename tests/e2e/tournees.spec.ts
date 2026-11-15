// Tournées, commandes et liste d'attente (étape 9). Dépôts en mémoire,
// remplis avec supabase/seed.sql : chaque test repart de la base d'exemple.
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const NORMES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const T118 = '/tournees/b0000000-0000-4000-8000-000000000118'

async function sansErreurAxe(page: Page) {
  const resultat = await new AxeBuilder({ page }).withTags(NORMES).analyze()
  expect(resultat.violations).toEqual([])
}

test.describe('accessibilité des tournées (axe-core)', () => {
  test('accueil', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Jeudi 5 novembre 2026' })).toBeVisible()
    await sansErreurAxe(page)
  })

  test('préparation d’une tournée', async ({ page }) => {
    await page.goto(T118)
    await expect(page.getByRole('link', { name: 'Menuiserie Dubois' })).toBeVisible()
    await sansErreurAxe(page)
  })

  test('préparation, avec les erreurs de saisie (capture 02e)', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Créer une tournée' }).click()
    await page.getByRole('button', { name: 'Lancer le calcul' }).click()
    await expect(page.getByRole('alert')).toBeFocused()
    await expect(page.getByRole('alert')).toContainText('3 champs à corriger')
    await sansErreurAxe(page)
  })

  test('saisie express, avec un poids estimé (capture 03b)', async ({ page }) => {
    await page.goto(`${T118}/commandes/d0000000-0000-4000-8000-000000000001`)
    await expect(page.getByText('Poids estimé au prorata du volume')).toBeVisible()
    await sansErreurAxe(page)
  })

  test('saisie express, avec les erreurs de saisie (capture 03e)', async ({ page }) => {
    await page.goto(`${T118}/commandes/nouvelle`)
    await page.getByRole('button', { name: 'Enregistrer la commande' }).click()
    await expect(page.getByRole('alert')).toBeFocused()
    await sansErreurAxe(page)
  })

  test('liste d’attente', async ({ page }) => {
    await page.goto('/attente')
    await expect(page.getByRole('rowheader', { name: /Couverture Bernard/ })).toBeVisible()
    await sansErreurAxe(page)
  })
})

test.describe('parcours de préparation', () => {
  test('saisir une commande au clavier, la livrer plus tôt, puis lancer le calcul', async ({
    page,
  }) => {
    await page.goto(T118)
    await page.getByRole('link', { name: 'Saisir une commande' }).click()

    await page.getByLabel('Client ou destination').fill('Chantier Les Pins')
    const recherche = page.getByLabel('Rechercher un article')
    await recherche.fill('carton de quinc')
    await recherche.press('Enter')
    await expect(page.getByRole('rowheader', { name: /Carton de quincaillerie/ })).toBeVisible()
    await page.getByRole('button', { name: 'Enregistrer la commande' }).click()

    await expect(page).toHaveURL(new RegExp(`${T118}$`))
    await expect(page.getByText('La commande Chantier Les Pins est enregistrée.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Chantier Les Pins' })).toBeVisible()

    await page.getByRole('button', { name: 'Livrer C5 plus tôt' }).click()
    await expect(page.getByText('Chantier Les Pins est maintenant livrée en 4e.')).toBeVisible()

    await page.getByRole('button', { name: 'Lancer le calcul' }).click()
    await expect(page).toHaveURL(new RegExp(`${T118}/plan$`))
    await expect(page.getByText(/Plan version 1 calculé : 13 articles placés/)).toBeVisible()
  })

  test('affecter la commande en attente à la tournée T-2026-118 (RG-11)', async ({ page }) => {
    await page.goto(T118)
    await page.getByRole('link', { name: /Ajouter depuis la liste d'attente/ }).click()
    await page.getByRole('button', { name: /Affecter Couverture Bernard/ }).click()
    await expect(page.getByText(/est affecté à la tournée T-2026-118/)).toBeVisible()
    await expect(page.getByRole('link', { name: /Liste d'attente/ })).not.toContainText('1')

    // Les données sont en mémoire : on revient par un lien, sans recharger la page.
    await page.getByRole('link', { name: 'Tournées' }).click()
    await page.getByRole('link', { name: 'Jeudi 5 novembre 2026' }).click()
    await expect(page.getByRole('link', { name: 'Couverture Bernard' })).toBeVisible()
  })
})
