// Navigation principale : l'onglet de la section reste actif sur ses
// sous-pages (fiche, préparation, saisie express, plan), avec aria-current.
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '@/App.vue'
import { routes, sectionDe } from '@/router'
import { CLE_DEPOTS } from '@/stores/depots'
import { depotsDemarrage } from './monter-page'

afterEach(() => {
  document.body.innerHTML = ''
})

const T118 = '/tournees/b0000000-0000-4000-8000-000000000118'

describe('sectionDe', () => {
  it.each([
    ['/', '/'],
    [T118, '/'],
    [`${T118}/plan`, '/'],
    [`${T118}/commandes/nouvelle`, '/'],
    ['/catalogue', '/catalogue'],
    ['/catalogue/nouveau', '/catalogue'],
    ['/camions/c0000000-0000-4000-8000-000000000001', '/camions'],
    ['/attente', '/attente'],
    ['/vitrine', null],
  ])('%s appartient à la section %s', (chemin, section) => {
    expect(sectionDe(chemin)).toBe(section)
  })
})

async function monterApplication(chemin: string) {
  const routeur = createRouter({ history: createMemoryHistory(), routes })
  await routeur.push(chemin)
  await routeur.isReady()
  const app = mount(App, {
    attachTo: document.body,
    global: { plugins: [createPinia(), routeur], provide: { [CLE_DEPOTS]: depotsDemarrage() } },
  })
  await flushPromises()
  return app
}

/** Les onglets marqués actifs : libellé et valeur d'aria-current. */
async function actifs(chemin: string) {
  const app = await monterApplication(chemin)
  return app
    .findAll('.navigation__lien')
    .filter((l) => l.classes('navigation__lien--active'))
    .map((l) => [
      l
        .text()
        .replace(/\d+.*$/, '')
        .trim(),
      l.attributes('aria-current'),
    ])
}

describe('navigation principale', () => {
  it('sur la page de la section, l’onglet est actif et porte aria-current="page"', async () => {
    expect(await actifs('/catalogue')).toEqual([['Catalogue', 'page']])
  })

  it('sur une fiche article, « Catalogue » reste actif, avec aria-current="true"', async () => {
    expect(await actifs('/catalogue/a0000000-0000-4000-8000-000000000001')).toEqual([
      ['Catalogue', 'true'],
    ])
  })

  it('sur la préparation, la saisie express et le plan, « Tournées » reste actif', async () => {
    for (const chemin of [T118, `${T118}/commandes/nouvelle`, `${T118}/plan`]) {
      expect(await actifs(chemin)).toEqual([['Tournées', 'true']])
      document.body.innerHTML = ''
    }
  })

  it('sur une fiche camion, seul « Camions » est actif', async () => {
    expect(await actifs('/camions/c0000000-0000-4000-8000-000000000001')).toEqual([
      ['Camions', 'true'],
    ])
  })
})
