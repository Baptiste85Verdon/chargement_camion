<script setup lang="ts">
/**
 * Plan coté d'une vue de la caisse (captures 09b et 09e ; charte, « Plan coté »).
 *
 * Le SVG a un `viewBox` en millimètres : la caisse y est dessinée à ses
 * vraies dimensions et le navigateur la met à l'échelle de la page. Les
 * traits gardent leur épaisseur grâce à `vector-effect: non-scaling-stroke`.
 * Les textes (repères Fond et Portes, cotes) sont en HTML autour du dessin,
 * donc toujours à taille lisible, quelle que soit l'échelle.
 *
 * Quadrillage de 1 m. Vue de côté : le plancher est un trait plus épais.
 * Une dimension illisible (pendant la saisie) est dessinée à 1 000 mm et sa
 * cote affiche « — ».
 */
import { computed } from 'vue'
import { textes } from '@/textes/fr'
import { formaterMillimetres } from './format'

const props = withDefaults(
  defineProps<{
    titre: string
    /** Longueur, du fond vers les portes (x). */
    longueur: number | null
    /** Largeur (vue de dessus) ou hauteur (vue de côté). */
    travers: number | null
    plancher?: boolean
  }>(),
  { plancher: false },
)

const PAR_DEFAUT = 1000
const PAS = 1000

const l = computed(() => props.longueur ?? PAR_DEFAUT)
const w = computed(() => props.travers ?? PAR_DEFAUT)
/** Proportions du dessin (CSS `aspect-ratio`) : la hauteur suit la largeur disponible. */
const proportions = computed(() => `${l.value} / ${w.value}`)

/** Lignes du quadrillage, tous les mètres, sans les bords. */
const verticales = computed(() =>
  Array.from({ length: Math.ceil(l.value / PAS) - 1 }, (_, i) => (i + 1) * PAS),
)
const horizontales = computed(() =>
  Array.from({ length: Math.ceil(w.value / PAS) - 1 }, (_, i) => (i + 1) * PAS),
)

const cote = (valeur: number | null) =>
  valeur === null ? textes.referentiels.aucun : textes.ficheCamion.cote(formaterMillimetres(valeur))

const description = computed(() =>
  textes.ficheCamion.descriptionPlan(props.titre, cote(props.longueur), cote(props.travers)),
)
</script>

<template>
  <figure class="plan">
    <figcaption class="plan__titre">{{ props.titre }}</figcaption>
    <div class="plan__grille">
      <div class="plan__reperes" aria-hidden="true">
        <span>{{ textes.ficheCamion.fond }}</span>
        <span>{{ textes.ficheCamion.portes }}</span>
      </div>
      <div class="plan__cote-verticale" aria-hidden="true">
        <span class="plan__valeur">{{ cote(props.travers) }}</span>
      </div>
      <svg
        class="plan__dessin"
        :viewBox="`0 0 ${l} ${w}`"
        preserveAspectRatio="none"
        role="img"
        :aria-label="description"
      >
        <rect class="plan__caisse" x="0" y="0" :width="l" :height="w" />
        <line
          v-for="x in verticales"
          :key="`v${x}`"
          class="plan__quadrillage"
          :x1="x"
          y1="0"
          :x2="x"
          :y2="w"
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
        <rect class="plan__contour" x="0" y="0" :width="l" :height="w" />
        <line v-if="props.plancher" class="plan__plancher" x1="0" :y1="w" :x2="l" :y2="w" />
      </svg>
      <div class="plan__cote-horizontale" aria-hidden="true">
        <span class="plan__valeur">{{ cote(props.longueur) }}</span>
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
  grid-template-columns: var(--espace-7) minmax(0, 1fr);
  grid-template-areas:
    '. reperes'
    'verticale dessin'
    '. horizontale';
  row-gap: var(--espace-2);
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

.plan__caisse {
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

/* Lignes de cote : trait `cote` de 1 px, petites flèches aux deux bouts. */
.plan__cote-verticale,
.plan__cote-horizontale {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.plan__cote-verticale {
  grid-area: verticale;
}

.plan__cote-horizontale {
  grid-area: horizontale;
  height: var(--espace-5);
}

.plan__cote-verticale::before,
.plan__cote-horizontale::before {
  position: absolute;
  content: '';
  background: var(--cote);
}

.plan__cote-verticale::before {
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
}

.plan__cote-horizontale::before {
  top: 50%;
  right: 0;
  left: 0;
  height: 1px;
}

.plan__valeur {
  position: relative;
  padding: 0 var(--espace-1);
  font: var(--typo-repere);
  color: var(--texte-fort);
  white-space: nowrap;
  background: var(--surface);
}

.plan__cote-verticale .plan__valeur {
  padding: var(--espace-1) 0;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
}
</style>
