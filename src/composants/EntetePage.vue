<script setup lang="ts">
/**
 * En-tête de page (captures 07 à 09e) : fil d'Ariane facultatif, titre de
 * page (le seul `h1`), mention en données à côté du titre (la référence d'un
 * article), sous-titre, et les actions de la page à droite.
 */
import FilAriane, { type EtapeAriane } from './FilAriane.vue'

const props = withDefaults(
  defineProps<{
    titre: string
    sousTitre?: string
    /** Petite mention en IBM Plex Mono après le titre (« FEN-CIN-120 »). */
    mention?: string
    ariane?: EtapeAriane[]
  }>(),
  { sousTitre: undefined, mention: undefined, ariane: undefined },
)
</script>

<template>
  <header class="entete-page">
    <div class="entete-page__texte">
      <FilAriane v-if="props.ariane" :etapes="props.ariane" />
      <h1 class="entete-page__titre">
        {{ props.titre }}
        <span v-if="props.mention" class="entete-page__mention">{{ props.mention }}</span>
      </h1>
      <p v-if="props.sousTitre" class="entete-page__sous-titre">{{ props.sousTitre }}</p>
    </div>
    <div v-if="$slots.actions" class="entete-page__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.entete-page {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espace-4);
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: var(--espace-5);
}

.entete-page__mention {
  margin-left: var(--espace-2);
  font: var(--typo-donnees);
  color: var(--texte-doux);
}

.entete-page__sous-titre {
  margin: var(--espace-1) 0 0;
  font: var(--typo-legende);
  color: var(--texte-doux);
}

.entete-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espace-2);
}
</style>
