import { createRouter, createWebHistory } from 'vue-router'
import PageAccueil from '@/pages/PageAccueil.vue'

/** Une route par page de l'arborescence (cahier fonctionnel). */
export const routeur = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [{ path: '/', name: 'accueil', component: PageAccueil }],
})
