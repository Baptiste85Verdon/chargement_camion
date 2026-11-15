<script setup lang="ts" generic="T">
/**
 * Tableau de données triable par colonne, utilisé par tous les tableaux de
 * l'application (catalogue, modèles de camions, éléments archivés).
 *
 * Tri :
 * - chaque en-tête triable contient un vrai bouton : il se déclenche à la
 *   souris, à la touche Entrée ou Espace, et le lecteur d'écran l'annonce ;
 * - la colonne triée porte `aria-sort` (« ascending » ou « descending ») ;
 *   les autres n'en portent pas, comme le recommande l'ARIA ;
 * - une flèche montre le sens ; la couleur n'est jamais seule ;
 * - clics successifs sur un en-tête : croissant, décroissant, puis retour au
 *   tri de départ (`triDepart`) ;
 * - le tri est stable : sans tri choisi, ou entre deux lignes égales, l'ordre
 *   reçu est gardé (le catalogue arrive rangé par famille).
 *
 * Lignes qui ouvrent une fiche (`lien`) :
 * - le nom de l'élément (colonne `enteteLigne`) est un lien vers sa fiche,
 *   couleur `action`, souligné au survol et au focus ;
 * - ce lien est « étiré » sur toute la ligne (un pseudo-élément qui la
 *   couvre) : un clic n'importe où sur la ligne l'ouvre, mais il n'y a qu'un
 *   lien par ligne pour le clavier et les lecteurs d'écran ;
 * - un chevron en fin de ligne dit qu'elle ouvre une fiche ; il est
 *   décoratif (l'icône est `aria-hidden`) ;
 * - les autres boutons et liens de la ligne passent au-dessus du lien étiré
 *   et restent cliquables seuls (« Réactiver »).
 *
 * Le contenu de chaque cellule vient d'un emplacement nommé
 * `#<cle>="{ ligne }"` ; sans emplacement, la valeur de tri est affichée.
 */
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import { textes } from '@/textes/fr'
import Icone from './Icone.vue'
import { sensSuivant, trierLignes, type EtatTri, type ValeurTri } from './tri'

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
    /** Tri de départ, rétabli au troisième clic ; `null` : l'ordre reçu. */
    triDepart?: EtatTri | null
    /** Fiche ouverte par la ligne ; le nom (`enteteLigne`) en devient le lien. */
    lien?: (ligne: T) => RouteLocationRaw
  }>(),
  { enteteLigne: undefined, triDepart: null, lien: undefined },
)

/** Tri choisi ; `null` pour l'ordre reçu. La page peut fixer un tri par défaut. */
const tri = defineModel<EtatTri | null>('tri', { default: null })

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
        <!-- Colonne du chevron : seulement pour les lignes qui ouvrent une fiche. -->
        <th v-if="props.lien" scope="col" class="tableau__chevron">
          <span class="visuellement-cache">{{ textes.tableau.fiche }}</span>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="ligne in lignesTriees"
        :key="props.cleLigne(ligne)"
        :class="{ 'tableau__ligne--lien': props.lien }"
      >
        <template v-for="colonne in props.colonnes" :key="colonne.cle">
          <th
            v-if="colonne.cle === props.enteteLigne"
            scope="row"
            :class="[colonne.classe, { nombre: colonne.nombre }]"
          >
            <RouterLink v-if="props.lien" :to="props.lien(ligne)" class="tableau__lien">
              <slot :name="colonne.cle" :ligne="ligne">{{ colonne.valeur?.(ligne) }}</slot>
            </RouterLink>
            <slot v-else :name="colonne.cle" :ligne="ligne">{{ colonne.valeur?.(ligne) }}</slot>
          </th>
          <td v-else :class="[colonne.classe, { nombre: colonne.nombre }]">
            <slot :name="colonne.cle" :ligne="ligne">{{ colonne.valeur?.(ligne) }}</slot>
          </td>
        </template>
        <td v-if="props.lien" class="tableau__chevron">
          <Icone nom="chevron-droite" :taille="16" />
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
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

/* --- Lignes qui ouvrent une fiche ------------------------------------------ */

/* La ligne sert de repère au lien étiré (position absolue ci-dessous). */
.tableau__ligne--lien {
  position: relative;
  cursor: pointer;
}

.tableau__ligne--lien:hover,
.tableau__ligne--lien:focus-within {
  background: var(--surface-survol);
}

.tableau__lien {
  font: var(--typo-bouton);
  color: var(--action);
  text-decoration: none;
}

.tableau__lien:hover,
.tableau__lien:focus-visible,
.tableau__ligne--lien:hover .tableau__lien {
  color: var(--action-fonce);
  text-decoration: underline;
}

/* Le lien étiré : un pseudo-élément qui couvre toute la ligne. */
.tableau__lien::after {
  position: absolute;
  inset: 0;
  content: '';
}

/* Les autres boutons et liens de la ligne passent au-dessus et restent cliquables seuls. */
.tableau__ligne--lien :deep(button),
.tableau__ligne--lien :deep(a:not(.tableau__lien)) {
  position: relative;
  z-index: 1;
}

.tableau__chevron {
  width: var(--espace-6);
  color: var(--texte-doux);
  text-align: right;
}

.tableau__ligne--lien:hover .tableau__chevron {
  color: var(--action);
}
</style>
