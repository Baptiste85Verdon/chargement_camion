// Quitter un formulaire qui contient des modifications non enregistrées
// (RG-22, cahier technique 6.1) : deux chemins de sortie à surveiller.
//
// - Navigation dans l'application (lien, bouton Précédent) : la garde
//   `onBeforeRouteLeave` de Vue Router l'arrête et ouvre la fenêtre de
//   confirmation. Si l'utilisateur confirme, on relance la même navigation.
// - Fermeture ou rechargement de l'onglet : seul le navigateur peut alors
//   demander confirmation, avec sa propre fenêtre (`beforeunload`).
import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'

export function utiliserConfirmationSortie(modifie: Readonly<Ref<boolean>>) {
  const routeur = useRouter()
  /** La fenêtre « Quitter sans enregistrer ? » est-elle ouverte ? */
  const ouverte = ref(false)
  /** Navigation mise en attente pendant que la fenêtre est ouverte. */
  let destination: string | null = null
  /** Vrai une fois la sortie permise : après confirmation, enregistrement ou suppression. */
  let permise = false

  onBeforeRouteLeave((vers) => {
    if (permise || !modifie.value) return true
    destination = vers.fullPath
    ouverte.value = true
    return false
  })

  function surFermetureOnglet(evenement: BeforeUnloadEvent) {
    if (modifie.value) evenement.preventDefault()
  }
  onMounted(() => window.addEventListener('beforeunload', surFermetureOnglet))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', surFermetureOnglet))

  /** « Quitter sans enregistrer » : la navigation arrêtée reprend. */
  async function confirmer() {
    permise = true
    ouverte.value = false
    if (destination) await routeur.push(destination)
  }

  function annuler() {
    ouverte.value = false
    destination = null
  }

  /** La page quitte d'elle-même, sans rien perdre (après enregistrement ou suppression). */
  function permettre() {
    permise = true
  }

  return { ouverte, confirmer, annuler, permettre }
}
