import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PageAccueil from '@/pages/PageAccueil.vue'
import { textes } from '@/textes/fr'

describe("page d'accueil", () => {
  it('affiche le titre de la page en h1', () => {
    const page = mount(PageAccueil)
    expect(page.get('h1').text()).toBe(textes.accueil.titre)
  })
})
