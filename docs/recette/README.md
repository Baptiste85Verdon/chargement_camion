# Recette du prototype 1

Captures de l'application prises à la recette du prototype 1 (étape 11), le 17 novembre 2026, à comparer aux captures de la maquette (`docs/maquettes/captures/`, même code d'écran).

- Format : 1440 px de large, pleine page, navigateur Chromium en français.
- Données : la base d'exemple (`supabase/seed.sql`), en mémoire (`VITE_DONNEES=memoire`). La base d'exemple n'a pas de ville pour les commandes de T-2026-118 : elles n'apparaissent donc pas, contrairement à la maquette.
- Captures prises après les corrections de la recette : navigation, cotes du plan, recherche de la saisie express, dates en toutes lettres.

## Index

| Code | Capture | État affiché |
| --- | --- | --- |
| 01 | `captures/01-accueil.png` | Accueil, liste des tournées |
| 02 | `captures/02-preparation.png` | Préparation de T-2026-118 |
| 02e | `captures/02e-preparation-erreurs.png` | Nouvelle tournée, « Lancer le calcul » sans rien remplir |
| 03 | `captures/03-saisie-express.png` | Nouvelle commande, deux articles ajoutés |
| 03b | `captures/03b-saisie-express-poids-estime.png` | Commande C1, dimensions propres et poids estimé |
| 03e | `captures/03e-saisie-express-erreurs.png` | Nouvelle commande enregistrée vide |
| 04 | `captures/04-plan-couloirs.png` | Plan calculé de T-2026-118, A03 sélectionné |
| 04b | `captures/04b-plan-depassement.png` | T-2026-118 avec 8 palettes de tuiles en plus : dépassement |
| 04c | `captures/04c-plan-par-etape.png` | Vue par étape, étape 5 sur 12 |
| 04d | `captures/04d-plan-filtre-profondeur.png` | Côté gauche limité à 0 à 1 000 mm de profondeur |
| 04e | `captures/04e-plan-commande-en-evidence.png` | C2 mise en évidence |
| 07 | `captures/07-catalogue.png` | Catalogue des articles |
| 08 | `captures/08-fiche-article.png` | Fiche de la fenêtre cintrée |
| 08e | `captures/08e-fiche-article-erreurs.png` | Nouvel article enregistré vide |
| 09 | `captures/09-camions.png` | Modèles de camions |
| 09b | `captures/09b-fiche-camion.png` | Fiche du Porteur 7,2 m |
| 09e | `captures/09e-fiche-camion-erreurs.png` | Nouveau modèle enregistré vide |
| 10 | `captures/10-liste-attente.png` | Liste d'attente |

La capture 04a (« fenêtres isolées ») n'a pas d'équivalent : ce jeu d'essai n'est pas saisi dans la base d'exemple. Le validateur le vérifie dans les tests (`validateur.test.ts`).

## Écarts relevés

Corrigés pendant la recette :

- l'onglet de la section n'était pas actif sur ses sous-pages (fiche, préparation, saisie express, plan) ;
- sur le plan, la cote « distance au fond » de l'article sélectionné passait sur le libellé des articles voisins ;
- la recherche de la saisie express gardait son texte après Entrée, et son anneau de focus était coupé ;
- la saisie express défilait sur environ 700 px vides sous le formulaire ;
- les dates de report, d'archivage et de calcul s'écrivaient « 02/11/2026 ».

Gardés tels quels, notés dans les écarts connus de `docs/maquettes/README.md` : le logo absent, le camion trop chargé (04b), les cartes de camion sur deux lignes (02), l'unité et la pose dans les lignes de commande (03b).

Écarts attendus, qui relèvent des prototypes suivants : « Raccourcis clavier », « Passer en mode quai », Aimantation, et « Choisir », « Placer » et « Tout placer » dans les articles à placer. Le plan de « couloirs » diffère de celui de la maquette (58 / 42 au pire moment, contre 59 / 41) : c'est connu depuis l'étape 4c.
