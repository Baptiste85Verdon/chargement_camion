<script setup lang="ts">
import { RouterView } from 'vue-router'
import { textes } from '@/textes/fr'
</script>

<template>
  <header class="entete">
    <span class="entete__nom">{{ textes.application.nom }}</span>
    <span class="entete__societe">{{ textes.application.societe }}</span>
  </header>
  <main class="contenu">
    <RouterView />
  </main>
</template>

<style scoped>
.entete {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: var(--cible-principale);
  padding: var(--espace-3) var(--espace-7);
  background: var(--surface);
  border-bottom: 1px solid var(--bordure);
}

.entete__nom {
  font: var(--typo-titre-section);
}

.entete__societe {
  font: var(--typo-legende);
  color: var(--texte-doux);
}

.contenu {
  padding: var(--espace-6) var(--espace-7);
}
</style>
