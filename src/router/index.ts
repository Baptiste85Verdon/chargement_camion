import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import PageAccueil from '@/pages/PageAccueil.vue'

/** Une route par page de l'arborescence (cahier fonctionnel). */
export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'accueil', component: PageAccueil },
  // Référentiels (étape 8) : chargés à la demande, au premier passage.
  { path: '/catalogue', name: 'catalogue', component: () => import('@/pages/PageCatalogue.vue') },
  {
    path: '/catalogue/nouveau',
    name: 'nouvel-article',
    component: () => import('@/pages/PageFicheArticle.vue'),
  },
  {
    path: '/catalogue/:id',
    name: 'fiche-article',
    component: () => import('@/pages/PageFicheArticle.vue'),
    props: true,
  },
  // Vitrine des composants de base (étape 7), hors navigation ; chargée à la demande.
  { path: '/vitrine', name: 'vitrine', component: () => import('@/pages/PageVitrine.vue') },
]

export const routeur = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})
