// Monte une page de l'application pour un test de composant : dépôts en
// mémoire remplis avec la base d'exemple (seed.sql), Pinia, et le vrai
// routeur, en historique mémoire. On attend la fin des chargements avec
// `flushPromises`, puis on lit la page comme un utilisateur.
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { lireDonneesDemarrage } from '@/donnees/demarrage'
import type { Depots } from '@/donnees/depots'
import { creerDepotsEnMemoire } from '@/donnees/memoire'
import { routes } from '@/router'
import { CLE_DEPOTS } from '@/stores/depots'
import sql from '../../supabase/seed.sql?raw'

/*
 * jsdom ne sait pas encore ouvrir un <dialog> en fenêtre modale : on simule
 * showModal() et close() au plus simple (voir ConfirmationDialog.test.ts).
 */
const proto = HTMLDialogElement.prototype
proto.showModal ??= function (this: HTMLDialogElement) {
  this.setAttribute('open', '')
}
proto.close ??= function (this: HTMLDialogElement) {
  this.removeAttribute('open')
  this.dispatchEvent(new Event('close'))
}

export function depotsDemarrage(): Depots {
  return creerDepotsEnMemoire(lireDonneesDemarrage(sql))
}

export async function monterPage(chemin: string, depots: Depots = depotsDemarrage()) {
  const routeur = createRouter({ history: createMemoryHistory(), routes })
  await routeur.push(chemin)
  await routeur.isReady()
  // Comme App.vue : la page est recréée quand le chemin change.
  const Racine = defineComponent({
    render: () =>
      h(RouterView, null, {
        default: ({ Component, route }: { Component: unknown; route: { path: string } }) =>
          Component ? h(Component as never, { key: route.path }) : null,
      }),
  })
  const page = mount(Racine, {
    // attachTo : le focus et les fenêtres <dialog> ont besoin d'un vrai document.
    attachTo: document.body,
    global: { plugins: [createPinia(), routeur], provide: { [CLE_DEPOTS]: depots } },
  })
  await flushPromises()
  return { page, routeur, depots }
}
