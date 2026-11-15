<script setup lang="ts" generic="T">
/**
 * Tableau de données triable par colonne (catalogue, modèles de camions).
 *
 * - Chaque en-tête triable contient un vrai bouton : il se déclenche à la
 *   souris, à la touche Entrée ou Espace, et le lecteur d'écran l'annonce.
 * - La colonne triée porte `aria-sort` (« ascending » ou « descending ») ;
 *   les autres n'en portent pas, comme le recommande l'ARIA.
 * - Une flèche montre le sens ; la couleur n'est jamais seule.
 * - Le tri est stable : sans tri choisi, ou entre deux lignes égales, l'ordre
 *   reçu est gardé (le catalogue arrive rangé par famille).
 * - Clics successifs sur un en-tête : croissant, décroissant, puis retour au
 *   tri de départ (`triDepart`). Dès que le tri s'en écarte, un bouton
 *   « Rétablir l'ordre de départ » apparaît au-dessus du tableau.
 *
 * Le contenu de chaque cellule vient d'un emplacement nommé
 * `#<cle>="{ ligne }"` ; sans emplacement, la valeur de tri est affichée.
 */
import { computed } from 'vue'
import { textes } from '@/textes/fr'
import Icone from './Icone.vue'
import Bouton from './Bouton.vue'
import { estTriDepart, sensSuivant, trierLignes, type EtatTri, type ValeurTri } from './tri'

export interface ColonneTableau<L> {
  cle: string
  libelle: string
  /** Valeur de tri ; sans elle, la colonne n'est pas triable. */
  valeur?: (ligne: L) => ValeurTri
  /** Nombres alignés à droite. */
  nombre?: boolean
  /** Libellé lu seulement par les lecteurs d'écran (colonne d'actions). */
  libelleCache?: boolean
  /** Classe ajoutée aux cellules de la colonne (pas à l'en-tête) : `donnees`… */
  classe?: string
}

const props = withDefaults(
  defineProps<{
    colonnes: ColonneTableau<T>[]
    lignes: readonly T[]
    /** Identifiant stable d'une ligne, pour Vue (`:key`). */
    cleLigne: (ligne: T) => string
    legende: string
    /** Colonne dont les cellules sont des en-têtes de ligne (`<th scope="row">`). */
    enteteLigne?: string
    /** Tri de départ, rétabli au troisième clic ou par le bouton ; `null` : l'ordre reçu. */
    triDepart?: EtatTri | null
  }>(),
  { enteteLigne: undefined, triDepart: null },
)

/** Tri choisi ; `null` pour l'ordre reçu. La page peut fixer un tri par défaut. */
const tri = defineModel<EtatTri | null>('tri', { default: null })

const triModifie = computed(() => !estTriDepart(tri.value, props.triDepart))

function retablir() {
  tri.value = props.triDepart
}

const lignesTriees = computed(() => {
  const etat = tri.value
  const colonne = etat && props.colonnes.find((c) => c.cle === etat.cle)
  if (!etat || !colonne?.valeur) return props.lignes
  return trierLignes(props.lignes, colonne.valeur, etat.sens)
})

function trier(cle: string) {
  tri.value = sensSuivant(tri.value, cle, props.triDepart)
}

const ariaSort = (cle: string) =>
  tri.value?.cle === cle ? (tri.value.sens === 'croissant' ? 'ascending' : 'descending') : undefined

const icone = (cle: string) =>
  tri.value?.cle !== cle
    ? 'tri-possible'
    : tri.value.sens === 'croissant'
      ? 'tri-croissant'
      : 'tri-decroissant'
</script>

<template>
  <div v-if="triModifie" class="tableau-tri__barre">
    <Bouton variante="texte" taille="petite" @click="retablir">
      {{ textes.tableau.retablir }}
    </Bouton>
  </div>
  <table class="tableau">
    <caption class="visuellement-cache">
      {{
        props.legende
      }}
      <template v-if="tri">
        {{
          textes.tableau.trieePar(
            props.colonnes.find((c) => c.cle === tri?.cle)?.libelle ?? '',
            tri.sens,
          )
        }}
      </template>
    </caption>
    <thead>
      <tr>
        <th
          v-for="colonne in props.colonnes"
          :key="colonne.cle"
          scope="col"
          :class="{ nombre: colonne.nombre }"
          :aria-sort="colonne.valeur ? ariaSort(colonne.cle) : undefined"
        >
          <button
            v-if="colonne.valeur"
            type="button"
            class="tableau__tri"
            :class="{ 'tableau__tri--actif': tri?.cle === colonne.cle }"
            @click="trier(colonne.cle)"
          >
            {{ colonne.libelle }}
            <Icone :nom="icone(colonne.cle)" :taille="16" />
          </button>
          <span v-else :class="{ 'visuellement-cache': colonne.libelleCache }">
            {{ colonne.libelle }}
          </span>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="ligne in lignesTriees" :key="props.cleLigne(ligne)">
        <template v-for="colonne in props.colonnes" :key="colonne.cle">
          <th
            v-if="colonne.cle === props.enteteLigne"
            scope="row"
            :class="[colonne.classe, { nombre: colonne.nombre }]"
          >
            <slot :name="colonne.cle" :ligne="ligne">{{ colonne.valeur?.(ligne) }}</slot>
          </th>
          <td v-else :class="[colonne.classe, { nombre: colonne.nombre }]">
            <slot :name="colonne.cle" :ligne="ligne">{{ colonne.valeur?.(ligne) }}</slot>
          </td>
        </template>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.tableau-tri__barre {
  display: flex;
  justify-content: flex-end;
  padding: var(--espace-1) var(--espace-3) 0;
}

/* Le bouton de tri garde l'apparence de l'en-tête : il ne s'en distingue que par la flèche. */
.tableau__tri {
  display: inline-flex;
  gap: var(--espace-1);
  align-items: center;
  min-height: var(--espace-6);
  padding: 0;
  font: inherit;
  color: inherit;
  text-align: inherit;
  cursor: pointer;
  background: none;
  border: 0;
  border-radius: var(--rayon-code);
}

.tableau__tri:hover,
.tableau__tri--actif {
  color: var(--encre);
}

.tableau__tri .icone {
  color: var(--texte-doux);
}

.tableau__tri--actif .icone {
  color: var(--encre);
}

.nombre .tableau__tri {
  flex-direction: row-reverse;
}
</style>
