# Note de cadrage — Application de plan de chargement de camions

Nov 1, 2026 · @Baptiste Verdon

**Version V5.3, 4 novembre 2026 : équilibre suivi au fil de la tournée, charge par essieu hors V1. Version V5.2, 4 novembre 2026 : calage des articles retenu. Version V5.1, 4 novembre 2026 : forme réelle des articles exclue du calcul en V1. Version V5, 3 novembre 2026 : direction artistique confirmée (section 6), responsable du design ajouté. Version V4 du 2 novembre 2026 : poids utilisé pour le placement, vues 2D complétées après la première maquette.** Cette note s'appuie sur le brief V3, validé le 1er novembre 2026. Elle fixe ce que le projet livre, dans quel ordre, avec quels moyens, et comment juger qu'une étape est réussie.

## 1. Rappel du projet

Le projet est une application personnelle. Elle aide une équipe de négoce de matériaux à charger un camion de livraison à caisse fermée.

À partir des commandes d'une tournée, l'application :

- calcule une disposition réalisable de tous les articles ;
- l'affiche en vue de dessus et de côté ;
- guide le chargement étape par étape, en tenant compte de l'ordre des livraisons ;
- réagit quand un problème est signalé en cours de route.

Le porteur est un développeur. Il n'a ni commanditaire ni contact métier à ce stade.

## 2. Objectifs et critères de réussite

| Objectif | Critère de réussite retenu |
| --- | --- |
| Proposer automatiquement un plan de chargement réalisable | Pour une tournée d'essai de plusieurs commandes, le plan ne présente aucun chevauchement et respecte les règles de placement |
| Guider le chargement et réagir aux imprévus | Un chargement complet peut être déroulé en mode quai, y compris avec un problème signalé en cours de route |
| Apprendre à développer avec l'IA en comprenant le code | Le porteur sait expliquer le fonctionnement de l'algorithme de placement |

L'algorithme vise une **bonne** solution, pas la solution optimale. Son amélioration viendra après la V1.

La qualité visuelle et l'intuitivité de l'interface restent un objectif. Elles n'ont pas de critère mesurable : le porteur en juge lui-même à chaque prototype.

## 3. Périmètre

**Inclus dans la V1**

- **Catalogue d'articles**
  - Base générée au démarrage avec les familles courantes du négoce : fenêtres, plaques de plâtre, planches, poutres, quincaillerie…
  - Ajout et modification d'articles.
  - Taille maximale connue retenue par défaut.
  - Une taille nue et une taille emballée quand l'article peut être livré des deux façons.
- **Modèles de camions** : quelques modèles à caisse fermée, pré-générés et modifiables.
- **Commandes**
  - Saisie express d'une commande et de ses articles.
  - Dimensions modifiables pour la seule commande en cours.
  - Ordre de tournée : la dernière commande livrée est chargée en premier.
- **Calcul et affichage**
  - Calcul automatique du placement selon les règles retenues.
  - Visualisation 2D interactive : vues de dessus, de côté (gauche et droite), avant et arrière, avec repères fond / portes, et vue par étape.
  - Ajustement manuel du plan.
- **Dépassement** : quand tout ne rentre pas, l'application le signale. Elle propose de reporter la commande entière ou seulement les articles en trop, vers une liste d'attente.
- **Ordre de chargement** : liste des étapes à suivre.
- **Mode quai** : suivi du chargement sur tablette ou écran, signalement d'un problème et recalcul de la suite à partir de l'état réel du camion.
- **Poids** : poids chiffré par article, valeur maximale connue par défaut, utilisé pour placer les lourds en bas et équilibrer la charge.

**Exclu de la V1**

- Visualisation 3D.
- Indications de sanglage.
- Contrôle de la charge utile maximale du camion et de la charge par essieu.
- Camion plateau avec grue.
- Prise en compte de la forme réelle des articles non rectangulaires (cylindres, pentes, arrondis). En V1, tout article est décrit par sa boîte englobante.
- Recherche du placement optimal. La V1 se contente d'une bonne solution.

### Arborescence des pages

La V1 compte dix pages, toutes accessibles depuis l'accueil.

&#91;embedded content: Arborescence des pages · V1\]

Les pages de chargement dépendent d'une tournée. Le catalogue, les camions et la liste d'attente sont communs à toutes les tournées.

**Version texte de l'arborescence**

- Accueil · tournées
  - Préparation d'une tournée
    - Saisie express d'une commande
    - Plan de chargement
    - Mode quai *(tablette ou écran)*
  - Catalogue des articles
    - Fiche article
  - Modèles de camions
    - Fiche camion
  - Liste d'attente

| Page | Contenu | Support |
| --- | --- | --- |
| Accueil | Liste des tournées, accès aux autres sections | Ordinateur |
| Préparation d'une tournée | Choix du camion, ajout des commandes, ordre de livraison | Ordinateur |
| Saisie express d'une commande | Création d'une commande et de ses articles, dimensions propres à la commande | Ordinateur |
| Plan de chargement | Vues 2D, ajustement manuel, dépassement et report, ordre de chargement | Ordinateur |
| Mode quai | Suivi étape par étape, signalement d'un problème, revérification et nouvelle simulation | Tablette ou écran |
| Catalogue des articles | Liste des articles, recherche, accès aux fiches | Ordinateur |
| Fiche article | Ajout et modification, taille nue et taille emballée | Ordinateur |
| Modèles de camions | Liste des modèles, accès aux fiches | Ordinateur |
| Fiche camion | Ajout et modification des dimensions de caisse | Ordinateur |
| Liste d'attente | Commandes et articles reportés, à affecter à une prochaine tournée | Ordinateur |

L'application fonctionne sans compte en V1. Elle doit toutefois pouvoir accueillir plus tard une connexion et des droits par profil, qui restent à définir.

## 4. Acteurs et rôles

| Acteur | Rôle |
| --- | --- |
| Porteur (Neville) | Décideur, développeur et unique testeur pendant la phase de prototypes |
| Claude | Assistant de cadrage et de développement ; propose, le porteur décide |
| Maquettiste | Réalise les maquettes Figma à partir des cahiers des charges et de la charte graphique ; suit les grandes lignes de la direction artistique et peut s'en écarter s'il le juge nécessaire ou meilleur |
| Professionnels du négoce | Futurs utilisateurs potentiels (préparateurs, opérateurs de quai) ; non sollicités à ce stade |

## 5. Livrables et jalons

Le projet avance par prototypes successifs. Chacun est testable avant de passer au suivant.

&#91;embedded content: Livrables · 4 prototypes successifs et leur condition de passage\]

Chaque prototype a sa condition de passage à droite. La compréhension de l'algorithme est vérifiée en continu.

Il n'y a **aucune date**. Le rythme est libre, et un jalon est atteint quand sa condition de passage est remplie.

Les documents de projet accompagnent les prototypes :

- le brief ;
- cette note de cadrage ;
- le cahier des charges fonctionnel ;
- le cahier des charges technique, rédigé avant le prototype 1 ;
- la charte graphique et son fichier de jetons, qui servent de ligne directrice aux maquettes.

## 6. Direction artistique

La direction artistique est confirmée le 3 novembre 2026. Elle part de la première maquette, corrigée. Le détail figure dans la **charte graphique V2** et dans son fichier de jetons.

| Élément | Choix retenu |
| --- | --- |
| Ambiance | Sobre et professionnelle, caractère d'outil technique ; touche Tetris réservée au camion ; rien de tape-à-l'œil |
| Thème | Clair uniquement : fond gris très clair, cartes blanches, texte presque noir |
| Couleurs | Une seule couleur d'interaction (bleu #1F4FA8) ; boutons principaux en encre (#1B1F24) ; six couleurs de commandes vérifiées pour les daltonismes |
| Typographies | IBM Plex Sans pour l'interface, IBM Plex Mono pour les données ; échelle agrandie en mode quai |
| Formes | Coins francs (8 px au plus pour les cartes) ; aucun dégradé ; ombres réservées à ce qui flotte (menus, article en cours de glisser) |
| Signature | Camion présenté comme un plan coté ; code de commande (C1, C2…) toujours sous la même forme |
| Icônes | Style au trait ; Lucide proposé en option, non arrêté |
| Ton des textes | Vouvoiement, boutons en verbe à l'infinitif, messages courts et factuels |
| Anti-références | Visuels typiques des sites générés par IA (fonds crème, accents orange, dégradés, cartes très arrondies) ; tout ce qui est flashy |

**Responsable du design** : le maquettiste réalise les maquettes Figma. La charte est une ligne directrice, pas une contrainte stricte : il en suit les grandes lignes et peut s'en écarter s'il le juge nécessaire ou meilleur, en signalant l'écart. Le porteur valide les maquettes.

Le nom et le logo de l'application restent à définir, plus tard.

## 7. Moyens et contraintes

- **Budget** : 0 €. Seuls des outils, services et hébergements gratuits sont utilisés.
- **Temps** : pas de volume fixé, le porteur avance à son rythme. L'avancement doit rester régulier pour ne pas laisser traîner le projet.
- **Équipe** : le porteur seul, assisté par l'IA.
- **Supports** : ordinateur de bureau ou portable pour la préparation ; tablette ou écran pour le mode quai.
- **Données** : camions et articles pré-générés, aux dimensions plausibles mais fictives, modifiables.
- **Ambiance visuelle** : voir la direction artistique, section 6.

## 8. Risques et parades

| Risque | Conséquence possible | Parade retenue |
| --- | --- | --- |
| Algorithme de placement difficile : trouver la meilleure disposition est un problème réputé très complexe | Prototype 1 bloqué ou très long à produire | Viser une bonne solution avec une méthode simple, et l'améliorer après la V1 |
| Absence de validation métier | Outil inadapté aux pratiques réelles | Hypothèses tracées dans les documents ; visite d'un négoce ou étude de vidéos de chargement avant toute présentation |
| Élargissement progressif du périmètre | Projet qui traîne sans prototype abouti | Avancer prototype par prototype ; toute nouvelle idée est notée et priorisée avant d'être développée |
| Données fictives | Plans réalistes en apparence mais faux en pratique | Dimensions modifiables, à remplacer par des valeurs relevées |
| Absence d'échéance *(proposé)* | Perte de rythme | Un jalon = un prototype testable, avec une condition de passage claire |

## 9. Hypothèses et points ouverts

**Hypothèses de travail**, validées par le porteur mais pas par des professionnels :

- Les plaques se transportent à plat ou debout contre les parois.
- Les fenêtres se transportent debout.
- Les articles fragiles ne supportent rien.
- Les articles lourds vont en bas.
- Le poids est équilibré dans le camion, au départ comme après chaque livraison ; un plan déséquilibré est signalé.
- Un article est décrit par sa boîte englobante ; si son dessus n'est pas porteur, il ne supporte rien.
- Chaque article est calé : un article debout s'appuie contre une paroi ou d'autres articles, et le plan signale les autres articles mal calés. Le côté portes reste libre pour le déchargement.
- À chaque livraison, les articles de la commande doivent pouvoir sortir sans déplacer d'article livré plus tard, en longueur, en largeur comme en hauteur (détail en RG-07 du cahier fonctionnel).
- Les utilisateurs sont un préparateur au bureau et un opérateur sur le quai.

**Points ouverts**

- [ ] **Partage des données entre bureau et quai** : le plan préparé sur ordinateur doit être consultable sur la tablette. Faut-il un serveur hébergé gratuitement, un fonctionnement sur réseau local, ou un export simple ? Le choix est à faire dans le cahier des charges technique.
- [ ] **Sanglage** : fonctionnement et réglementation à documenter. Hors V1.
- [ ] **Valeurs réelles** : dimensions des camions et des articles à relever.
- [ ] **Validation métier** : à organiser avant toute présentation à des professionnels.
- [ ] **Seuils de calage** : à confirmer avec un professionnel (RG-19 du cahier fonctionnel).

## 10. État du projet

- **Étape atteinte** : Note de cadrage V5.3 du 4 novembre 2026 : forme réelle des articles exclue du calcul en V1, calage et suivi de l'équilibre retenus. La V5 du 3 novembre 2026 confirmait la direction artistique. La V4 était validée le 2 novembre 2026. Le brief, le cahier des charges fonctionnel et le cahier des charges technique sont rédigés.
- **Prochaine étape** : vérification des maquettes du prototype 1 (Claude Design) par le porteur et le maquettiste, puis développement du prototype 1 avec Claude Code.
- **Profil du client** : technique (développeur), sans connaissance du métier.
- **Direction artistique** : piste retenue (charte de la maquette, corrigée, V2) ; ligne directrice pour le maquettiste.
- **Décisions prises** :
  - découpage en quatre prototypes, sans dates ;
  - trois critères de réussite retenus : plan sans chevauchement sur une tournée d'essai, chargement complet en mode quai avec un problème signalé, algorithme expliqué par le porteur ;
  - une bonne solution de placement plutôt que la solution optimale ;
  - risques et parades acceptés ;
  - direction artistique confirmée, avec un maquettiste libre de s'en écarter si nécessaire.
- **Priorités provisoires** :
  - indispensable : catalogue, saisie express, calcul automatique, visualisation 2D, ordre de chargement ;
  - important : ajustement manuel, ordre de tournée, dimensions par commande, mode quai, signalement et recalcul ;
  - souhaitable : poids, sanglage, 3D ;
  - reporté : camion plateau avec grue.
- **Points à arbitrer** :
  - partage des données entre bureau et quai.
- **Informations à définir** :
  - fonctionnement du sanglage ;
  - valeurs réelles des dimensions ;
  - validation métier ;
  - nom et logo de l'application.
