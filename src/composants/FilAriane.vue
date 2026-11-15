<script setup lang="ts">
/**
 * Fil d'Ariane (captures 08 et 09b) : « Accueil / Catalogue / Fenêtre… ».
 * Une liste dans un `nav` nommé ; la dernière étape est la page affichée,
 * signalée par `aria-current="page"`, sans lien.
 */
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import { textes } from '@/textes/fr'

export interface EtapeAriane {
  libelle: string
  /** Absent pour la page affichée. */
  vers?: RouteLocationRaw
}

const props = defineProps<{ etapes: EtapeAriane[] }>()
</script>

<template>
  <nav class="ariane" :aria-label="textes.navigation.filAriane">
    <ol class="ariane__liste">
      <li v-for="(etape, i) in props.etapes" :key="i" class="ariane__etape">
        <RouterLink v-if="etape.vers" :to="etape.vers" class="ariane__lien">
          {{ etape.libelle }}
        </RouterLink>
        <span v-else aria-current="page">{{ etape.libelle }}</span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.ariane__liste {
  display: flex;
  flex-wrap: wrap;
  padding: 0;
  margin: 0 0 var(--espace-2);
  font: var(--typo-legende);
  color: var(--texte-doux);
  list-style: none;
}

/* Séparateur « / » dessiné en CSS : il n'est pas lu par les lecteurs d'écran. */
.ariane__etape + .ariane__etape::before {
  padding: 0 var(--espace-2);
  content: '/' / '';
}

.ariane__lien {
  color: var(--action);
}

.ariane__lien:hover {
  color: var(--action-fonce);
}
</style>
