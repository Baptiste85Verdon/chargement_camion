<script setup lang="ts">
/**
 * Carte : fond `surface`, contour `bordure`, coins `rayon-carte`, sans ombre.
 * C'est une section nommée par son titre, pour que les lecteurs d'écran
 * puissent sauter d'une carte à l'autre.
 *
 * - variante « zone » : contour en pointillés `bordure-zone`, pour la zone
 *   « Articles à placer » ;
 * - emplacement `actions` : boutons ou mention à droite du titre.
 */
import { useId } from 'vue'

const props = withDefaults(
  defineProps<{
    titre: string
    sousTitre?: string
    niveau?: 2 | 3
    variante?: 'normale' | 'zone'
  }>(),
  { sousTitre: undefined, niveau: 2, variante: 'normale' },
)

const idTitre = useId()
</script>

<template>
  <section class="carte" :class="`carte--${props.variante}`" :aria-labelledby="idTitre">
    <header class="carte__entete">
      <div>
        <component :is="`h${props.niveau}`" :id="idTitre" class="carte__titre">
          {{ props.titre }}
        </component>
        <p v-if="props.sousTitre" class="carte__sous-titre">{{ props.sousTitre }}</p>
      </div>
      <div v-if="$slots.actions" class="carte__actions">
        <slot name="actions" />
      </div>
    </header>
    <slot />
  </section>
</template>

<style scoped>
.carte {
  padding: var(--espace-4) var(--espace-5);
  background: var(--surface);
  border: 1px solid var(--bordure);
  border-radius: var(--rayon-carte);
}

.carte--zone {
  border: 2px dashed var(--bordure-zone);
}

.carte__entete {
  display: flex;
  gap: var(--espace-4);
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--espace-3);
}

.carte__titre {
  margin: 0;
  font: var(--typo-titre-section);
  color: var(--encre);
}

.carte__sous-titre {
  margin: var(--espace-1) 0 0;
  font: var(--typo-legende);
  color: var(--texte-doux);
}

.carte__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espace-2);
  align-items: center;
}
</style>
