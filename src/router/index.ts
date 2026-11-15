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
  { path: '/camions', name: 'camions', component: () => import('@/pages/PageCamions.vue') },
  {
    path: '/camions/nouveau',
    name: 'nouveau-camion',
    component: () => import('@/pages/PageFicheCamion.vue'),
  },
  {
    path: '/camions/:id',
    name: 'fiche-camion',
    component: () => import('@/pages/PageFicheCamion.vue'),
    props: true,
  },
  // Tournées et commandes (étape 9).
  {
    path: '/tournees/:id',
    name: 'preparation',
    component: () => import('@/pages/PagePreparation.vue'),
    props: true,
  },
  // Plan de chargement (étape 10).
  {
    path: '/tournees/:id/plan',
    name: 'plan',
    component: () => import('@/pages/PagePlan.vue'),
    props: true,
  },
  {
    path: '/tournees/:tourneeId/commandes/nouvelle',
    name: 'nouvelle-commande',
    component: () => import('@/pages/PageSaisieExpress.vue'),
    props: true,
  },
  {
    path: '/tournees/:tourneeId/commandes/:commandeId',
    name: 'commande',
    component: () => import('@/pages/PageSaisieExpress.vue'),
    props: true,
  },
  {
    path: '/attente',
    name: 'attente',
    component: () => import('@/pages/PageAttente.vue'),
    // `?tournee=<id>` : la tournée proposée d'avance pour l'affectation.
    props: (route) => ({
      tournee: typeof route.query.tournee === 'string' ? route.query.tournee : undefined,
    }),
  },
  // Vitrine des composants de base (étape 7), hors navigation ; chargée à la demande.
  { path: '/vitrine', name: 'vitrine', component: () => import('@/pages/PageVitrine.vue') },
]

export const routeur = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})
