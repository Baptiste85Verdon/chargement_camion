<script setup lang="ts">
/**
 * Trois dimensions saisies ensemble : longueur × largeur × hauteur, en
 * millimètres (captures 08, 08e ; RG-21).
 *
 * Un `fieldset` dont la légende porte le libellé et « (obligatoire) ». Chaque
 * case a son propre libellé, caché à l'œil mais lu (« Longueur »). Le groupe a
 * un seul message d'erreur ou d'avertissement, relié à chaque case.
 *
 * Le groupe est vérifié quand le focus le quitte, pas entre deux cases :
 * on ne reproche pas une hauteur vide à qui vient de taper la longueur.
 * D'où l'événement `quitter`, émis quand le focus sort du `fieldset`.
 *
 * En erreur, seules les cases vides ou illisibles prennent le contour rouge ;
 * si les trois sont lisibles (taille nue plus grande que l'emballée), les
 * trois le prennent.
 */
import { computed, ref } from 'vue'
import { lireMillimetres, type SaisieDimensions } from '@/domaine/validation'
import { textes } from '@/textes/fr'
import Icone from './Icone.vue'

const props = withDefaults(
  defineProps<{
    legende: string
    /** Préfixe des identifiants : `<id>-l` est la cible du résumé des erreurs. */
    id: string
    obligatoire?: boolean
    erreur?: string
    avertissement?: string
  }>(),
  { obligatoire: false, erreur: undefined, avertissement: undefined },
)

const emit = defineEmits<{ quitter: [] }>()
const dims = defineModel<SaisieDimensions>({ required: true })

const cadre = ref<HTMLFieldSetElement | null>(null)

const cases = [
  { cle: 'l', libelle: textes.ficheArticle.longueur },
  { cle: 'w', libelle: textes.ficheArticle.largeur },
  { cle: 'h', libelle: textes.ficheArticle.hauteur },
] as const

const idMessage = computed(() => `${props.id}-message`)

const enErreur = computed(() => {
  if (!props.erreur) return { l: false, w: false, h: false }
  const illisibles = {
    l: lireMillimetres(dims.value.l) === null,
    w: lireMillimetres(dims.value.w) === null,
    h: lireMillimetres(dims.value.h) === null,
  }
  const aucune = !illisibles.l && !illisibles.w && !illisibles.h
  return aucune ? { l: true, w: true, h: true } : illisibles
})

function mettreAJour(cle: 'l' | 'w' | 'h', valeur: string) {
  dims.value = { ...dims.value, [cle]: valeur }
}

/** `relatedTarget` : l'élément qui reçoit le focus. Hors du groupe, on vérifie. */
function surSortie(evenement: FocusEvent) {
  const suivant = evenement.relatedTarget
  if (!(suivant instanceof Node) || !cadre.value?.contains(suivant)) emit('quitter')
}
</script>

<template>
  <fieldset ref="cadre" class="dimensions" @focusout="surSortie">
    <legend class="dimensions__legende">
      {{ props.legende }}
      <span v-if="props.obligatoire" class="dimensions__mention">{{
        textes.composants.obligatoire
      }}</span>
    </legend>
    <div class="dimensions__cases">
      <template v-for="(c, i) in cases" :key="c.cle">
        <span v-if="i > 0" class="dimensions__fois" aria-hidden="true">×</span>
        <div class="dimensions__case">
          <label :for="`${props.id}-${c.cle}`" class="visuellement-cache"
            >{{ c.libelle }}, {{ textes.composants.enMillimetres }}</label
          >
          <input
            :id="`${props.id}-${c.cle}`"
            :value="dims[c.cle]"
            class="dimensions__saisie"
            :class="{ 'dimensions__saisie--erreur': enErreur[c.cle] }"
            type="text"
            inputmode="numeric"
            autocomplete="off"
            :aria-required="props.obligatoire ? 'true' : undefined"
            :aria-invalid="enErreur[c.cle] ? 'true' : undefined"
            :aria-describedby="props.erreur || props.avertissement ? idMessage : undefined"
            @input="mettreAJour(c.cle, ($event.target as HTMLInputElement).value)"
          />
          <span class="dimensions__unite" aria-hidden="true">mm</span>
        </div>
      </template>
    </div>
    <p v-if="props.erreur" :id="idMessage" class="dimensions__message dimensions__message--erreur">
      <Icone nom="erreur" :taille="16" />
      <span>
        <span class="visuellement-cache">{{ textes.composants.prefixeErreur }} </span>
        {{ props.erreur }}
      </span>
    </p>
    <p
      v-else-if="props.avertissement"
      :id="idMessage"
      class="dimensions__message dimensions__message--avertissement"
    >
      <Icone nom="alerte" :taille="16" />
      <span>
        <span class="visuellement-cache">{{ textes.composants.prefixeAvertissement }} </span>
        {{ props.avertissement }}
      </span>
    </p>
  </fieldset>
</template>

<style scoped>
.dimensions {
  min-width: 0;
  padding: 0;
  margin: 0;
  border: 0;
}

.dimensions__legende {
  padding: 0;
  margin-bottom: var(--espace-1);
  font: var(--typo-bouton);
  color: var(--encre);
}

.dimensions__mention {
  font: var(--typo-interface);
  color: var(--texte-doux);
}

.dimensions__cases {
  display: flex;
  gap: var(--espace-2);
  align-items: center;
}

.dimensions__fois {
  font: var(--typo-legende);
  color: var(--texte-doux);
}

.dimensions__case {
  position: relative;
  display: flex;
  flex: 1;
  align-items: center;
  max-width: calc(var(--espace-7) * 4);
}

.dimensions__saisie {
  width: 100%;
  min-height: var(--cible-compacte);
  padding: 0 calc(var(--espace-7) + var(--espace-1)) 0 var(--espace-3);
  font: var(--typo-donnees);
  color: var(--encre);
  background: var(--surface);
  border: 1px solid var(--bordure-forte);
  border-radius: var(--rayon-controle);
}

/* Contour de 2 px, marges réduites d'1 px pour que le texte ne bouge pas. */
.dimensions__saisie--erreur {
  padding: 0 calc(var(--espace-7) + var(--espace-1) - 1px) 0 calc(var(--espace-3) - 1px);
  border: 2px solid var(--erreur);
}

.dimensions__unite {
  position: absolute;
  right: var(--espace-3);
  font: var(--typo-legende);
  color: var(--texte-doux);
  pointer-events: none;
}

.dimensions__message {
  display: flex;
  gap: var(--espace-1);
  align-items: flex-start;
  margin: var(--espace-1) 0 0;
  font: var(--typo-legende);
}

.dimensions__message .icone {
  margin-top: 1px;
}

.dimensions__message--erreur {
  color: var(--erreur-texte);
}

.dimensions__message--erreur .icone {
  color: var(--erreur);
}

.dimensions__message--avertissement {
  color: var(--alerte-texte);
}

.dimensions__message--avertissement .icone {
  color: var(--alerte-icone);
}
</style>
