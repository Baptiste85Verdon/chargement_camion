<script setup lang="ts">
/**
 * Fenêtre de confirmation (RG-22, cahier technique 6.2), seul composant de ce
 * type dans l'application.
 *
 * C'est une balise `<dialog>` native ouverte par `showModal()` : le navigateur
 * piège le focus dans la fenêtre, rend le reste de la page inerte et ferme à la
 * touche Échap. Le composant ajoute ce que le navigateur ne fait pas toujours :
 *
 * - le focus va d'abord sur « Annuler », l'option sans risque ;
 * - à la fermeture, il revient sur l'élément qui avait le focus avant
 *   (le bouton « Supprimer » qui a ouvert la fenêtre).
 *
 * La page garde la main : elle passe `ouvert`, écoute `confirmer` et `annuler`,
 * et remet `ouvert` à faux. Échap émet `annuler`, comme le bouton.
 */
import { nextTick, onMounted, ref, useId, watch } from 'vue'
import { textes } from '@/textes/fr'
import Bouton from './Bouton.vue'

const props = withDefaults(
  defineProps<{
    ouvert: boolean
    titre: string
    consequence: string
    libelleAction: string
    /** danger : l'action supprime ou fait perdre des données (bouton rouge). */
    ton?: 'danger' | 'neutre'
  }>(),
  { ton: 'danger' },
)

const emit = defineEmits<{ confirmer: []; annuler: [] }>()

const fenetre = ref<HTMLDialogElement | null>(null)
const boutonAnnuler = ref<InstanceType<typeof Bouton> | null>(null)
const idTitre = useId()
const idConsequence = useId()

/** Élément qui avait le focus à l'ouverture, pour l'y ramener à la fermeture. */
let focusPrecedent: HTMLElement | null = null

async function ouvrir() {
  const dialog = fenetre.value
  if (!dialog || dialog.open) return
  focusPrecedent = document.activeElement instanceof HTMLElement ? document.activeElement : null
  dialog.showModal()
  await nextTick()
  ;(boutonAnnuler.value?.$el as HTMLElement | undefined)?.focus()
}

function fermer() {
  const dialog = fenetre.value
  if (dialog?.open) dialog.close()
  focusPrecedent?.focus()
  focusPrecedent = null
}

watch(
  () => props.ouvert,
  (ouvert) => (ouvert ? ouvrir() : fermer()),
)
onMounted(() => {
  if (props.ouvert) void ouvrir()
})

/** Échap : on empêche la fermeture native pour que la page reste maîtresse de `ouvert`. */
function surEchap(evenement: Event) {
  evenement.preventDefault()
  emit('annuler')
}
</script>

<template>
  <dialog
    ref="fenetre"
    class="confirmation"
    :aria-labelledby="idTitre"
    :aria-describedby="idConsequence"
    @cancel="surEchap"
  >
    <h2 :id="idTitre" class="confirmation__titre">{{ props.titre }}</h2>
    <p :id="idConsequence" class="confirmation__consequence">{{ props.consequence }}</p>
    <div class="confirmation__boutons">
      <Bouton
        :variante="props.ton === 'danger' ? 'danger' : 'principal'"
        @click="emit('confirmer')"
      >
        {{ props.libelleAction }}
      </Bouton>
      <Bouton ref="boutonAnnuler" @click="emit('annuler')">
        {{ textes.composants.annuler }}
      </Bouton>
    </div>
  </dialog>
</template>

<style scoped>
.confirmation {
  /* 400 px au plus (charte, « Fenêtres de confirmation »), et jamais plus large que l'écran. */
  width: min(400px, calc(100vw - 2 * var(--espace-4)));
  padding: var(--espace-6);
  color: var(--encre);
  background: var(--surface);
  border: 1px solid var(--bordure);
  border-radius: var(--rayon-carte);
  box-shadow: var(--ombre-flottant);
}

.confirmation::backdrop {
  background: var(--voile);
}

.confirmation__titre {
  margin: 0 0 var(--espace-2);
  font: var(--typo-titre-section);
}

.confirmation__consequence {
  margin: 0 0 var(--espace-6);
  font: var(--typo-corps);
}

.confirmation__boutons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espace-2);
}
</style>
