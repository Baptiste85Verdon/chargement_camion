<script lang="ts">
/**
 * Tracés des icônes, recopiés de Lucide (https://lucide.dev, licence ISC,
 * © Lucide Contributors). On ne garde que ceux dont l'application a besoin :
 * ajoutez un tracé ici quand un écran en demande un nouveau.
 * Chaque élément est une balise SVG et ses attributs, dans une grille de 24.
 */
type Trace = { balise: 'path' | 'circle' | 'rect' | 'line'; attributs: Record<string, string> }

const chemin = (d: string): Trace => ({ balise: 'path', attributs: { d } })
const cercleExterieur: Trace = { balise: 'circle', attributs: { cx: '12', cy: '12', r: '10' } }

const TRACES = {
  /** Triangle d'alerte : avertissements, articles cachés, mal calés. */
  alerte: [
    chemin('m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3'),
    chemin('M12 9v4'),
    chemin('M12 17h.01'),
  ],
  /** Cercle avec point d'exclamation : erreurs à corriger. */
  erreur: [cercleExterieur, chemin('M12 8v4'), chemin('M12 16h.01')],
  info: [cercleExterieur, chemin('M12 16v-4'), chemin('M12 8h.01')],
  coche: [chemin('M20 6 9 17l-5-5')],
  'chevron-droite': [chemin('m9 18 6-6-6-6')],
  'chevron-bas': [chemin('m6 9 6 6 6-6')],
  'chevron-haut': [chemin('m18 15-6-6-6 6')],
  /** Corbeille : retirer une ligne, supprimer un élément en attente. */
  corbeille: [
    chemin('M3 6h18'),
    chemin('M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6'),
    chemin('M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2'),
  ],
  fermer: [chemin('M18 6 6 18'), chemin('m6 6 12 12')],
  plus: [chemin('M5 12h14'), chemin('M12 5v14')],
  /** Tri des tableaux : colonne triable, tri croissant, tri décroissant. */
  'tri-possible': [chemin('m7 15 5 5 5-5'), chemin('m7 9 5-5 5 5')],
  'tri-croissant': [chemin('m5 12 7-7 7 7'), chemin('M12 19V5')],
  'tri-decroissant': [chemin('M12 5v14'), chemin('m19 12-7 7-7-7')],
  /** Crayon : modifications non enregistrées. */
  crayon: [
    chemin(
      'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z',
    ),
    chemin('m15 5 4 4'),
  ],
  /** Loupe : champ de recherche du catalogue. */
  recherche: [
    { balise: 'circle', attributs: { cx: '11', cy: '11', r: '8' } },
    chemin('m21 21-4.3-4.3'),
  ],
  moins: [chemin('M5 12h14')],
  clavier: [
    { balise: 'rect', attributs: { width: '20', height: '16', x: '2', y: '4', rx: '2' } },
    chemin('M6 8h.01'),
    chemin('M10 8h.01'),
    chemin('M14 8h.01'),
    chemin('M18 8h.01'),
    chemin('M8 12h.01'),
    chemin('M12 12h.01'),
    chemin('M16 12h.01'),
    chemin('M7 16h10'),
  ],
} satisfies Record<string, Trace[]>

export type NomIcone = keyof typeof TRACES
</script>

<script setup lang="ts">
/**
 * Icône au trait, de la couleur du texte voisin (charte, « Iconographie »).
 * Décorative : elle est cachée des lecteurs d'écran, le texte qui l'accompagne
 * porte le sens. Pour un bouton sans texte, c'est le bouton qui porte le nom.
 */
const props = withDefaults(defineProps<{ nom: NomIcone; taille?: 20 | 24 | 16 }>(), {
  taille: 20,
})
</script>

<template>
  <svg
    class="icone"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    :width="props.taille"
    :height="props.taille"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <component
      :is="trace.balise"
      v-for="(trace, index) in TRACES[props.nom]"
      :key="index"
      v-bind="trace.attributs"
    />
  </svg>
</template>

<style scoped>
.icone {
  flex: none;
}
</style>
