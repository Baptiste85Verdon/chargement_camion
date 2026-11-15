<script setup lang="ts">
/**
 * Bouton (charte, « Composants » ; design system, « Couleurs »).
 *
 * - principal : fond `encre`, jamais bleu ; une action principale par écran ;
 * - secondaire : fond `surface`, contour `bordure-controle` ;
 * - texte : sans fond ni contour, en `action` (« Au fil de la tournée ») ;
 * - danger : fond `erreur`, seulement pour une action qui supprime ou fait
 *   perdre des données, dans une fenêtre de confirmation (RG-22).
 *
 * `presse` en fait un bouton à bascule (aria-pressed) : fond `info-fond`.
 * Un bouton qui ne montre qu'une icône doit recevoir un `libelle`, qui devient
 * son nom accessible.
 */
import Icone, { type NomIcone } from './Icone.vue'

const props = withDefaults(
  defineProps<{
    variante?: 'principal' | 'secondaire' | 'texte' | 'danger'
    taille?: 'grande' | 'normale' | 'petite'
    type?: 'button' | 'submit'
    presse?: boolean
    desactive?: boolean
    icone?: NomIcone
    seulementIcone?: boolean
    libelle?: string
  }>(),
  {
    variante: 'secondaire',
    taille: 'normale',
    type: 'button',
    // Sans valeur par défaut explicite, Vue convertirait l'absence en `false`
    // et tous les boutons annonceraient « non pressé ».
    presse: undefined,
    desactive: false,
    icone: undefined,
    seulementIcone: false,
    libelle: undefined,
  },
)
</script>

<template>
  <button
    :type="props.type"
    class="bouton"
    :class="[
      `bouton--${props.variante}`,
      `bouton--${props.taille}`,
      { 'bouton--icone': props.seulementIcone },
    ]"
    :aria-pressed="props.presse === undefined ? undefined : props.presse"
    :aria-label="props.seulementIcone ? props.libelle : undefined"
    :disabled="props.desactive"
  >
    <Icone v-if="props.icone" :nom="props.icone" :taille="props.taille === 'petite' ? 16 : 20" />
    <span v-if="!props.seulementIcone" class="bouton__libelle"><slot /></span>
  </button>
</template>

<style scoped>
.bouton {
  display: inline-flex;
  gap: var(--espace-2);
  align-items: center;
  justify-content: center;
  min-height: var(--cible-barre);
  padding: 0 var(--espace-4);
  font: var(--typo-bouton);
  color: var(--encre);
  white-space: nowrap;
  cursor: pointer;
  background: var(--surface);
  border: 1px solid var(--bordure-controle);
  border-radius: var(--rayon-controle);
}

/* Tailles : cibles de la charte (44, 40 et 32 px). */
.bouton--grande {
  min-height: var(--cible-principale);
  padding: 0 var(--espace-5);
}

.bouton--petite {
  min-height: var(--cible-mini);
  padding: 0 var(--espace-3);
}

.bouton--icone {
  min-width: var(--cible-barre);
  padding: 0;
}

.bouton--petite.bouton--icone {
  min-width: var(--cible-mini);
}

/* Secondaire */
.bouton--secondaire:hover {
  background: var(--surface-survol);
  border-color: var(--bordure-forte);
}

.bouton--secondaire:active {
  background: var(--surface-appui);
}

/* Bouton à bascule pressé (profondeur « Tout », légende des commandes). */
.bouton--secondaire[aria-pressed='true'] {
  color: var(--action-fonce);
  background: var(--info-fond);
  border-color: var(--action);
}

/* Principal : encre, jamais bleu. */
.bouton--principal {
  font: var(--typo-bouton-principal);
  color: var(--surface);
  background: var(--encre);
  border-color: var(--encre);
}

.bouton--principal:hover {
  background: var(--encre-survol);
  border-color: var(--encre-survol);
}

.bouton--principal:active {
  background: var(--encre-appui);
  border-color: var(--encre-appui);
}

/* Danger : seulement pour une perte de données (RG-22). */
.bouton--danger {
  font: var(--typo-bouton-principal);
  color: var(--surface);
  background: var(--erreur);
  border-color: var(--erreur);
}

.bouton--danger:hover,
.bouton--danger:active {
  background: var(--erreur-texte);
  border-color: var(--erreur-texte);
}

/* Texte : un lien qui agit. */
.bouton--texte {
  padding: 0 var(--espace-2);
  color: var(--action);
  background: none;
  border-color: transparent;
}

.bouton--texte:hover {
  color: var(--action-fonce);
  text-decoration: underline;
}

/* Désactivé : gris et contour en pointillés, quelle que soit la variante. */
.bouton:disabled {
  color: var(--texte-desactive);
  cursor: not-allowed;
  background: var(--fond-page);
  border-style: dashed;
  border-color: var(--bordure-controle);
}

.bouton--texte:disabled {
  background: none;
  border-color: transparent;
}
</style>
