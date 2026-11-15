<script setup lang="ts">
/**
 * Champ de saisie avec son libellé et ses messages (RG-21, cahier technique 6.1).
 *
 * Le composant ne vérifie rien lui-même : la page appelle `domaine/validation.ts`
 * à la sortie du champ (événement `blur`) et à l'enregistrement, puis lui passe
 * le message à afficher. Il se contente de l'afficher comme la charte le veut :
 *
 * - libellé au-dessus, suivi de « (obligatoire) » en texte, jamais d'astérisque ;
 * - unité (« mm », « kg ») à droite dans le champ ;
 * - erreur : contour de 2 px `erreur`, et dessous l'icône et le message en
 *   `erreur-texte` ; `aria-invalid` et `aria-describedby` relient le message ;
 * - avertissement : contour inchangé, icône triangle et message en ambre.
 *
 * `donnees` passe la saisie en IBM Plex Mono, alignée à droite (dimensions, poids).
 */
import { computed, useId } from 'vue'
import { textes } from '@/textes/fr'
import Icone from './Icone.vue'

const props = withDefaults(
  defineProps<{
    libelle: string
    /** Identifiant du champ : c'est la cible des liens du résumé des erreurs. */
    id?: string
    obligatoire?: boolean
    unite?: string
    aide?: string
    erreur?: string
    avertissement?: string
    desactive?: boolean
    inputmode?: 'text' | 'numeric' | 'decimal'
    donnees?: boolean
    autocomplete?: string
  }>(),
  {
    id: undefined,
    obligatoire: false,
    unite: undefined,
    aide: undefined,
    erreur: undefined,
    avertissement: undefined,
    desactive: false,
    inputmode: 'text',
    donnees: false,
    autocomplete: 'off',
  },
)

const emit = defineEmits<{ blur: [] }>()
const valeur = defineModel<string>({ required: true })

const idAuto = useId()
const idChamp = computed(() => props.id ?? `champ-${idAuto}`)
const idUnite = computed(() => `${idChamp.value}-unite`)
const idAide = computed(() => `${idChamp.value}-aide`)
const idErreur = computed(() => `${idChamp.value}-erreur`)
const idAvertissement = computed(() => `${idChamp.value}-avertissement`)

/** Tout ce qui décrit le champ, dans l'ordre de lecture. */
const descriptions = computed(() => {
  const ids: string[] = []
  if (props.unite) ids.push(idUnite.value)
  if (props.aide) ids.push(idAide.value)
  if (props.erreur) ids.push(idErreur.value)
  if (props.avertissement) ids.push(idAvertissement.value)
  return ids.length > 0 ? ids.join(' ') : undefined
})
</script>

<template>
  <div
    class="champ"
    :class="{ 'champ--erreur': props.erreur, 'champ--desactive': props.desactive }"
  >
    <label class="champ__libelle" :for="idChamp">
      {{ props.libelle }}
      <span v-if="props.obligatoire" class="champ__mention">{{
        textes.composants.obligatoire
      }}</span>
    </label>
    <p v-if="props.aide" :id="idAide" class="champ__aide">{{ props.aide }}</p>
    <div class="champ__cadre">
      <input
        :id="idChamp"
        v-model="valeur"
        class="champ__saisie"
        :class="{ 'champ__saisie--donnees': props.donnees, 'champ__saisie--unite': props.unite }"
        type="text"
        :inputmode="props.inputmode"
        :autocomplete="props.autocomplete"
        :disabled="props.desactive"
        :aria-required="props.obligatoire ? 'true' : undefined"
        :aria-invalid="props.erreur ? 'true' : undefined"
        :aria-describedby="descriptions"
        @blur="emit('blur')"
      />
      <span v-if="props.unite" :id="idUnite" class="champ__unite">{{ props.unite }}</span>
    </div>
    <p v-if="props.erreur" :id="idErreur" class="champ__message champ__message--erreur">
      <Icone nom="erreur" :taille="16" />
      <span>
        <span class="visuellement-cache">{{ textes.composants.prefixeErreur }} </span>
        {{ props.erreur }}
      </span>
    </p>
    <p
      v-if="props.avertissement"
      :id="idAvertissement"
      class="champ__message champ__message--avertissement"
    >
      <Icone nom="alerte" :taille="16" />
      <span>
        <span class="visuellement-cache">{{ textes.composants.prefixeAvertissement }} </span>
        {{ props.avertissement }}
      </span>
    </p>
  </div>
</template>

<style scoped>
.champ {
  display: flex;
  flex-direction: column;
  gap: var(--espace-1);
}

.champ__libelle {
  font: var(--typo-bouton);
  color: var(--encre);
}

.champ__mention {
  font: var(--typo-interface);
  color: var(--texte-doux);
}

.champ__aide {
  margin: 0;
  font: var(--typo-legende);
  color: var(--texte-doux);
}

.champ__cadre {
  position: relative;
  display: flex;
  align-items: center;
}

.champ__saisie {
  width: 100%;
  min-height: var(--cible-compacte);
  padding: 0 var(--espace-3);
  font: var(--typo-interface);
  color: var(--encre);
  background: var(--surface);
  border: 1px solid var(--bordure-forte);
  border-radius: var(--rayon-controle);
}

.champ__saisie--donnees {
  font: var(--typo-donnees);
  text-align: right;
}

/* Laisse la place de l'unité, posée à droite dans le champ. */
.champ__saisie--unite {
  padding-right: var(--espace-7);
}

.champ__unite {
  position: absolute;
  right: var(--espace-3);
  font: var(--typo-legende);
  color: var(--texte-doux);
  pointer-events: none;
}

/* Erreur : contour de 2 px ; on retire 1 px de marge pour que le texte ne bouge pas. */
.champ--erreur .champ__saisie {
  padding-left: calc(var(--espace-3) - 1px);
  border: 2px solid var(--erreur);
}

.champ--desactive .champ__saisie {
  color: var(--texte-desactive);
  cursor: not-allowed;
  background: var(--fond-page);
  border-style: dashed;
}

.champ__message {
  display: flex;
  gap: var(--espace-1);
  align-items: flex-start;
  margin: 0;
  font: var(--typo-legende);
}

/* L'icône de 16 px est centrée sur la première ligne (12 px × 1,4 ≈ 17 px). */
.champ__message .icone {
  margin-top: 1px;
}

.champ__message--erreur {
  color: var(--erreur-texte);
}

.champ__message--erreur .icone {
  color: var(--erreur);
}

.champ__message--avertissement {
  color: var(--alerte-texte);
}

.champ__message--avertissement .icone {
  color: var(--alerte-icone);
}
</style>
