// Recette du prototype 1 (étape 11) : « un parcours complet est possible au
// clavier seul ». Aucun clic, aucun `fill` : uniquement Tab, les flèches,
// Espace, Entrée et la frappe de texte, comme une personne sans souris.
//
// Le parcours : créer une tournée, fixer la date et le camion, saisir deux
// commandes en cherchant les articles, lancer le calcul, puis lire le plan
// (sélectionner un article depuis le tableau des placements) et revenir aux
// tournées. axe-core passe à chaque écran traversé.
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

const NORMES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/**
 * Ordre des parties du champ date de Chromium. Il suit la langue du système
 * (jour, mois, année en français ; mois, jour, année ailleurs), pas l'option
 * `locale` de Playwright, et `--lang` n'agit que sous Windows : l'intégration
 * continue, sous Linux, attend donc mois, jour, année. On le sonde sur un
 * champ témoin, dans un onglet vierge à part : l'application n'est pas
 * touchée et la vraie date se tape ensuite au clavier, dans le bon ordre.
 */
async function ordreDuChampDate(page: Page): Promise<'jma' | 'mja'> {
  const sonde = await page.context().newPage()
  try {
    await sonde.setContent('<input type="date" aria-label="témoin">')
    await sonde.getByLabel('témoin').focus()
    await sonde.keyboard.type('20112026')
    return (await sonde.getByLabel('témoin').inputValue()) === '2026-11-20' ? 'jma' : 'mja'
  } finally {
    await sonde.close()
  }
}

/** Tape une date AAAA-MM-JJ dans le champ date qui a le focus, chiffre par chiffre. */
async function taperDate(page: Page, iso: string) {
  const [annee, mois, jour] = iso.split('-')
  const ordre = await ordreDuChampDate(page)
  await page.keyboard.type(ordre === 'jma' ? `${jour}${mois}${annee}` : `${mois}${jour}${annee}`)
}

/** axe-core, sans la taille de cible des blocs du plan (voir plan.spec.ts). */
async function sansErreurAxe(page: Page) {
  const resultat = await new AxeBuilder({ page })
    .withTags(NORMES)
    .exclude('.calque__bouton')
    .analyze()
  expect(resultat.violations).toEqual([])
}

/**
 * Appuie sur Tab jusqu'à ce que `cible` ait le focus. Échoue si elle n'est
 * pas atteinte en `max` appuis : l'élément ne serait pas joignable au clavier.
 */
async function tabulerJusqua(page: Page, cible: Locator, max = 80) {
  for (let i = 0; i < max; i++) {
    if (await cible.evaluate((el) => el === document.activeElement)) return
    await page.keyboard.press('Tab')
  }
  await expect(cible).toBeFocused()
}

/** Remplit la saisie express : destination, ville et articles cherchés au clavier. */
async function saisirCommande(
  page: Page,
  destination: string,
  ville: string,
  recherches: { texte: string; article: RegExp }[],
) {
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Saisie express')
  await tabulerJusqua(page, page.getByLabel('Client ou destination'))
  await page.keyboard.type(destination)
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Ville')).toBeFocused()
  await page.keyboard.type(ville)

  for (const { texte, article } of recherches) {
    await tabulerJusqua(page, page.getByLabel('Rechercher un article'))
    await page.keyboard.type(texte)
    await page.keyboard.press('Enter')
    await expect(page.getByRole('rowheader', { name: article })).toBeVisible()
  }
  await tabulerJusqua(page, page.getByRole('button', { name: 'Enregistrer la commande' }))
  await page.keyboard.press('Enter')
  await expect(page.getByText(`La commande ${destination} est enregistrée.`)).toBeVisible()
}

test('recette : parcours complet au clavier seul, de la tournée au plan', async ({ page }) => {
  await page.goto('/')
  await sansErreurAxe(page)

  // 1. Créer une tournée.
  await tabulerJusqua(page, page.getByRole('button', { name: 'Créer une tournée' }))
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Préparation de la tournée')

  // 2. Date et camion : la date se tape chiffre par chiffre, le camion se choisit aux flèches.
  const date = page.getByLabel(/Date de livraison/)
  await tabulerJusqua(page, date)
  await taperDate(page, '2026-11-20')
  // La sonde a ouvert puis fermé un onglet : on vérifie que le focus est resté.
  await expect(date).toBeFocused()
  await expect(page.getByLabel(/Date de livraison/)).toHaveValue('2026-11-20')
  await page.keyboard.press('Tab')
  const radios = page.getByRole('radiogroup').getByRole('radio')
  await tabulerJusqua(page, radios.first())
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('radio', { name: /Porteur 7,2 m/ })).toBeChecked()
  await sansErreurAxe(page)

  // 3. Deux commandes, en cherchant les articles.
  await tabulerJusqua(page, page.getByRole('link', { name: 'Saisir une commande' }))
  await page.keyboard.press('Enter')
  await saisirCommande(page, 'Chantier Les Pins', 'Rezé', [
    { texte: 'fenêtre pvc 2', article: /Fenêtre PVC 2 vantaux/ },
    { texte: 'carton de quinc', article: /Carton de quincaillerie/ },
  ])

  await tabulerJusqua(page, page.getByRole('link', { name: 'Saisir une commande' }))
  await page.keyboard.press('Enter')
  await saisirCommande(page, 'Maçonnerie Girard', 'Bouguenais', [
    { texte: 'parpaings', article: /Palette de parpaings/ },
    { texte: 'douglas', article: /Botte de planches de douglas/ },
  ])
  await expect(page.getByRole('link', { name: 'Chantier Les Pins' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Maçonnerie Girard' })).toBeVisible()
  await sansErreurAxe(page)

  // 4. Lancer le calcul.
  await tabulerJusqua(page, page.getByRole('button', { name: 'Lancer le calcul' }))
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Plan de chargement')
  await expect(page.getByText(/Plan version 1 calculé : 4 articles placés/)).toBeVisible()
  await sansErreurAxe(page)

  // 5. Lire le plan : sélectionner un article depuis le tableau des placements.
  const placement = page.getByRole('button', { name: /Palette de parpaings/ }).first()
  await tabulerJusqua(page, placement, 200)
  await page.keyboard.press('Enter')
  await expect(page.locator('section.selection')).toContainText('Palette de parpaings')
  await page.keyboard.press('Escape')

  // 6. Revenir à la liste des tournées.
  await page.keyboard.press('Shift+Tab')
  await tabulerJusqua(page, page.getByRole('link', { name: 'Tournées' }), 200)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('link', { name: /Vendredi 20 novembre 2026/ })).toBeVisible()
})

test('recette : la recherche de la saisie express montre le double anneau de focus', async ({
  page,
}) => {
  await page.goto('/tournees/b0000000-0000-4000-8000-000000000118/commandes/nouvelle')
  const recherche = page.getByLabel('Rechercher un article')
  await tabulerJusqua(page, recherche)
  // L'anneau entoure tout le cadre (icône comprise) ; le champ, lui, ne
  // dessine rien qui masquerait la bordure du cadre.
  const cadre = page.locator('.catalogue__recherche')
  await expect(cadre).toHaveCSS('outline-style', 'solid')
  await expect(cadre).toHaveCSS('outline-width', '2px')
  await expect(recherche).toHaveCSS('box-shadow', 'none')
})
