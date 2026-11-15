<script setup lang="ts">
/**
 * Résumé des erreurs en haut d'un formulaire (RG-21, cahier technique 6.1).
 *
 * À l'enregistrement, la page appelle `focaliser()` (via une référence de
 * modèle) : le résumé reçoit le focus et, grâce à `role="alert"`, il est lu
 * aussitôt. Chaque lien amène le focus sur son champ, prêt à être corrigé.
 */
import { ref } from 'vue'
import { textes } from '@/textes/fr'
import Icone from './Icone.vue'

export interface ErreurResumee {
  /** Identifiant du champ en erreur (prop `id` du composant Champ). */
  champId: string
  libelle: string
  message: string
}

const props = defineProps<{ erreurs: ErreurResumee[] }>()

const cadre = ref<HTMLElement | null>(null)

function focaliser() {
  cadre.value?.focus()
}

/**
 * Un lien « #id » fait défiler jusqu'au champ, mais ne lui donne pas le focus
 * dans tous les navigateurs : on le fait nous-mêmes. `focus()` fait aussi
 * défiler la page jusqu'au champ.
 */
function allerAuChamp(id: string) {
  document.getElementById(id)?.focus()
}

defineExpose({ focaliser })
</script>

<template>
  <div v-if="props.erreurs.length > 0" ref="cadre" class="resume" role="alert" tabindex="-1">
    <p class="resume__titre">
      <Icone nom="erreur" />
      {{ textes.composants.champsACorriger(props.erreurs.length) }}
    </p>
    <ul class="resume__liste">
      <li v-for="erreur in props.erreurs" :key="erreur.champId">
        <a :href="`#${erreur.champId}`" @click.prevent="allerAuChamp(erreur.champId)"
          >{{ erreur.libelle }} : {{ erreur.message }}</a
        >
      </li>
    </ul>
  </div>
</template>

<style scoped>
.resume {
  padding: var(--espace-4) var(--espace-4);
  font: var(--typo-interface);
  background: var(--surface);
  border: 1px solid var(--erreur);
  border-radius: var(--rayon-controle);
}

.resume__titre {
  display: flex;
  gap: var(--espace-2);
  align-items: center;
  margin: 0 0 var(--espace-2);
  font: var(--typo-titre-section);
  color: var(--erreur-texte);
}

.resume__titre .icone {
  color: var(--erreur);
}

.resume__liste {
  padding-left: var(--espace-7);
  margin: 0;
}

/* Cible d'au moins 24 px de haut (WCAG 2.2, critère 2.5.8), même en liste serrée. */
.resume__liste a {
  display: inline-block;
  min-height: var(--espace-6);
  padding: calc((var(--espace-6) - 1lh) / 2) 0;
  color: var(--action);
}

.resume__liste a:hover {
  color: var(--action-fonce);
}
</style>
