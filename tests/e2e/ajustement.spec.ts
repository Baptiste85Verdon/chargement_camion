// Ajustement du plan au clavier et sans glisser (étape P2-5 ; captures 04f et
// 04h ; cahier technique 5.3, 5.5, 5.7 et 5.18 ; RG-08, RG-09).
//
// Dépôts en mémoire : ils se vident au rechargement de la page. Le maintien
// d'un ajustement après rechargement est donc vérifié par un test de
// composant, qui recrée la page sur les mêmes données
// (tests/unitaires/PagePlanAjustement.test.ts).
import { expect, test } from '@playwright/test'
import { cadre, ouvrirPlan, sansErreurAxe } from './plan-aides'

test.describe('ajuster le plan au clavier (RG-08, RG-09)', () => {
  test('place choisie, déplacement refusé, annulation, sans erreur axe-core', async ({ page }) => {
    await ouvrirPlan(page)
    const statut = page.getByRole('status').filter({ hasText: 'enregistré' })

    // Aimantation coupée : les pas au clavier sont entiers (5.3).
    const aimantation = page.getByRole('switch', { name: 'Aimantation' })
    await expect(aimantation).toHaveAttribute('aria-checked', 'true')
    await aimantation.click()
    await expect(aimantation).toHaveAttribute('aria-checked', 'false')

    // « Choisir une place » : au plus 5 marques « + », le focus sur la première.
    await cadre(page, 'Vue de dessus').getByRole('button', { name: /^A10,/ }).click()
    await page.getByRole('button', { name: 'Choisir une place' }).click()
    const premiere = cadre(page, 'Vue de dessus').getByRole('button', { name: /^Place 1 sur / })
    await expect(premiere).toBeFocused()
    expect(
      await cadre(page, 'Vue de dessus').locator('.calque__place').count(),
    ).toBeLessThanOrEqual(5)
    await sansErreurAxe(page)

    // Entrée pose l'article : enregistré aussitôt, version « ajustée à la main ».
    await page.keyboard.press('Enter')
    await expect(statut).toContainText('A10 déplacé. Le plan est enregistré.')
    await expect(page.locator('.entete-page')).toContainText('ajustée à la main')
    // Le focus est resté sur l'article : les flèches le déplacent.
    await expect(page.locator('.calque__bouton:focus')).toHaveCount(1)

    // Maj + ↓, cinq fois : 2 500 mm vers la paroi gauche, hors de la caisse.
    for (let i = 0; i < 5; i++) await page.keyboard.press('Shift+ArrowDown')
    const enCours = page.locator('.bandeau-en-cours')
    await expect(enCours).toContainText('Position refusée, hors de la caisse')
    await sansErreurAxe(page)

    // Entrée : refusé (RG-09), l'article reprend sa place, le message est annoncé.
    await page.keyboard.press('Enter')
    const refus = page.locator('.bandeau-refus')
    await expect(refus).toContainText('Déplacement refusé : hors de la caisse')
    await expect(refus).toContainText('RG-06 · RG-09')
    await expect(page.getByRole('status').filter({ hasText: 'Déplacement refusé' })).toHaveCount(1)
    await sansErreurAxe(page)

    // Ctrl + Z annule la place choisie, et l'enregistre.
    await page.keyboard.press('Control+z')
    await expect(statut).toContainText('annulé. Le plan est enregistré.')
    await expect(
      page.getByRole('button', { name: 'Annuler le dernier déplacement' }),
    ).toBeDisabled()
  })

  test('retirer puis placer depuis la zone « Articles à placer » (5.7)', async ({ page }) => {
    await ouvrirPlan(page)
    await cadre(page, 'Vue de dessus').getByRole('button', { name: /^A10,/ }).click()
    await page.getByRole('button', { name: 'Retirer du plan' }).click()

    const zone = page.locator('section.zone')
    await expect(zone).toContainText('Carton de quincaillerie')
    await expect(zone).toContainText('retiré')
    await expect(zone).toBeFocused()
    await sansErreurAxe(page)

    await zone.getByRole('button', { name: /^Placer A\d+$/ }).click()
    await expect(zone).toContainText('Aucun article')
    await expect(page.getByRole('status').filter({ hasText: '1 article placé' })).toHaveCount(1)
  })
})
