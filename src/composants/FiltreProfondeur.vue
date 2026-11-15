<script setup lang="ts">
/**
 * Filtre de profondeur d'un cadre de vue (cahier technique 5.10) : un
 * curseur à deux poignées, fait de deux curseurs natifs (`input type=range`),
 * « De » et « À ». Le navigateur fournit le clavier (flèches, Origine, Fin)
 * et l'annonce de la valeur ; `aria-valuetext` la redit en millimètres.
 *
 * Les poignées ne se croisent pas : il reste toujours une tranche d'au moins
 * un pas. Toute la profondeur sélectionnée : pas de filtre.
 */
import { computed, useId } from 'vue'
import type { Tranche } from '@/domaine/contenu-vue'
import { textes } from '@/textes/fr'
import { formaterMillimetres } from './format'

const props = withDefaults(defineProps<{ max: number; pas?: number }>(), { pas: 100 })
const tranche = defineModel<Tranche>({ required: true })

const t = textes.plan
const id = useId()

function changerDebut(evenement: Event) {
  const v = Number((evenement.target as HTMLInputElement).value)
  const debut = Math.min(v, tranche.value.fin - props.pas)
  tranche.value = { ...tranche.value, debut }
  ;(evenement.target as HTMLInputElement).value = String(debut)
}

function changerFin(evenement: Event) {
  const v = Number((evenement.target as HTMLInputElement).value)
  const fin = Math.max(v, tranche.value.debut + props.pas)
  tranche.value = { ...tranche.value, fin }
  ;(evenement.target as HTMLInputElement).value = String(fin)
}

const valeur = computed(() =>
  t.profondeurValeur(
    formaterMillimetres(tranche.value.debut),
    formaterMillimetres(tranche.value.fin),
  ),
)
const mm = (v: number) => `${formaterMillimetres(v)} mm`
</script>

<template>
  <fieldset class="filtre">
    <legend class="filtre__legende">{{ t.profondeur }}</legend>
    <label class="filtre__curseur">
      <span class="filtre__libelle">{{ t.profondeurDe }}</span>
      <input
        type="range"
        min="0"
        :max="props.max"
        :step="props.pas"
        :value="tranche.debut"
        :aria-valuetext="mm(tranche.debut)"
        :aria-describedby="`${id}-valeur`"
        @input="changerDebut"
      />
    </label>
    <label class="filtre__curseur">
      <span class="filtre__libelle">{{ t.profondeurA }}</span>
      <input
        type="range"
        min="0"
        :max="props.max"
        :step="props.pas"
        :value="tranche.fin"
        :aria-valuetext="mm(tranche.fin)"
        :aria-describedby="`${id}-valeur`"
        @input="changerFin"
      />
    </label>
    <output :id="`${id}-valeur`" class="filtre__valeur">{{ valeur }}</output>
  </fieldset>
</template>

<style scoped>
.filtre {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--espace-2) var(--espace-3);
  align-items: center;
  min-width: 0;
  padding: 0;
  margin: 0;
  border: 0;
}

/* Comme le sélecteur : la légende sort du flux du cadre pour rester en ligne. */
.filtre__legende {
  float: left;
  padding: 0;
  margin-right: var(--espace-1);
  font: var(--typo-legende);
  color: var(--texte-doux);
}

.filtre__curseur {
  display: inline-flex;
  gap: var(--espace-1);
  align-items: center;
}

.filtre__libelle {
  font: var(--typo-legende);
  color: var(--texte-doux);
}

.filtre__curseur input {
  width: calc(var(--espace-7) * 3);
  min-height: var(--cible-mini);
  margin: 0;
  accent-color: var(--action);
}

.filtre__valeur {
  font: var(--typo-donnees);
  color: var(--texte-fort);
  white-space: nowrap;
}
</style>
