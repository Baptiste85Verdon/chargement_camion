<script setup lang="ts">
import { textes } from '@/textes/fr'
</script>

<template>
  <h1>{{ textes.accueil.titre }}</h1>
  <p class="vide">{{ textes.accueil.vide }}</p>
</template>

<style scoped>
.vide {
  margin: var(--espace-2) 0 0;
  font: var(--typo-interface);
  color: var(--texte-doux);
}
</style>
