<script setup lang="ts">
/**
 * Aperçu coté d'un article (captures 08 et 08e) : l'article posé à plat, vu
 * de dessus, longueur en largeur d'écran et largeur en hauteur d'écran.
 * Trait plein pour la taille emballée, pointillés pour la taille nue.
 *
 * Le dessin est mis à l'échelle en pixels (au plus 240 × 160) plutôt qu'avec
 * un `viewBox` en millimètres : les cotes gardent ainsi une taille lisible,
 * quelle que soit la taille de l'article. L'image a un nom accessible qui
 * donne les mêmes dimensions en texte.
 */
import { computed } from 'vue'
import type { Dimensions } from '@/domaine/types'
import { textes } from '@/textes/fr'
import { formaterDimensions, formaterMillimetres } from './format'

const props = withDefaults(defineProps<{ emballe?: Dimensions; nu?: Dimensions }>(), {
  emballe: undefined,
  nu: undefined,
})

const LARGEUR_MAX = 240
const HAUTEUR_MAX = 160
/** Place laissée à gauche et en bas pour les cotes. */
const MARGE = 32

const dessin = computed(() => {
  const e = props.emballe
  if (!e) return null
  const echelle = Math.min(LARGEUR_MAX / e.l, HAUTEUR_MAX / e.w)
  const largeur = e.l * echelle
  const hauteur = e.w * echelle
  const nu = props.nu
  return {
    largeur,
    hauteur,
    // Taille nue centrée dans l'emballage.
    nu: nu
      ? {
          x: MARGE + ((e.l - nu.l) / 2) * echelle,
          y: ((e.w - nu.w) / 2) * echelle + 1,
          largeur: nu.l * echelle,
          hauteur: nu.w * echelle,
        }
      : null,
  }
})
</script>

<template>
  <div class="apercu">
    <svg
      v-if="dessin && props.emballe"
      class="apercu__dessin"
      :viewBox="`0 0 ${dessin.largeur + MARGE + 2} ${dessin.hauteur + MARGE + 2}`"
      :width="dessin.largeur + MARGE + 2"
      :height="dessin.hauteur + MARGE + 2"
      role="img"
      :aria-label="textes.ficheArticle.apercuDescription(formaterDimensions(props.emballe))"
    >
      <rect
        class="apercu__emballe"
        :x="MARGE"
        y="1"
        :width="dessin.largeur"
        :height="dessin.hauteur"
      />
      <rect
        v-if="dessin.nu"
        class="apercu__nu"
        :x="dessin.nu.x"
        :y="dessin.nu.y"
        :width="dessin.nu.largeur"
        :height="dessin.nu.hauteur"
      />
      <!-- Cote de la largeur, à gauche, texte tourné. -->
      <line class="apercu__cote" :x1="MARGE / 2" y1="1" :x2="MARGE / 2" :y2="dessin.hauteur + 1" />
      <text
        class="apercu__valeur"
        :transform="`translate(${MARGE / 2 - 4} ${dessin.hauteur / 2 + 1}) rotate(-90)`"
        text-anchor="middle"
      >
        {{ formaterMillimetres(props.emballe.w) }} mm
      </text>
      <!-- Cote de la longueur, en bas. -->
      <line
        class="apercu__cote"
        :x1="MARGE"
        :y1="dessin.hauteur + MARGE / 2"
        :x2="MARGE + dessin.largeur"
        :y2="dessin.hauteur + MARGE / 2"
      />
      <text
        class="apercu__valeur"
        :x="MARGE + dessin.largeur / 2"
        :y="dessin.hauteur + MARGE / 2 + 12"
        text-anchor="middle"
      >
        {{ formaterMillimetres(props.emballe.l) }} mm
      </text>
    </svg>
    <ul class="apercu__legende">
      <li><span class="apercu__pastille" aria-hidden="true" />{{ textes.ficheArticle.emballe }}</li>
      <li v-if="props.nu">
        <span class="apercu__pastille apercu__pastille--nu" aria-hidden="true" />
        {{ textes.ficheArticle.nu }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.apercu {
  display: flex;
  flex-direction: column;
  gap: var(--espace-3);
  align-items: center;
}

.apercu__emballe {
  fill: var(--camion-fond);
  stroke: var(--camion-contour);
  stroke-width: 2;
}

.apercu__nu {
  fill: none;
  stroke: var(--texte-doux);
  stroke-dasharray: 4 3;
  stroke-width: 1.5;
}

.apercu__cote {
  stroke: var(--cote);
  stroke-width: 1;
}

.apercu__valeur {
  font: var(--typo-repere);
  fill: var(--texte-fort);
  paint-order: stroke;
  stroke: var(--surface);
  stroke-width: 4;
}

.apercu__legende {
  display: flex;
  gap: var(--espace-4);
  align-self: flex-start;
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
