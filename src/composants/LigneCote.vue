<script setup lang="ts">
/**
 * Ligne de cote (charte, « Plan coté » ; cahier technique 5.13) : un trait de
 * 1 px `cote`, une petite flèche pleine à chaque extrémité, la valeur au
 * milieu en `repere` (« 7 200 mm »).
 *
 * En HTML plutôt que dans le SVG du dessin : la cote garde ainsi une taille
 * lisible quelle que soit l'échelle. Elle prend toute la longueur de son
 * conteneur, que le plan aligne sur le bord mesuré.
 *
 * Décorative pour les lecteurs d'écran : le dessin coté porte déjà les
 * mêmes dimensions dans son nom accessible.
 */
const props = withDefaults(
  defineProps<{ valeur: string; sens?: 'horizontal' | 'vertical'; ton?: 'cote' | 'action' }>(),
  { sens: 'horizontal', ton: 'cote' },
)

/** Triangles dans une grille de 8 : la pointe touche l'extrémité mesurée. */
const FLECHES = {
  horizontal: { debut: 'M0 4 8 0v8z', fin: 'M8 4 0 0v8z' },
  vertical: { debut: 'M4 0 0 8h8z', fin: 'M4 8 0 0h8z' },
} as const
</script>

<template>
  <div class="cote" :class="[`cote--${props.sens}`, `cote--${props.ton}`]" aria-hidden="true">
    <svg class="cote__fleche" viewBox="0 0 8 8" focusable="false">
      <path :d="FLECHES[props.sens].debut" />
    </svg>
    <span class="cote__trait" />
    <span class="cote__valeur">{{ props.valeur }}</span>
    <span class="cote__trait" />
    <svg class="cote__fleche" viewBox="0 0 8 8" focusable="false">
      <path :d="FLECHES[props.sens].fin" />
    </svg>
  </div>
</template>

<style scoped>
.cote {
  display: flex;
  align-items: center;

  /* Si la valeur ne tient pas, elle dépasse autant des deux côtés. */
  justify-content: center;
  font: var(--typo-repere);
  color: var(--texte-fort);
}

.cote--horizontal {
  width: 100%;
}

.cote--vertical {
  flex-direction: column;
  height: 100%;
}

.cote__fleche {
  flex: none;
  width: var(--espace-2);
  height: var(--espace-2);
  fill: var(--cote);
}

/* Une cote plus courte que sa valeur : les traits s'effacent (min 0), la valeur dépasse. */
.cote__trait {
  flex: 1;
  min-width: 0;
  min-height: 0;
  background: var(--cote);
}

.cote--horizontal .cote__trait {
  height: 1px;
}

.cote--vertical .cote__trait {
  width: 1px;
}

.cote__valeur {
  position: relative;
  padding: 0 var(--espace-1);
  white-space: nowrap;
  background: var(--surface);
}

/* Texte vertical, lu de bas en haut comme sur un plan. */
.cote--vertical .cote__valeur {
  padding: var(--espace-1) 0;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
}

/* Cote d'un article sélectionné : en `action` (charte, « Plan coté »). */
.cote--action {
  color: var(--action-fonce);
}

.cote--action .cote__fleche {
  fill: var(--action);
}

.cote--action .cote__trait {
  background: var(--action);
}
</style>
