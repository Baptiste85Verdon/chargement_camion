// Recette du prototype 1 (étape 11) : « Chaque formulaire applique RG-21, et
// chaque suppression passe par une confirmation (RG-22). »
//
// Les règles de chaque formulaire sont testées dans `validation.test.ts`, les
// confirmations dans les tests de chaque page. L'audit de la recette a trouvé
// deux formulaires dont la sortie n'était pas testée : la saisie express et la
// fiche camion. Ce fichier les complète.
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Router } from 'vue-router'
import { textes } from '@/textes/fr'
import { monterPage } from './monter-page'

const T118 = '/tournees/b0000000-0000-4000-8000-000000000118'
const C1 = `${T118}/commandes/d0000000-0000-4000-8000-000000000001`
const FOURGON = '/camions/c0000000-0000-4000-8000-000000000004'

afterEach(() => {
  document.body.innerHTML = ''
})

const fenetreOuverte = () => document.querySelector('dialog[open]')

function boutonDeLaFenetre(texte: string) {
  const trouve = [...(fenetreOuverte()?.querySelectorAll('button') ?? [])].find(
    (b) => b.textContent?.trim() === texte,
  )
  if (!trouve) throw new Error(`Bouton « ${texte} » absent de la fenêtre`)
  return trouve
}

const etat = (page: VueWrapper) => page.get('.enregistrer__etat').text()

/** Tente de quitter vers `vers` : la fenêtre s'ouvre et la page reste en place. */
async function tenterDeQuitter(routeur: Router, vers: string) {
  const depart = routeur.currentRoute.value.path
  await routeur.push(vers)
  await flushPromises()
  expect(routeur.currentRoute.value.path).toBe(depart)
  expect(fenetreOuverte()?.textContent).toContain(textes.referentiels.quitterTitre)
}

describe('recette : saisie express', () => {
  it('RG-21 : annonce les modifications non enregistrées, puis plus après enregistrement', async () => {
    const { page } = await monterPage(C1)
    expect(etat(page)).toBe('')
    await page.get('#commande-ville').setValue('Saint-Herblain')
    expect(etat(page)).toBe(textes.composants.modificationsNonEnregistrees)
  })

  it('RG-22 : quitter une commande modifiée demande confirmation ; « Annuler » reste sur la page', async () => {
    const { page, routeur } = await monterPage(C1)
    await page.get('#commande-destination').setValue('Menuiserie Dubois et fils')
    await tenterDeQuitter(routeur, T118)

    boutonDeLaFenetre('Annuler').click()
    await flushPromises()
    expect(fenetreOuverte()).toBeNull()
    expect(routeur.currentRoute.value.path).toBe(C1)
    expect((page.get('#commande-destination').element as HTMLInputElement).value).toBe(
      'Menuiserie Dubois et fils',
    )
  })

  it('RG-22 : « Quitter sans enregistrer » quitte et ne change pas la commande', async () => {
    const { page, routeur, depots } = await monterPage(C1)
    await page.get('#commande-destination').setValue('Menuiserie Dubois et fils')
    await tenterDeQuitter(routeur, T118)

    boutonDeLaFenetre(textes.referentiels.quitterAction).click()
    await vi.waitFor(() => expect(routeur.currentRoute.value.path).toBe(T118))
    const commande = await depots.commandes.obtenir('d0000000-0000-4000-8000-000000000001')
    expect(commande?.commande.destination).toBe('Menuiserie Dubois')
  })

  it('RG-22 : une commande enregistrée se quitte sans confirmation', async () => {
    const { page, routeur } = await monterPage(C1)
    await page.get('#commande-ville').setValue('Saint-Herblain')
    await page.get('form').trigger('submit')
    await flushPromises()
    await vi.waitFor(() => expect(routeur.currentRoute.value.path).toBe(T118))
    expect(fenetreOuverte()).toBeNull()
  })
})

describe('recette : recherche de la saisie express', () => {
  it('après Entrée, la recherche se vide et garde le focus, prête pour l’article suivant', async () => {
    const { page } = await monterPage(`${T118}/commandes/nouvelle`)
    const recherche = page.get('#catalogue-recherche')
    ;(recherche.element as HTMLInputElement).focus()
    await recherche.setValue('carton de quinc')
    await recherche.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(page.findAll('tbody .ligne__nom').map((n) => n.text())).toEqual([
      'Carton de quincaillerie',
    ])
    expect((recherche.element as HTMLInputElement).value).toBe('')
    expect(document.activeElement).toBe(recherche.element)

    await recherche.setValue('parpaings')
    await recherche.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(page.findAll('tbody .ligne__nom')).toHaveLength(2)
  })
})

describe('recette : fiche camion', () => {
  it('RG-22 : quitter une fiche camion modifiée demande confirmation', async () => {
    const { page, routeur, depots } = await monterPage(FOURGON)
    await page.get('#camion-nom').setValue('Fourgon 22 m³')
    await tenterDeQuitter(routeur, '/camions')

    boutonDeLaFenetre(textes.referentiels.quitterAction).click()
    await vi.waitFor(() => expect(routeur.currentRoute.value.path).toBe('/camions'))
    const camion = await depots.camions.obtenir('c0000000-0000-4000-8000-000000000004')
    expect(camion?.nom).toBe('Fourgon 20 m³')
  })
})
