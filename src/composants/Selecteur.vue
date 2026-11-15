<script setup lang="ts">
/**
 * Sélecteur à segments : vues (Dessus, Gauche…), mode d'affichage, profondeur.
 *
 * Construit sur de vrais boutons radio, cachés visuellement : le navigateur
 * fournit alors gratuitement le comportement clavier attendu (Tab entre dans le
 * groupe, les flèches changent d'option) et l'annonce « 1 sur 5, coché ».
 *
 * - ton « encre » : option choisie sur fond `encre` (vues, mode) ;
 * - ton « info » : option choisie sur fond `info-fond` (profondeur).
 * Une option désactivée reste visible : c'est par exemple la vue déjà affichée
 * dans l'autre cadre.
 */
import { useId } from 'vue'

export interface OptionSelecteur {
  valeur: string
  libelle: string
  desactive?: boolean
  /** Précision lue seulement (« déjà affichée dans l'autre cadre »). */
  description?: string
}

const props = withDefaults(
  defineProps<{
    legende: string
    options: OptionSelecteur[]
    ton?: 'encre' | 'info'
    /** La légende est toujours lue ; on peut la cacher à l'œil si le contexte suffit. */
    legendeVisible?: boolean
  }>(),
  { ton: 'encre', legendeVisible: true },
)

const valeur = defineModel<string>({ required: true })
const nom = useId()
</script>

<template>
  <fieldset class="selecteur" :class="`selecteur--${props.ton}`">
    <legend class="selecteur__legende" :class="{ 'visuellement-cache': !props.legendeVisible }">
      {{ props.legende }}
    </legend>
    <div class="selecteur__options">
      <label
        v-for="option in props.options"
        :key="option.valeur"
        class="selecteur__option"
        :class="{
          'selecteur__option--choisie': option.valeur === valeur,
          'selecteur__option--desactivee': option.desactive,
        }"
      >
        <input
          v-model="valeur"
          class="selecteur__radio visuellement-cache"
          type="radio"
          :name="nom"
          :value="option.valeur"
          :disabled="option.desactive"
        />
        {{ option.libelle }}
        <span v-if="option.description" class="visuellement-cache">
          , {{ option.description }}</span
        >
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
.selecteur {
  display: inline-flex;
  gap: var(--espace-2);
  align-items: center;
  min-width: 0;
  padding: 0;
  margin: 0;
  border: 0;
}

/* Une légende de fieldset se place mal en ligne : on la sort du flux du cadre. */
.selecteur__legende {
  float: left;
  padding: 0;
  margin-right: var(--espace-2);
  font: var(--typo-legende);
  color: var(--texte-doux);
}

.selecteur__options {
  display: inline-flex;
}

.selecteur__option {
  display: inline-flex;
  align-items: center;
  min-height: var(--cible-compacte);
  padding: 0 var(--espace-3);
  font: var(--typo-bouton);
  color: var(--encre);
  cursor: pointer;
  background: var(--surface);
  border: 1px solid var(--bordure-controle);
}

/* Segments collés : un seul contour entre deux options. */
.selecteur__option + .selecteur__option {
  margin-left: -1px;
}

/* Coins arrondis seulement aux deux bouts du groupe. */
.selecteur__option:first-child {
  border-start-start-radius: var(--rayon-controle);
  border-end-start-radius: var(--rayon-controle);
}

.selecteur__option:last-child {
  border-start-end-radius: var(--rayon-controle);
  border-end-end-radius: var(--rayon-controle);
}

.selecteur__option:hover {
  background: var(--surface-survol);
}

/* Le focus est sur le radio caché : on dessine le double anneau sur l'option. */
.selecteur__option:has(.selecteur__radio:focus-visible) {
  position: relative;
  z-index: 1;
  outline: var(--focus) solid var(--action);
  outline-offset: var(--focus);
  box-shadow: 0 0 0 var(--focus) var(--surface);
}

.selecteur--encre .selecteur__option--choisie {
  position: relative;
  color: var(--surface);
  background: var(--encre);
  border-color: var(--encre);
}

.selecteur--info .selecteur__option--choisie {
  position: relative;
  color: var(--action-fonce);
  background: var(--info-fond);
  border-color: var(--action);
}

.selecteur__option--desactivee {
  color: var(--texte-desactive);
  cursor: not-allowed;
  background: var(--surface);
}

.selecteur__option--desactivee:hover {
  background: var(--surface);
}
</style>
