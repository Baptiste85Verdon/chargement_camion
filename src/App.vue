<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { textes } from '@/textes/fr'

/**
 * Entrées de la navigation principale (captures 01, 07, 09). La liste
 * d'attente arrivera avec sa page (étape 9).
 * `exact` : « Tournées » n'est active que sur l'accueil, pas sur toutes les pages.
 */
const entrees = [
  { libelle: textes.navigation.tournees, vers: '/', exact: true },
  { libelle: textes.navigation.catalogue, vers: '/catalogue', exact: false },
  { libelle: textes.navigation.camions, vers: '/camions', exact: false },
]
</script>

<template>
  <header class="entete">
    <span class="entete__nom">{{ textes.application.nom }}</span>
    <nav class="entete__navigation" :aria-label="textes.navigation.nom">
      <ul class="navigation">
        <li v-for="entree in entrees" :key="entree.vers">
          <RouterLink
            :to="entree.vers"
            class="navigation__lien"
            :active-class="entree.exact ? '' : 'navigation__lien--active'"
            :exact-active-class="'navigation__lien--active'"
          >
            {{ entree.libelle }}
          </RouterLink>
        </li>
      </ul>
    </nav>
    <span class="entete__societe">{{ textes.application.societe }}</span>
  </header>
  <main class="contenu">
    <!--
      La clé recrée la page quand le chemin change : passer de « Nouvel
      article » à la fiche enregistrée repart d'un état propre.
    -->
    <RouterView v-slot="{ Component, route }">
      <component :is="Component" :key="route.path" />
    </RouterView>
  </main>
</template>

<style scoped>
.entete {
  display: flex;
  gap: var(--espace-7);
  align-items: stretch;
  min-height: var(--cible-principale);
  padding: 0 var(--espace-7);
  background: var(--surface);
  border-bottom: 1px solid var(--bordure);
}

.entete__nom {
  align-self: center;
  font: var(--typo-titre-section);
}

.entete__navigation {
  display: flex;
  flex: 1;
}

.navigation {
  display: flex;
  gap: var(--espace-2);
  padding: 0;
  margin: 0;
  list-style: none;
}

.navigation li {
  display: flex;
}

/* Lien actif : texte appuyé et trait `encre` en bas, pas seulement une couleur. */
.navigation__lien {
  display: flex;
  align-items: center;
  padding: var(--espace-3) var(--espace-3);
  font: var(--typo-bouton);
  color: var(--texte-fort);
  text-decoration: none;
  border-bottom: 2px solid transparent;
}

.navigation__lien:hover {
  color: var(--encre);
  background: var(--surface-survol);
}

.navigation__lien--active {
  color: var(--encre);
  border-bottom-color: var(--encre);
}

.entete__societe {
  align-self: center;
  font: var(--typo-legende);
  color: var(--texte-doux);
}

.contenu {
  padding: var(--espace-6) var(--espace-7);
}
</style>
