<script setup lang="ts">
/**
 * Liste déroulante avec libellé et messages : la famille d'un article
 * (captures 08 et 08e). Mêmes états que `Champ` (RG-21) ; c'est un `<select>`
 * natif, pour garder le comportement clavier du navigateur.
 */
import { computed, useId } from 'vue'
import { textes } from '@/textes/fr'
import Icone from './Icone.vue'

const props = withDefaults(
  defineProps<{
    libelle: string
    options: readonly string[]
    /** Première option, vide : « Choisir une famille ». */
    invite: string
    id?: string
    obligatoire?: boolean
    erreur?: string
  }>(),
  { id: undefined, obligatoire: false, erreur: undefined },
)

const emit = defineEmits<{ blur: [] }>()
const valeur = defineModel<string>({ required: true })

const idAuto = useId()
const idChamp = computed(() => props.id ?? `liste-${idAuto}`)
const idErreur = computed(() => `${idChamp.value}-erreur`)
</script>

<template>
  <div class="liste" :class="{ 'liste--erreur': props.erreur }">
    <label class="liste__libelle" :for="idChamp">
      {{ props.libelle }}
      <span v-if="props.obligatoire" class="liste__mention">{{
        textes.composants.obligatoire
      }}</span>
    </label>
    <select
      :id="idChamp"
      v-model="valeur"
      class="liste__choix"
      :aria-required="props.obligatoire ? 'true' : undefined"
      :aria-invalid="props.erreur ? 'true' : undefined"
      :aria-describedby="props.erreur ? idErreur : undefined"
      @blur="emit('blur')"
    >
      <option value="">{{ props.invite }}</option>
      <option v-for="option in props.options" :key="option" :value="option">{{ option }}</option>
    </select>
    <p v-if="props.erreur" :id="idErreur" class="liste__message">
      <Icone nom="erreur" :taille="16" />
      <span>
        <span class="visuellement-cache">{{ textes.composants.prefixeErreur }} </span>
        {{ props.erreur }}
      </span>
    </p>
  </div>
</template>

<style scoped>
.liste {
  display: flex;
  flex-direction: column;
  gap: var(--espace-1);
}

.liste__libelle {
  font: var(--typo-bouton);
  color: var(--encre);
}

.liste__mention {
  /* Graisse normale, mais hauteur de ligne du libellé : la mention n’agrandit
     pas la ligne, et les champs d’une même rangée restent alignés. */
  font-weight: 400;
  color: var(--texte-doux);
}

.liste__choix {
  min-height: var(--cible-compacte);
  padding: 0 var(--espace-3);
  font: var(--typo-interface);
  color: var(--encre);
  background: var(--surface);
  border: 1px solid var(--bordure-forte);
  border-radius: var(--rayon-controle);
}

.liste--erreur .liste__choix {
  padding: 0 calc(var(--espace-3) - 1px);
  border: 2px solid var(--erreur);
}

.liste__message {
  display: flex;
  gap: var(--espace-1);
  align-items: flex-start;
  margin: 0;
  font: var(--typo-legende);
  color: var(--erreur-texte);
}

.liste__message .icone {
  margin-top: 1px;
  color: var(--erreur);
}
</style>
