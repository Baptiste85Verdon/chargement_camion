// Nombre d'éléments de la liste d'attente, affiché dans la navigation
// (capture 01 : « Liste d'attente 2 ») et sur l'accueil.
//
// Un store Pinia : une seule valeur partagée par l'en-tête et les pages.
// Une page qui ajoute, affecte ou supprime un élément appelle `actualiser`,
// et le badge de la navigation suit.
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Depots } from '@/donnees/depots'

export const useAttente = defineStore('attente', () => {
  /** `null` tant que le nombre n'est pas connu (chargement, réseau). */
  const nombre = ref<number | null>(null)

  async function actualiser(depots: Depots) {
    try {
      nombre.value = (await depots.attente.lister()).length
    } catch {
      // Le badge n'est qu'une indication : sans réseau, on ne l'affiche pas.
      nombre.value = null
    }
  }

  return { nombre, actualiser }
})
