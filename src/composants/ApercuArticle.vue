<script setup lang="ts">
/**
 * Aperçu coté d'un article (fiche article) : l'article posé à plat, vu sous
 * trois faces au choix, avec ses cotes, comme le plan de la fiche camion.
 *
 * - Dessus : longueur × largeur ;
 * - Face : longueur × hauteur ;
 * - Côté : largeur × hauteur.
 *
 * Trait plein pour la taille emballée ; la taille nue, quand il y en a une,
 * est un rectangle en pointillés centré dedans. Le choix de la face est un
 * `Selecteur` : de vrais boutons radio, parcourus aux flèches.
 */
import { computed, ref } from 'vue'
import type { Dimensions } from '@/domaine/types'
import { textes } from '@/textes/fr'
import PlanCote from './PlanCote.vue'
import Selecteur from './Selecteur.vue'
import { formaterMillimetres } from './format'

const props = withDefaults(defineProps<{ emballe?: Dimensions; nu?: Dimensions }>(), {
  emballe: undefined,
  nu: undefined,
})

const t = textes.ficheArticle

type Face = 'dessus' | 'face' | 'cote'

/** Pour chaque face : la dimension horizontale, la verticale, et le titre. */
const FACES: Record<
  Face,
  { horizontale: keyof Dimensions; verticale: keyof Dimensions; titre: string }
> = {
  dessus: { horizontale: 'l', verticale: 'w', titre: t.vueDessus },
  face: { horizontale: 'l', verticale: 'h', titre: t.vueFace },
  cote: { horizontale: 'w', verticale: 'h', titre: t.vueCote },
}

const options = [
  { valeur: 'dessus', libelle: t.dessus },
  { valeur: 'face', libelle: t.face },
  { valeur: 'cote', libelle: t.cote },
]

const face = ref<string>('dessus')
const vue = computed(() => FACES[face.value as Face])

const mm = (valeur: number) => `${formaterMillimetres(valeur)} mm`

/** La taille nue dans la face choisie, centrée dans l'emballage. */
const nu = computed(() => {
  const e = props.emballe
  const n = props.nu
  if (!e || !n) return null
  const { horizontale, verticale } = vue.value
  return {
    x: (e[horizontale] - n[horizontale]) / 2,
    y: (e[verticale] - n[verticale]) / 2,
    largeur: n[horizontale],
    hauteur: n[verticale],
  }
})
</script>

<template>
  <div class="apercu">
    <Selecteur v-model="face" :legende="t.faces" :options="options" :legende-visible="false" />
    <PlanCote
      v-if="props.emballe"
      :titre="vue.titre"
      :largeur="props.emballe[vue.horizontale]"
      :hauteur="props.emballe[vue.verticale]"
      :description="
        t.apercuDescription(
          vue.titre.toLocaleLowerCase('fr'),
          mm(props.emballe[vue.horizontale]),
          mm(props.emballe[vue.verticale]),
        )
      "
      :hauteur-max="6"
    >
      <rect
        v-if="nu"
        class="apercu__nu"
        :x="nu.x"
        :y="nu.y"
        :width="nu.largeur"
        :height="nu.hauteur"
      />
    </PlanCote>
    <p v-else class="apercu__vide">{{ t.apercuIncomplet }}</p>
    <ul class="apercu__legende">
      <li><span class="apercu__pastille" aria-hidden="true" />{{ t.emballe }}</li>
      <li v-if="props.nu">
        <span class="apercu__pastille apercu__pastille--nu" aria-hidden="true" />
        {{ t.nu }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.apercu {
  display: flex;
  flex-direction: column;
  gap: var(--espace-3);
}

.apercu__nu {
  fill: none;
  stroke: var(--texte-doux);
  stroke-dasharray: 4 3;
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
}

.apercu__vide {
  margin: 0;
  font: var(--typo-legende);
  color: var(--texte-doux);
}

.apercu__legende {
  display: flex;
  gap: var(--espace-4);
  padding: 0;
  margin: 0;
  font: var(--typo-legende);
  color: var(--texte-fort);
  list-style: none;
}

.apercu__legende li {
  display: flex;
  gap: var(--espace-1);
  align-items: center;
}

.apercu__pastille {
  display: inline-block;
  width: var(--espace-4);
  height: var(--espace-3);
  border: 2px solid var(--camion-contour);
  border-radius: var(--rayon-code);
}

.apercu__pastille--nu {
  border: 1px dashed var(--texte-doux);
}
</style>
