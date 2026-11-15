<script setup lang="ts">
/**
 * Touche du clavier (raccourcis) : élément `kbd`, fond `fond-page`, contour
 * `bordure-controle`, coins `rayon-bloc`, texte en `repere` (mono).
 */
</script>

<template>
  <kbd class="touche"><slot /></kbd>
</template>

<style scoped>
.touche {
  display: inline-block;
  min-width: var(--espace-6);
  padding: 0 var(--espace-1);
  font: var(--typo-repere);
  color: var(--encre);
  text-align: center;
  background: var(--fond-page);
  border: 1px solid var(--bordure-controle);
  border-radius: var(--rayon-bloc);
}
</style>
