<script setup lang="ts">
/**
 * Un lien qui a l'apparence d'un bouton : « Créer un article », « Ouvrir la
 * fiche ». Il mène à une autre page, c'est donc un vrai lien (RouterLink) :
 * le lecteur d'écran l'annonce comme tel, et on peut l'ouvrir dans un nouvel
 * onglet. Mêmes variantes et tailles que `Bouton`.
 */
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import Icone, { type NomIcone } from './Icone.vue'

const props = withDefaults(
  defineProps<{
    vers: RouteLocationRaw
    variante?: 'principal' | 'secondaire'
    taille?: 'grande' | 'normale' | 'petite'
    icone?: NomIcone
    /** Nom accessible plus précis que le texte visible (« Ouvrir la fiche Porteur 7,2 m »). */
    libelle?: string
  }>(),
  { variante: 'secondaire', taille: 'normale', icone: undefined, libelle: undefined },
)
</script>

<template>
  <RouterLink
    :to="props.vers"
    class="lien-bouton"
    :class="[`lien-bouton--${props.variante}`, `lien-bouton--${props.taille}`]"
    :aria-label="props.libelle"
  >
    <Icone v-if="props.icone" :nom="props.icone" :taille="props.taille === 'petite' ? 16 : 20" />
    <slot />
  </RouterLink>
</template>

<style scoped>
.lien-bouton {
  display: inline-flex;
  gap: var(--espace-2);
  align-items: center;
  justify-content: center;
  min-height: var(--cible-barre);
  padding: 0 var(--espace-4);
  font: var(--typo-bouton);
  color: var(--encre);
  text-decoration: none;
  white-space: nowrap;
  background: var(--surface);
  border: 1px solid var(--bordure-controle);
  border-radius: var(--rayon-controle);
}

.lien-bouton--grande {
  min-height: var(--cible-principale);
  padding: 0 var(--espace-5);
}

.lien-bouton--petite {
  min-height: var(--cible-mini);
  padding: 0 var(--espace-3);
}

.lien-bouton--secondaire:hover {
  background: var(--surface-survol);
  border-color: var(--bordure-forte);
}

.lien-bouton--secondaire:active {
  background: var(--surface-appui);
}

.lien-bouton--principal {
  font: var(--typo-bouton-principal);
  color: var(--surface);
  background: var(--encre);
  border-color: var(--encre);
}

.lien-bouton--principal:hover {
  background: var(--encre-survol);
  border-color: var(--encre-survol);
}

.lien-bouton--principal:active {
  background: var(--encre-appui);
  border-color: var(--encre-appui);
}
</style>
