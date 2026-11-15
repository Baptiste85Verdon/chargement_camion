// Annonces d'une page à la suivante : « « Palette de parpaings » est
// archivé », affiché sur le catalogue après l'archivage depuis la fiche.
//
// La fiche dépose le message avant de naviguer ; la page d'arrivée le
// reprend une fois (`reprendre`), puis l'affiche dans sa zone `aria-live`.
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAnnonces = defineStore('annonces', () => {
  const enAttente = ref('')

  function deposer(message: string) {
    enAttente.value = message
  }

  /** Rend le message déposé et l'efface, pour qu'il ne s'affiche qu'une fois. */
  function reprendre(): string {
    const message = enAttente.value
    enAttente.value = ''
    return message
  }

  return { enAttente, deposer, reprendre }
})
