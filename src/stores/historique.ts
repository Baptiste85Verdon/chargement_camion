// Historique des ajustements manuels, pour « Annuler le dernier déplacement »
// et Ctrl + Z (cahier technique 5.18 ; décision 4 du prototype 2).
//
// Une pile en mémoire : chaque changement accepté y dépose le plan d'avant.
// Annuler reprend le dernier plan déposé, que la page enregistre comme un
// déplacement. La pile ne survit pas au rechargement, et la page la vide en
// arrivant et à chaque nouvelle version du plan. Pas de « Rétablir ».
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Placement } from '@/domaine/types'

export interface ChangementAnnulable {
  /** Version du plan où le changement a été fait. */
  planId: string
  /** Le plan juste avant le changement, dans l'ordre de chargement. */
  avant: Placement[]
  /** Ce qui sera annulé : « Déplacement de A12 ». */
  libelle: string
}

export const useHistorique = defineStore('historique', () => {
  const pile = ref<ChangementAnnulable[]>([])

  function empiler(changement: ChangementAnnulable) {
    pile.value.push(changement)
  }

  /**
   * Le dernier changement fait dans cette version, retiré de la pile, ou
   * `undefined`. Un changement d'une autre version n'est jamais rendu.
   */
  function depiler(planId: string): ChangementAnnulable | undefined {
    const dernier = pile.value.at(-1)
    if (dernier?.planId !== planId) return undefined
    return pile.value.pop()
  }

  function peutAnnuler(planId: string): boolean {
    return pile.value.at(-1)?.planId === planId
  }

  function vider() {
    pile.value = []
  }

  return { pile, empiler, depiler, peutAnnuler, vider }
})
