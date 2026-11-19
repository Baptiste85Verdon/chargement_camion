# Maquette de référence

Maquette cliquable réalisée avec Claude Design le 4 novembre 2026, validée comme référence visuelle de la V1. Elle applique le cahier fonctionnel V5.8, le cahier technique V3.8 et la charte V2.4.

## Contenu

- `Plan de chargement interactif.zip` : l'archive complète, cliquable. Décompressez-la et ouvrez `Maquette.dc.html` (vue d'ensemble) ou `Application.dc.html` dans un navigateur. Il faut une connexion Internet : React, Babel et les polices IBM Plex sont chargés en ligne.
- `captures/` : une capture pleine page de chaque écran et de chaque état, au format 1440 px de large (1194 px pour le mode quai, format tablette). **C'est la référence à utiliser pendant le développement** : Claude Code lit les images directement, sans rien installer.

Le code de la maquette est un prototype (React, données en dur) : il sert de référence visuelle et comportementale, **pas de code à reprendre**.

## Index des écrans

CF = cahier fonctionnel, CT = cahier technique, P1 à P4 = prototype concerné.

| Code | Capture | Écran ou état | Prototype | Référence |
| --- | --- | --- | --- | --- |
| 00 | — | Vue d'ensemble : ouvrir Maquette.dc.html dans l'archive | — | — |
| 01 | `captures/01-accueil.png` | Accueil · tournées | P1 | CF 4.1 |
| 02 | `captures/02-preparation.png` | Préparation d'une tournée | P1 | CF 4.2 |
| 02e | `captures/02e-preparation-erreurs.png` | Préparation · erreurs de saisie | P1 | RG-21 |
| 03 | `captures/03-saisie-express.png` | Saisie express · nouvelle commande | P1 | CF 4.3 |
| 03b | `captures/03b-saisie-express-poids-estime.png` | Saisie express · dimensions propres et poids estimé | P1 | RG-03 |
| 03e | `captures/03e-saisie-express-erreurs.png` | Saisie express · erreurs de saisie | P1 | RG-21 |
| 04 | `captures/04-plan-couloirs.png` | Plan calculé · jeu « couloirs » | P1 | CF 4.4, CT 5 |
| 04a | `captures/04a-plan-fenetres-isolees.png` | Variante « fenêtres isolées » · calage | P1 | RG-19, CT 5.16 |
| 04b | `captures/04b-plan-depassement.png` | Dépassement et report | P1 | RG-10, RG-11 |
| 04c | `captures/04c-plan-par-etape.png` | Vue par étape, silhouettes | P1 | CT 5.9 |
| 04d | `captures/04d-plan-filtre-profondeur.png` | Filtre de profondeur actif | P1 | CT 5.10 |
| 04e | `captures/04e-plan-commande-en-evidence.png` | Commande mise en évidence | P1 | CT 5.12 |
| 04f | `captures/04f-plan-deplacement-refuse.png` | Déplacement refusé | P2 | RG-08 |
| 04g | `captures/04g-plan-raccourcis.png` | Panneau des raccourcis | P2 | CT 5.6 |
| 04h | `captures/04h-plan-placement-sans-glisser.png` | Placement sans glisser | P2 | CT 5.3 |
| 04i | `captures/04i-plan-raccourcis-erreurs.png` | Raccourcis · erreurs | P2 | RG-21 |
| 05 | `captures/05-quai-etape.png` | Mode quai · étape en cours | P3 | CF 4.5 |
| 06a | `captures/06a-quai-signalement-probleme.png` | Signalement · choix du problème | P4 | RG-12 |
| 06b | `captures/06b-quai-signalement-action.png` | Signalement · choix de l'action | P4 | RG-13 |
| 06c | `captures/06c-quai-reverification.png` | Revérification | P4 | RG-14 |
| 06d | `captures/06d-quai-nouvelle-simulation.png` | Nouvelle simulation proposée | P4 | RG-15 |
| 06e | `captures/06e-quai-simulation-refusee.png` | Simulation refusée | P4 | RG-15 |
| 06f | `captures/06f-quai-decharger-replacer.png` | À décharger et replacer | P4 | RG-16 |
| 06g | `captures/06g-quai-signalement2-probleme.png` | Second signalement · A06 déjà chargé | P4 | RG-12 |
| 06h | `captures/06h-quai-signalement2-verif.png` | Second signalement · A07 sans appui | P4 | RG-14 |
| 06i | `captures/06i-quai-signalement2-simulation.png` | Second signalement · nouvelle simulation | P4 | RG-15, RG-16 |
| 06j | `captures/06j-quai-signalement2-decharger.png` | Second signalement · décharger et replacer A07 | P4 | RG-16 |
| 06k | `captures/06k-quai-signalement-erreurs.png` | Signalement · erreurs de saisie | P4 | RG-21 |
| 07 | `captures/07-catalogue.png` | Catalogue des articles | P1 | CF 4.6 |
| 08 | `captures/08-fiche-article.png` | Fiche article · forme et dessus porteur | P1 | RG-18 |
| 08e | `captures/08e-fiche-article-erreurs.png` | Fiche article · erreurs de saisie | P1 | RG-21 |
| 09 | `captures/09-camions.png` | Modèles de camions | P1 | CF 4.7 |
| 09b | `captures/09b-fiche-camion.png` | Fiche camion | P1 | CF 4.7 |
| 09e | `captures/09e-fiche-camion-erreurs.png` | Fiche camion · erreurs de saisie | P1 | RG-21 |
| 10 | `captures/10-liste-attente.png` | Liste d'attente | P1 | CF 4.8 |

## Écarts connus à corriger dans le code

Relevés en relisant les captures. On ne retouche pas la maquette : on corrige directement à l'implémentation.

- **05, mode quai, vue Arrière** : les libellés « Paroi gauche », « Vu depuis les portes » et « Paroi droite » se superposent au-dessus de la vue.
- **04, vue Côté gauche** : le bandeau annonce « 5 articles cachés », dont A02. Or A02 (1 100 mm de haut) dépasse de 50 mm au-dessus de A01 (1 050 mm), qui est devant lui : il reste visible. Il y a 4 articles cachés : A04, A05, A10 et A12. Le décompte vient de `projeterPlan`, jamais d'une liste écrite en dur.
- **08e, fiche article** : le cadre d'erreur des orientations autorisées est très arrondi. La charte limite les rayons à 8 px : appliquer le contour d'erreur standard de 2 px.
- **08 et 08e** : « Fragile » et « Dessus porteur » peuvent être cochés ensemble. Un article fragile ne supporte rien (RG-04) : l'interface doit le montrer, par exemple en désactivant « Dessus porteur » avec une explication quand « Fragile » est coché.
- **Renvois de règles** : vérifier dans chaque message que le numéro de RG cité est le bon. L'appui relève de RG-04, et non de RG-08.
- **08, fiche article** : pas de champ Poids nu (RG-05, poids maximal retenu).
- **07 et 08, dimensions des fenêtres** : le catalogue affiche les fenêtres dans leur taille posée debout (1 500 × 180 × 1 350). Les dimensions enregistrées sont celles de la pose à plat (cahier technique, 4.7) : 1 500 × 1 350 × 180. Le catalogue et la fiche article affichent les dimensions à plat, avec la mention « à plat » visible.
- **04d, filtre de profondeur** : la capture propose des boutons « Tout », « −1 couche » et « −2 couches ». Le cahier technique (5.10) demande un curseur à deux poignées, qui limite la vue à une tranche de profondeur en millimètres : c'est lui qu'il faut coder, avec le bandeau « Filtre de profondeur actif » et « Tout afficher ».
- **04 et suivantes, articles cachés** : le bandeau propose « Masquer le premier plan » et une seule vue de remplacement. Le cahier technique (5.10) demande le décompte des articles cachés, leur liste au clic et, pour chacun, une vue où il se voit (« Voir dans la vue Droite »).
- **Toutes les captures, logo** (recette, étape 11) : l'en-tête de la maquette montre un logo, une grille de quatre carrés colorés, à gauche de « Plan de chargement ». Le code ne l'a pas. Ce n'est pas un défaut : le logo n'est pas encore dessiné, l'en-tête garde le seul nom de l'application en attendant.
- **04b, camion trop chargé** (recette, étape 11) : avec 8 palettes de tuiles en plus dans T-2026-118, le plan calculé laisse, outre 2 articles en trop, 3 articles mal calés et 62 / 38 au pire moment. La capture montre un dépassement plus léger, sans article mal calé. Ce n'est pas un défaut : le bandeau et l'indicateur le signalent, voir le point ouvert « Camion trop chargé » du cahier technique (section 10).
- **02 et 02e, choix du camion** (recette, étape 11) : la capture aligne les quatre cartes de camion sur une ligne. Dans le code, elles passent sur deux lignes (trois, puis une).
- **03b, lignes de la commande** (recette, étape 11) : la capture affiche l'unité « mm » dans chaque champ de dimension propre et la pose (« À plat ») sous la référence de l'article. Le code n'affiche ni l'une ni l'autre.
- **04f et 04h, pas de déplacement** (préparation du prototype 2) : la barre d'outils et la carte de l'article sélectionné annoncent un pas de 100 mm. Le pas décidé est de 50 mm, et de 500 mm avec Maj (cahier technique 5.3).
- **04f à 04i, bouton « Relancer la simulation »** (préparation du prototype 2) : la page du plan dit « Relancer le calcul ». La « nouvelle simulation » est réservée au mode quai (RG-15, RG-16) : garder « Relancer le calcul ».
- **04h, ordre de chargement** (préparation du prototype 2) : l'article retiré (A12) y reste, grisé, à l'étape 12. Un article à placer n'a pas de position, donc pas de rang (cahier technique 5.7 et 4.8) : il sort de l'ordre de chargement et n'apparaît que dans la zone « Articles à placer ».
- **04g et 04i, panneau des raccourcis** (préparation du prototype 2) : il ne contient pas « Annuler le dernier déplacement ». Ce raccourci, Ctrl + Z, y figure avec la mention « Fixe », comme les flèches (cahier technique 5.6 et 5.18).
- **04f et 04h, bouton « Tourner de 90° »** (décision du 19 novembre 2026) : le quart de tour à plat n'existe pas en V1. Le bouton s'appelle « Changer d'orientation » et passe à l'orientation autorisée suivante (cahier technique 5.5).
- **04h, places proposées** (décision du 19 novembre 2026) : le bandeau annonce « 60 positions permises » et les vues en marquent autant. Au plus les 5 meilleures places sont proposées, classées par le score du placeur (cahier technique 5.3).

## Écarts validés avec la maquette

Choix faits pendant le développement, validés par le porteur. Le code s'écarte ici volontairement des captures : ne pas « corriger » ces écarts pour revenir à la maquette.

- **07 et 09, éléments archivés** (étape 8) : la maquette ne montre pas la liste des articles ou des modèles archivés. Elle est placée sous chaque tableau, derrière un bouton « Afficher les articles archivés (n) » ou « Afficher les modèles archivés (n) », avec un bouton « Réactiver » par ligne (RG-21).
- **08, aperçu coté** (étapes 8 et 8b) : la capture montre une seule « vue de face ». L'aperçu montre l'article posé à plat sous trois faces au choix, Dessus, Face et Côté, avec ses cotes fléchées, comme le plan de la fiche camion.
- **09, ordre des modèles** (étape 8) : la capture suit l'ordre de création. Les modèles sont triés par nom par défaut, et chaque tableau se trie par colonne (étape 8b).
- **09, bouton « Ouvrir la fiche »** (étape 8b) : supprimé. Dans tous les tableaux, le nom de l'élément est un lien vers sa fiche et toute la ligne est cliquable, avec un chevron « › » en fin de ligne.
- **08, 08e, 09b et 09e, champs numériques** (étape 8b) : les captures alignent les nombres à droite dans les champs. Ils sont alignés à gauche, comme tout texte saisi ; les nombres restent alignés à droite dans les tableaux.
