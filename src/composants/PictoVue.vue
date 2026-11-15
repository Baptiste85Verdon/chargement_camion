<script setup lang="ts">
/**
 * Mini-pictogramme du camion vu de dessus, qui montre d'où l'on regarde
 * (cahier technique 5.8, « Repères toujours visibles »). La cabine est à
 * gauche, les portes à droite, la paroi gauche en bas, comme dans la vue de
 * dessus. Une flèche `action` part de l'observateur vers la caisse ; pour la
 * vue de dessus, un point cerclé : on regarde d'en haut.
 *
 * Dessiné en pixels (grille de 56 × 32) : c'est une icône, pas un plan.
 */
import type { Vue } from '@/domaine/projection'
import { textes } from '@/textes/fr'

const props = defineProps<{ vue: Vue }>()

/** Flèche vers la caisse : trait puis pointe, dans la grille de 56 × 32. */
const FLECHES: Record<Exclude<Vue, 'dessus'>, { trait: string; pointe: string }> = {
  gauche: { trait: 'M34 31v-5', pointe: 'M31 27l3-3 3 3' },
  droite: { trait: 'M34 1v5', pointe: 'M31 5l3 3 3-3' },
  avant: { trait: 'M17 16h6', pointe: 'M21 13l3 3-3 3' },
  arriere: { trait: 'M55 16h-5', pointe: 'M51 13l-3 3 3 3' },
}
</script>

<template>
  <svg
    class="picto-vue"
    viewBox="0 0 56 32"
    width="56"
    height="32"
    role="img"
    :aria-label="textes.plan.pictogramme[props.vue]"
  >
    <!-- Cabine, puis caisse : de x 14 (fond) à x 48 (portes). -->
    <rect class="picto-vue__cabine" x="2" y="11" width="11" height="10" />
    <rect class="picto-vue__caisse" x="14" y="8" width="34" height="16" />
    <template v-if="props.vue === 'dessus'">
      <circle class="picto-vue__oeil" cx="31" cy="16" r="4" />
      <circle class="picto-vue__point" cx="31" cy="16" r="1.5" />
    </template>
    <template v-else>
      <path class="picto-vue__fleche" :d="FLECHES[props.vue].trait" />
      <path class="picto-vue__fleche" :d="FLECHES[props.vue].pointe" />
    </template>
  </svg>
</template>

<style scoped>
.picto-vue {
  flex: none;
}

.picto-vue__cabine,
.picto-vue__caisse {
  fill: var(--surface);
  stroke: var(--camion-contour);
  stroke-width: 1.5;
}

.picto-vue__fleche,
.picto-vue__oeil {
  fill: none;
  stroke: var(--action);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.picto-vue__point {
  fill: var(--action);
}
</style>
