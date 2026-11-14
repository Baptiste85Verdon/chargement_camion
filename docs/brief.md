# Brief — Application de plan de chargement de camions

Nov 1, 2026 · @Baptiste Verdon

**Version V4, 3 novembre 2026 : direction artistique ajoutée (section 7). Version V3 validée le 1er novembre 2026.** L'application calcule et affiche le plan de chargement d'un camion de livraison à partir des commandes, puis guide l'équipe pas à pas pendant le chargement.

## 1. Contexte

Le projet est personnel. Il est porté par un développeur, sans commanditaire ni contact métier à ce stade. Il pourra être présenté à de vrais utilisateurs si les tests sont concluants.

Le métier visé est celui des négoces de matériaux, du type du réseau Artipole. Ils livrent sur chantier des produits aux formats très variés : fenêtres, plaques de plâtre, Velux, meubles démontés, quincaillerie.

**Existant, observé de loin par le porteur** :

- Les commandes sont numérotées et affichées sur un panneau, avec la liste de leurs produits.
- Les produits sont disposés à côté du camion.
- L'équipe procède par essais successifs pour tout faire tenir.
- Elle veille à ce que chaque article soit calé et sanglé pour ne pas bouger ni casser pendant le trajet.

**Problème à résoudre** : faire tenir toutes les commandes d'une tournée dans le camion, en sécurité, demande aujourd'hui du temps, de l'expérience et des essais. Rien ne garantit qu'une solution existe avant d'avoir essayé.

## 2. Objectifs

**Objectifs du porteur** :

- Apprendre à développer une application avec l'IA (Claude).
- Comprendre le code qui se cache derrière chaque fonctionnalité.

**Objectifs du produit** :

- Supprimer le casse-tête du « tout faire rentrer » en proposant automatiquement un plan de chargement réalisable.
- Rendre ce plan lisible d'un coup d'œil, grâce à une visualisation interactive.
- Guider le chargement étape par étape, et réagir quand la réalité s'écarte du plan.
- Offrir une interface belle et intuitive.

**Critère de réussite pressenti** : des prototypes fonctionnels que le porteur peut tester lui-même, aboutissant si possible à une application quasi utilisable. Les critères mesurables restent à fixer dans la note de cadrage.

## 3. Cible

Deux profils sont pressentis. Ils sont déduits de l'observation et restent à valider auprès de professionnels.

| Profil | Moment d'usage | Appareil | Ce qu'il attend de l'application |
| --- | --- | --- | --- |
| Préparateur | Avant le chargement, au bureau | Ordinateur de bureau ou portable | Saisir les commandes, obtenir un plan et l'ajuster |
| Opérateur de quai | Pendant le chargement | Tablette ou écran près du camion | Suivre l'ordre de chargement, signaler un problème |

Les deux rôles peuvent être tenus par la même personne. Pendant la phase de prototype, le seul utilisateur est le porteur.

## 4. Besoins et attentes

Les priorités ci-dessous sont **provisoires**. Elles deviendront définitives dans le cahier des charges fonctionnel.

| Fonctionnalité | Description | Priorité provisoire |
| --- | --- | --- |
| Catalogue d'articles | Base générée au démarrage avec les familles d'articles courantes du négoce (fenêtres, plaques de plâtre, planches, poutres, quincaillerie…), certaines emballées pour le transport ; taille maximale connue retenue par défaut ; une taille nue et une taille emballée pour les articles livrés des deux façons ; ajout et modification d'articles | Indispensable |
| Saisie express des commandes | Créer une commande et ses articles en quelques clics | Indispensable |
| Calcul automatique du placement | Proposer une disposition de toutes les commandes dans le camion, en respectant les règles de placement ; si tout ne rentre pas, signaler le dépassement et proposer de reporter soit la commande entière, soit seulement les articles en trop ; la partie reportée rejoint une liste d'attente pour une prochaine tournée | Indispensable |
| Visualisation 2D | Vue de dessus et vue de côté, interactives | Indispensable |
| Ordre de chargement | Liste des étapes : quel article charger, dans quel ordre, à quel endroit | Indispensable |
| Ajustement manuel | Déplacer les articles à la main après le calcul automatique | Important |
| Ordre de tournée | Le camion livre plusieurs clients : la dernière commande livrée est chargée en premier | Important |
| Dimensions propres à une commande | Modifier la taille d'un article pour la commande en cours seulement, sans toucher au catalogue | Important |
| Mode quai | Suivi du chargement étape par étape sur tablette ou écran | Important |
| Signalement et recalcul | Signaler un problème à une étape ; l'application propose une nouvelle solution à partir de l'état réel du camion | Important |
| Poids | Saisie facultative du poids, non pris en compte par le calcul en V1 | Souhaitable |
| Sanglage | Indiquer où et comment sangler les articles | Souhaitable |
| Visualisation 3D | Rendu du chargement en trois dimensions | Souhaitable |
| Camion plateau avec grue | Chargement et déchargement par les côtés ou le dessus | Reporté après la V1 |

## 5. Contraintes

- **Budget** : 0 €. Seuls des outils, services et hébergements gratuits peuvent être utilisés.
- **Échéance** : aucune date fixée, mais l'avancement doit rester régulier.
- **Ressources** : une seule personne, le porteur, qui développe avec l'assistance de l'IA.
- **Périmètre V1** : camion à caisse fermée, chargé et déchargé par l'arrière, choisi parmi quelques modèles standards pré-générés, aux dimensions plausibles et modifiables.
- **Souhaits techniques** : aucun exprimé à ce stade. Ils seront traités dans le cahier des charges technique.

**Règles de placement retenues comme hypothèses**, validées par le porteur et à confirmer par des professionnels :

- Les plaques se transportent à plat ou debout contre les parois.
- Les fenêtres se transportent debout.
- Les articles fragiles ne supportent rien au-dessus d'eux.
- Les articles lourds vont en bas.
- Le poids doit être équilibré dans le camion.
- L'ordre de chargement est l'inverse de l'ordre de livraison.

## 6. Livrables attendus

Une suite de prototypes fonctionnels, chacun testable avant de passer au suivant. Le découpage ci-dessous est une proposition, à fixer dans la note de cadrage.

1. Catalogue, saisie des commandes et calcul automatique, affichés en 2D.
2. Ajustement manuel du placement.
3. Mode quai : suivi du chargement étape par étape.
4. Signalement d'un problème et recalcul de la suite.

Les documents de projet accompagnent ces prototypes : ce brief, la note de cadrage, le cahier des charges fonctionnel, puis le cahier des charges technique.

## 7. Direction artistique et inspirations

**Identité existante** : aucune. Le nom et le logo restent à définir, plus tard.

**Ambiance** : une interface sobre et professionnelle, au caractère d'outil technique. Une touche ludique inspirée de Tetris est réservée à la vue du placement dans le camion, sans rien de tape-à-l'œil. L'attente principale porte sur des vues **interactives** du chargement.

**Orientation retenue**, issue de la première maquette puis corrigée (détail dans la charte graphique V2) :

- thème clair : fond gris très clair, cartes blanches, texte presque noir ;
- une seule couleur d'interaction, un bleu soutenu ; boutons principaux en noir encre ;
- coins francs, aucun dégradé, aucune ombre décorative ;
- typographies IBM Plex Sans pour l'interface et IBM Plex Mono pour les données ;
- articles dessinés en blocs pâles au contour coloré, une couleur et un code (C1, C2…) par commande ;
- camion présenté comme un plan coté : quadrillage, lignes de cote, repères Fond / Portes.

**Anti-références** :

- les visuels typiques des sites générés par IA, en particulier les fonds crème et les accents orange ;
- tout ce qui est flashy.

**Icônes** : un style au trait, à bouts arrondis. Lucide est proposé comme option, sans être arrêté.

**Ton des textes** : vouvoiement, boutons en verbe à l'infinitif (« Valider l'étape »), messages courts et factuels.

**Responsable du design** : une autre personne réalise les maquettes Figma. Cette direction artistique lui sert de ligne directrice : elle en suit les grandes lignes et peut s'en écarter si elle le juge nécessaire ou meilleur.

**Concurrents** : des logiciels de plan de chargement existent sur le marché, par exemple EasyCargo. Ils pourront servir de point de comparaison, mais n'ont pas encore été étudiés.

## 8. Zones d'ombre et questions ouvertes

- [ ] **Validation métier** : aucun professionnel n'a été interrogé. Les profils utilisateurs et les règles de placement sont des hypothèses. Une visite dans un négoce ou l'étude de vidéos de chargement pourrait les confirmer.
- [ ] **Sanglage** : se fait-il sur des points d'ancrage du camion, ou autour des articles ? Une réglementation encadre-t-elle l'arrimage ?
- [ ] **Valeurs réelles** : les dimensions des camions et des articles pré-générés sont plausibles mais fictives. Elles seront à remplacer par des valeurs relevées.
- [ ] **Critères de réussite** : sur quels éléments mesurables juger qu'un prototype est concluant ?

## 9. État du projet

- **Étape atteinte** : Brief V3 validé le 1er novembre 2026 ; V4 du 3 novembre 2026, direction artistique ajoutée, à valider. La note de cadrage et les deux cahiers des charges sont aussi rédigés.
- **Prochaine étape** : vérification des maquettes du prototype 1 (Claude Design) par le porteur et le maquettiste, puis développement du prototype 1 avec Claude Code.
- **Profil du client** : technique (développeur), sans connaissance du métier.
- **Direction artistique** : piste retenue le 3 novembre 2026 (charte de la maquette, corrigée) ; ligne directrice pour le maquettiste.
- **Décisions prises** :
  - projet personnel, budget nul ;
  - V1 limitée à la caisse fermée et à la 2D (vues de dessus et de côté) ;
  - calcul automatique puis ajustement manuel ;
  - deux usages : préparation sur ordinateur, suivi sur le quai sur tablette ou écran ;
  - poids facultatif et ignoré par le calcul en V1 ;
  - dimensions modifiables dans le catalogue ou pour la seule commande en cours ;
  - catalogue initial composé des familles courantes du négoce, certaines emballées pour le transport ;
  - taille maximale connue retenue par défaut, avec une taille nue et une taille emballée si besoin ;
  - en cas de dépassement, signalement puis proposition de report de la commande entière ou des seuls articles en trop, vers une liste d'attente ;
  - quelques modèles de camions à caisse fermée pré-générés, modifiables ;
  - ambiance sobre et professionnelle, avec une touche Tetris sur la vue du placement, sans effets tape-à-l'œil ;
  - thème clair, IBM Plex Sans et Mono, une seule couleur d'interaction, coins francs, aucune ombre décorative ;
  - anti-références : visuels typiques de l'IA (crème et orange) et tout ce qui est flashy ;
  - icônes au trait, Lucide en option ;
  - vouvoiement et messages courts.
- **Priorités provisoires** :
  - indispensable : catalogue, saisie express, calcul automatique, visualisation 2D, ordre de chargement ;
  - important : ajustement manuel, ordre de tournée, dimensions par commande, mode quai, signalement et recalcul ;
  - souhaitable : poids, sanglage, 3D ;
  - reporté : camion plateau avec grue.
- **Points à arbitrer** :
  - découpage en prototypes.
- **Informations à définir** :
  - fonctionnement du sanglage ;
  - valeurs réelles des camions et des articles ;
  - critères de réussite mesurables ;
  - validation métier des hypothèses.
