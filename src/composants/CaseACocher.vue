<script setup lang="ts">
/**
 * Case à cocher avec son libellé et une aide facultative dessous (« Fragile »,
 * « Dessus porteur », captures 08 et 08e).
 *
 * Case native, pour le clavier (Espace) et les lecteurs d'écran. Contour
 * `bordure-forte` (3:1, charte « Accessibilité ») ; cochée, elle prend la
 * couleur d'interaction `action` (`accent-color`). Désactivée, elle reste
 * visible, et son aide dit pourquoi.
 */
import { useId } from 'vue'

const props = withDefaults(
  defineProps<{ libelle: string; aide?: string; desactive?: boolean; id?: string }>(),
  { aide: undefined, desactive: false, id: undefined },
)

const coche = defineModel<boolean>({ required: true })
const idAuto = useId()
const idCase = props.id ?? `case-${idAuto}`
const idAide = `${idCase}-aide`
</script>

<template>
  <div class="case" :class="{ 'case--desactivee': props.desactive }">
    <input
      :id="idCase"
      v-model="coche"
      class="case__saisie"
      type="checkbox"
      :disabled="props.desactive"
      :aria-describedby="props.aide ? idAide : undefined"
    />
    <div>
      <label :for="idCase" class="case__libelle">{{ props.libelle }}</label>
      <p v-if="props.aide" :id="idAide" class="case__aide">{{ props.aide }}</p>
    </div>
  </div>
</template>

<style scoped>
.case {
  display: flex;
  gap: var(--espace-2);
  align-items: flex-start;
}

.case__saisie {
  width: var(--espace-5);
  height: var(--espace-5);
  margin: 0;
  accent-color: var(--action);
  cursor: pointer;
}

.case__libelle {
  font: var(--typo-bouton);
  color: var(--encre);
  cursor: pointer;
}

.case__aide {
  margin: 0;
  font: var(--typo-legende);
  color: var(--texte-doux);
}

.case--desactivee .case__saisie,
.case--desactivee .case__libelle {
  cursor: not-allowed;
}

.case--desactivee .case__libelle {
  color: var(--texte-desactive);
}
</style>
