<script setup lang="ts">
/**
 * Carte « Équilibre de la charge » (RG-20 ; cahier technique 5.17 ;
 * captures 04, 04a, 04b).
 *
 * Elle lit la mesure de `mesurerEquilibre` et la montre de trois façons :
 * - le statut du pire moment, en texte et icône (coche ou triangle), avec le
 *   contour `alerte-bordure` quand il est « À surveiller » ou « Déséquilibré » ;
 * - la jauge gauche / droite au départ, avec les pourcentages et les tonnes ;
 * - le tableau repliable « Au fil de la tournée » : départ, puis après chaque
 *   livraison.
 *
 * Un plan vide n'a aucune étape mesurée : la carte dit « Aucun article », sans
 * statut, jauge ni tableau. Le statut « Équilibré » d'un camion vide
 * tromperait l'opérateur.
 */
import { computed } from 'vue'
import {
  type EtapeEquilibre,
  type MesureEquilibre,
  pourcentagesAffiches,
} from '@/domaine/equilibre'
import { textes } from '@/textes/fr'
import Carte from './Carte.vue'
import Icone from './Icone.vue'

const props = defineProps<{
  mesure: MesureEquilibre
  /** Largeur de la caisse, en mm : l'axe est à la moitié. */
  largeur: number
}>()

const t = textes.plan.equilibre

const uneDecimale = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})
const deuxDecimales = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Le côté le plus chargé d'une étape, en pourcentage affiché. */
const plusFort = (e: EtapeEquilibre) => Math.max(...pourcentagesAffiches(e.partGauche))

/** Une étape lue comme le tableau l'affiche. */
function ligne(e: EtapeEquilibre) {
  const [gauche, droite] = pourcentagesAffiches(e.partGauche)
  // Les tonnes sont arrondies séparément (cahier technique 4.5).
  const tonnes = (part: number) => uneDecimale.format((e.poids * part) / 1000)
  return {
    moment: e.apres === null ? t.depart : t.apres(`C${e.apres}`),
    gauche,
    droite,
    texteGauche: t.part(gauche, tonnes(e.partGauche)),
    texteDroite: t.part(droite, tonnes(1 - e.partGauche)),
  }
}

const depart = computed(() => props.mesure.etapes[0])
const lignes = computed(() => props.mesure.etapes.map(ligne))
const alerte = computed(() => props.mesure.statut !== 'equilibre')

/** « pire moment 59 / 41, après C1 et C2 » : toutes les étapes qui atteignent le pire. */
const pireMoment = computed(() => {
  const etapes = props.mesure.etapes
  if (etapes.length === 0) return ''
  const pire = Math.max(...etapes.map(plusFort))
  const atteintes = etapes.filter((e) => plusFort(e) === pire)
  const premiere = atteintes[0]
  if (!premiere) return ''
  const [gauche, droite] = pourcentagesAffiches(premiere.partGauche)
  const codes = atteintes.flatMap((e) => (e.apres === null ? [] : [`C${e.apres}`]))
  const moments = [
    atteintes.some((e) => e.apres === null) ? t.auDepart : '',
    codes.length ? t.apresCodes(codes.join(' et ')) : '',
  ].filter(Boolean)
  return t.pireMoment(gauche, droite, moments.join(' et '))
})

/** « Au départ, centre de gravité à 2,22 m du fond et à 12 cm à gauche de l'axe. » */
const centre = computed(() => {
  const e = depart.value
  if (!e) return ''
  const ecartCm = Math.round((props.largeur / 2 - e.cgY) / 10)
  const decalage = ecartCm > 0 ? t.aGauche(ecartCm) : ecartCm < 0 ? t.aDroite(-ecartCm) : t.dansAxe
  return t.centre(deuxDecimales.format(e.cgX / 1000), decalage)
})
</script>

<template>
  <Carte :titre="t.titre" class="equilibre" :class="{ 'equilibre--alerte': alerte && depart }">
    <template #actions>
      <span class="equilibre__regle donnees">{{ t.regle }}</span>
    </template>

    <template v-if="!depart">
      <p class="equilibre__vide">{{ t.vide }}</p>
      <p class="equilibre__note">{{ t.videAide }}</p>
    </template>

    <template v-else>
      <p class="equilibre__statut" :class="{ 'equilibre__statut--alerte': alerte }">
        <Icone :nom="alerte ? 'alerte' : 'coche'" />
        {{ t.statuts[props.mesure.statut] }}
      </p>
      <p class="equilibre__note">{{ pireMoment }}</p>

      <div class="equilibre__libelles" aria-hidden="true">
        <span>{{ t.gauche }}</span>
        <span>{{ t.depart }}</span>
        <span>{{ t.droite }}</span>
      </div>
      <div
        class="jauge"
        role="img"
        :aria-label="t.jauge(lignes[0]?.gauche ?? 0, lignes[0]?.droite ?? 0)"
      >
        <span class="jauge__gauche" :style="{ width: `${lignes[0]?.gauche ?? 0}%` }" />
        <span class="jauge__axe" />
      </div>
      <div class="equilibre__parts donnees">
        <span>{{ lignes[0]?.texteGauche }}</span>
        <span>{{ lignes[0]?.texteDroite }}</span>
      </div>
      <p class="equilibre__note">{{ centre }}</p>

      <details class="equilibre__fil">
        <summary>{{ t.auFil }}</summary>
        <table class="tableau">
          <thead>
            <tr>
              <th scope="col">{{ t.colonnes.moment }}</th>
              <th scope="col" class="nombre">{{ t.colonnes.gauche }}</th>
              <th scope="col" class="nombre">{{ t.colonnes.droite }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in lignes" :key="l.moment">
              <th scope="row">{{ l.moment }}</th>
              <td class="donnees nombre">{{ l.texteGauche }}</td>
              <td class="donnees nombre">{{ l.texteDroite }}</td>
            </tr>
          </tbody>
        </table>
      </details>
    </template>
  </Carte>
</template>

<style scoped>
.equilibre--alerte {
  border-color: var(--alerte-bordure);
}

.equilibre__regle {
  font: var(--typo-repere);
  color: var(--texte-doux);
}

.equilibre__statut {
  display: flex;
  gap: var(--espace-2);
  align-items: center;
  margin: 0 0 var(--espace-1);
  font: var(--typo-titre-article);
  color: var(--encre);
}

.equilibre__statut--alerte {
  color: var(--alerte-texte);
}

.equilibre__statut--alerte :deep(svg) {
  color: var(--alerte-icone);
}

.equilibre__vide {
  margin: 0 0 var(--espace-1);
  font: var(--typo-titre-article);
  color: var(--encre);
}

.equilibre__note {
  margin: 0 0 var(--espace-3);
  font: var(--typo-interface);
  color: var(--texte-doux);
}

.equilibre__libelles,
.equilibre__parts {
  display: flex;
  justify-content: space-between;
  font: var(--typo-legende);
  color: var(--texte-fort);
}

.equilibre__parts {
  margin: var(--espace-1) 0 var(--espace-3);
  font: var(--typo-repere);
  color: var(--encre);
}

/* Jauge en deux segments : `encre` à gauche, `surface` à droite, contour `bordure-forte`. */
.jauge {
  position: relative;
  height: var(--espace-4);
  margin-top: var(--espace-1);
  background: var(--surface);
  border: 1px solid var(--bordure-forte);
  border-radius: var(--rayon-code);
}

.jauge__gauche {
  position: absolute;
  inset: 0 auto 0 0;
  background: var(--encre);
}

/* L'axe du camion, au milieu, en pointillés. */
.jauge__axe {
  position: absolute;
  inset: 0 auto 0 50%;
  border-left: 1px dashed var(--bordure-forte);
}

.equilibre__fil summary {
  min-height: var(--cible-compacte);
  font: var(--typo-interface);
  color: var(--action);
  cursor: pointer;
}

.equilibre__fil summary:hover {
  color: var(--action-fonce);
  text-decoration: underline;
}

.equilibre__fil .tableau {
  width: 100%;
  margin-top: var(--espace-2);
}
</style>
