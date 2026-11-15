<script setup lang="ts">
/**
 * Plan coté d'un rectangle : une vue de la caisse d'un camion (fiche camion)
 * ou une face d'un article (aperçu de la fiche article). Charte, « Plan coté ».
 *
 * - Le SVG a un `viewBox` en millimètres : le rectangle y est dessiné à ses
 *   vraies dimensions, et le navigateur le met à l'échelle de la page. Les
 *   traits gardent leur épaisseur (`vector-effect: non-scaling-stroke`).
 * - Les textes (repères, cotes) sont en HTML autour du dessin : ils restent
 *   lisibles à toute échelle. Cote horizontale dessous, verticale à gauche,
 *   avec des flèches aux extrémités (`LigneCote`).
 * - `hauteurMax`, en multiples de `espace-7` (32 px), borne la hauteur d'un
 *   dessin plus haut que large ; un dessin allongé prend toute la largeur.
 * - Une dimension illisible (pendant la saisie) est dessinée à 1 000 mm, et
 *   sa cote affiche « — ».
 * - L'emplacement par défaut ajoute des formes au dessin, en millimètres
 *   (la taille nue d'un article).
 */
import { computed } from 'vue'
import { textes } from '@/textes/fr'
import LigneCote from './LigneCote.vue'
import { formaterMillimetres } from './format'

const props = withDefaults(
  defineProps<{
    titre: string
    /** Dimension horizontale, en millimètres. */
    largeur: number | null
    /** Dimension verticale, en millimètres. */
    hauteur: number | null
    /** Nom accessible du dessin, qui redit les dimensions en texte. */
    description: string
    /** Repères au-dessus du dessin, à gauche et à droite (« Fond », « Portes »). */
    reperes?: [string, string]
    quadrillage?: boolean
    /** Vue de côté de la caisse : le plancher est un trait épais. */
    plancher?: boolean
    hauteurMax?: number
  }>(),
  { reperes: undefined, quadrillage: false, plancher: false, hauteurMax: 8 },
)

const PAR_DEFAUT = 1000
const PAS = 1000

const l = computed(() => props.largeur ?? PAR_DEFAUT)
const h = computed(() => props.hauteur ?? PAR_DEFAUT)

/** Largeur du dessin : toute la place, sauf si sa hauteur dépasse `hauteurMax`. */
const largeurDessin = computed(
  () =>
    `min(calc(100% - var(--espace-6) - var(--espace-2)), calc(var(--espace-7) * ${props.hauteurMax} * ${l.value} / ${h.value}))`,
)
const proportions = computed(() => `${l.value} / ${h.value}`)

/** Lignes du quadrillage, tous les mètres, sans les bords. */
const verticales = computed(() =>
  props.quadrillage
    ? Array.from({ length: Math.ceil(l.value / PAS) - 1 }, (_, i) => (i + 1) * PAS)
    : [],
)
const horizontales = computed(() =>
  props.quadrillage
    ? Array.from({ length: Math.ceil(h.value / PAS) - 1 }, (_, i) => (i + 1) * PAS)
    : [],
)

const cote = (valeur: number | null) =>
  valeur === null ? textes.referentiels.aucun : `${formaterMillimetres(valeur)} mm`
</script>

<template>
  <figure class="plan">
    <figcaption class="plan__titre">{{ props.titre }}</figcaption>
    <div class="plan__grille">
      <div v-if="props.reperes" class="plan__reperes" aria-hidden="true">
        <span>{{ props.reperes[0] }}</span>
        <span>{{ props.reperes[1] }}</span>
      </div>
      <div class="plan__cote-verticale">
        <LigneCote :valeur="cote(props.hauteur)" sens="vertical" />
      </div>
      <svg
        class="plan__dessin"
        :viewBox="`0 0 ${l} ${h}`"
        preserveAspectRatio="none"
        role="img"
        :aria-label="props.description"
      >
        <rect class="plan__fond" x="0" y="0" :width="l" :height="h" />
        <line
          v-for="x in verticales"
          :key="`v${x}`"
          class="plan__quadrillage"
          :x1="x"
          y1="0"
          :x2="x"
          :y2="h"
        />
        <line
          v-for="y in horizontales"
          :key="`h${y}`"
          class="plan__quadrillage"
          x1="0"
          :y1="y"
          :x2="l"
          :y2="y"
        />
        <slot />
        <rect class="plan__contour" x="0" y="0" :width="l" :height="h" />
        <line v-if="props.plancher" class="plan__plancher" x1="0" :y1="h" :x2="l" :y2="h" />
      </svg>
      <div class="plan__cote-horizontale">
        <LigneCote :valeur="cote(props.largeur)" />
      </div>
    </div>
  </figure>
</template>

<style scoped>
.plan {
  margin: 0;
}

.plan__titre {
  margin-bottom: var(--espace-3);
  font: var(--typo-legende);
  color: var(--texte-doux);
}

/* Cote verticale à gauche, dessin à droite ; repères au-dessus, cote horizontale dessous. */
.plan__grille {
  display: grid;
  grid-template-areas:
    '. reperes'
    'verticale dessin'
    '. horizontale';
  grid-template-columns: var(--espace-6) v-bind('largeurDessin');
  gap: var(--espace-1) var(--espace-2);
}

.plan__reperes {
  display: flex;
  grid-area: reperes;
  justify-content: space-between;
  font: var(--typo-repere);
  color: var(--texte-fort);
}

.plan__dessin {
  grid-area: dessin;
  width: 100%;
  height: auto;
  aspect-ratio: v-bind(proportions);
}

.plan__fond {
  fill: var(--camion-fond);
}

.plan__quadrillage {
  stroke: var(--camion-grille);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.plan__contour {
  fill: none;
  stroke: var(--camion-contour);
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}

.plan__plancher {
  stroke: var(--camion-contour);
  stroke-width: 6;
  vector-effect: non-scaling-stroke;
}

/*
 * La cote verticale prend exactement la hauteur du dessin (position
 * absolue : elle ne grandit pas la rangée). Sur un dessin très plat (une
 * fenêtre vue de face), sa valeur dépasse en haut et en bas, sur fond blanc.
 */
.plan__cote-verticale {
  position: relative;
  grid-area: verticale;
}

.plan__cote-verticale > * {
  position: absolute;
  inset: 0;
}

.plan__cote-horizontale {
  grid-area: horizontale;
}
</style>
