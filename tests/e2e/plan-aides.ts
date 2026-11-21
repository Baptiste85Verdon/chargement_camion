// Aides des tests de bout en bout du plan : ouvrir le plan calculé de
// T-2026-118 (dépôts en mémoire, remplis avec supabase/seed.sql), trouver un
// cadre de vue, passer axe-core.
import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

const NORMES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
export const T118 = '/tournees/b0000000-0000-4000-8000-000000000118'

/**
 * axe-core sur toute la page. Une seule exception, limitée aux blocs du plan :
 * la taille de cible (WCAG 2.5.8). Un bloc a la taille de son article à
 * l'échelle (une poutre de 200 mm fait une vingtaine de pixels) : cette
 * présentation est essentielle, exception prévue par le critère. La même
 * sélection se fait aussi depuis le tableau des placements et l'ordre de
 * chargement, avec des boutons à la bonne taille. Partout ailleurs, la règle
 * s'applique.
 */
export async function sansErreurAxe(page: Page) {
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
export async function ouvrirPlan(page: Page) {
  await page.goto(T118)
  await page.getByRole('button', { name: 'Lancer le calcul' }).click()
  await expect(page).toHaveURL(new RegExp(`${T118}/plan$`))
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Plan de chargement')
}

export const cadre = (page: Page, titre: string) =>
  page.locator('section.cadre').filter({ has: page.getByRole('heading', { name: titre }) })
