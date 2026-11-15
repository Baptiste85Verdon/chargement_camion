<script setup lang="ts">
/**
 * Badge : statut d'une tournée (« En préparation »), nombre d'éléments en
 * attente. Fond `statut-fond`, texte `texte-fort` (9,2:1), coins `rayon-controle`.
 */
</script>

<template>
  <span class="badge"><slot /></span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  padding: var(--espace-1) var(--espace-2);
  font: var(--typo-badge);
  color: var(--texte-fort);
  white-space: nowrap;
  background: var(--statut-fond);
  border-radius: var(--rayon-controle);
}
</style>
