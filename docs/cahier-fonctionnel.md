# Cahier des charges fonctionnel — Application de plan de chargement de camions

Nov 1, 2026 · @Baptiste Verdon

**Version V5.9, 15 novembre 2026 : tableaux triables par colonne, indication des modifications non enregistrées (RG-21, RG-22), aperçu de l'article sous trois faces. Version V5.8, 4 novembre 2026 : fiche article (case « Peut être livré nu », taille nue, orientations par défaut), camion utilisé non supprimable, rouge étendu aux pertes de données. Version V5.7, 4 novembre 2026 : vérification des saisies (RG-21) et fenêtres de confirmation (RG-22). Version V5.6, 4 novembre 2026 : équilibre de la charge (RG-20), zone « Articles à placer » près des vues. Version V5.5, 4 novembre 2026 : calage des articles (RG-19). Version V5.4, 4 novembre 2026 : formes non rectangulaires (boîte englobante, dessus porteur, RG-18), poids propre à une commande, dimensions mesurées au signalement. Version V5.3, 3 novembre 2026 : charte graphique et principes d'interface (section 7), accessibilité complétée, lignes de cote. Version V5.2, validée le 2 novembre 2026 (RG-07 fondée sur l'accès ; précisions sur les silhouettes et le filtre de profondeur) : vues multiples, vue par étape, zoom, articles cachés et mise en évidence d'une commande ajoutés après la première maquette ; versions précédentes : rotation : rotation, aimantation désactivable, raccourcis personnalisables et zone « Articles à placer » ajoutés.** Ce document s'appuie sur le brief V4 et sur la note de cadrage V5.3, et sur la charte graphique V2.4. Il décrit ce que fait l'application, page par page et règle par règle. Le *comment*, c'est-à-dire les choix techniques, relève du cahier des charges technique.

## 1. Objet et périmètre

L'application prépare et guide le chargement d'un camion à caisse fermée pour une tournée de livraison de négoce de matériaux. Elle :

- calcule une disposition réalisable des commandes ;
- l'affiche en vue de dessus et de côté ;
- donne l'ordre de chargement ;
- accompagne l'opérateur sur le quai, jusqu'à la gestion des imprévus.

Ce cahier couvre la **V1**, qui regroupe les prototypes 1 à 4.

Sont hors V1 :

- la 3D ;
- le sanglage ;
- la prise en compte de la forme réelle des articles non rectangulaires dans le calcul ;
- le contrôle de la charge utile maximale du camion et de la charge par essieu ;
- le camion plateau avec grue ;
- les comptes utilisateurs.

Les éléments proposés au fil de la rédaction ont tous été validés par le porteur le 2 novembre 2026.

## 2. Priorités définitives

| Fonctionnalité | Priorité | Prototype |
| --- | --- | --- |
| Catalogue d'articles et fiches | Indispensable | 1 |
| Modèles de camions et fiches | Indispensable | 1 |
| Saisie express des commandes | Indispensable | 1 |
| Calcul automatique du placement, poids compris (lourds en bas, équilibre) | Indispensable | 1 |
| Indicateur d'équilibre de la charge | Important | 1 |
| Visualisation 2D : dessus, côtés, avant, arrière, et vue par étape | Indispensable | 1 |
| Ordre de chargement | Indispensable | 1 |
| Ordre de tournée | Important | 1 |
| Dimensions propres à une commande | Important | 1 |
| Dépassement, report et liste d'attente | Important | 1 |
| Ajustement manuel | Important | 2 |
| Mode quai | Important | 3 |
| Signalement, revérification et nouvelle simulation | Important | 4 |
| Contrôle de la charge utile maximale et de la charge par essieu | Souhaitable | Hors V1 |
| Sanglage | Souhaitable | Hors V1 |
| Visualisation 3D | Souhaitable | Hors V1 |
| Formes réelles dans le calcul (cylindres, pentes, espace intérieur, articles compressibles) | Souhaitable | Hors V1 |
| Camion plateau avec grue | Reporté | Hors V1 |
| Comptes et droits par profil | Reporté | Hors V1 |

L'ordre de tournée, les dimensions par commande et le dépassement sont rattachés au prototype 1. Le plan de ce prototype ne peut pas être juste sans eux.

## 3. Objets métier

Ce sont les informations que l'application manipule, vues du côté de l'usage. La structure de la base de données relève du cahier des charges technique.

| Objet | Informations | Remarques |
| --- | --- | --- |
| Article (catalogue) | Nom, famille, taille emballée (longueur × largeur × hauteur), taille nue si l'article peut être livré nu, fragilité, orientations autorisées (à plat, debout, contre une paroi), poids (valeur maximale connue par défaut), forme (rectangulaire, cylindrique, irrégulière), dessus porteur (oui ou non) | Les tailles sont celles de la boîte englobante (RG-18). La taille retenue par défaut est la taille maximale connue. La fragilité et les orientations traduisent les règles de placement |
| Modèle de camion | Nom, dimensions utiles de la caisse (longueur × largeur × hauteur) | Quelques modèles pré-générés, modifiables |
| Tournée | Date, camion choisi, commandes, ordre de livraison, statut (en préparation, prête, en chargement, chargée) | — |
| Commande | Numéro, client ou destination, rang dans la tournée, lignes d'articles | — |
| Ligne de commande | Article, quantité, nu ou emballé, dimensions propres à la commande si elles diffèrent du catalogue, poids propre à la commande | Modifier ces dimensions ou ce poids n'a aucun effet sur le catalogue. Un poids proposé au prorata est signalé comme estimé (RG-03) |
| Plan de chargement | Position et orientation de chaque article dans la caisse, ordre de chargement | Recalculé à chaque nouvelle simulation |
| Étape de chargement | Article à charger, emplacement, statut (à faire, chargé, en problème) | — |
| Signalement | Étape concernée, type de problème, commentaire libre facultatif, dimensions mesurées facultatives, action choisie, résultat de la revérification | Les dimensions mesurées servent à la revérification (RG-12, RG-14) |
| Élément en attente | Commande entière ou articles reportés, tournée d'origine, motif (dépassement, signalement) | Réaffectable à une prochaine tournée |

## 4. Fonctionnalités par page

Les pages suivent l'arborescence validée dans la note de cadrage. Les références RG renvoient aux règles de gestion de la section 5.

### 4.1 Accueil

- Liste des tournées avec date, camion, nombre de commandes et statut.
- Création d'une nouvelle tournée.
- Accès au catalogue, aux modèles de camions et à la liste d'attente.

### 4.2 Préparation d'une tournée

- Choix du modèle de camion.
- Ajout de commandes :
  - par la saisie express ;
  - depuis la liste d'attente.
- Définition de l'ordre de livraison, par exemple en réordonnant les commandes (RG-07).
- Lancement du calcul du plan de chargement.

### 4.3 Saisie express d'une commande

- Création rapide d'une commande : numéro, destination.
- Ajout d'articles depuis le catalogue, avec recherche et quantité.
- Choix entre nu et emballé pour les articles concernés.
- Modification des dimensions pour cette commande seulement (RG-03). Le poids est alors proposé au prorata du volume, signalé comme estimé, et reste modifiable.

### 4.4 Plan de chargement

- Vues interactives au choix, avec un bouton pour passer de l'une à l'autre : dessus, côté gauche, côté droit, avant (le fond, côté cabine) et arrière (les portes, par où arrivent les articles). Chaque vue indique en permanence où se trouvent le fond et les portes. Deux cadres de vue s'affichent à la fois ; chacun peut montrer n'importe laquelle des cinq vues, sauf celle déjà affichée dans l'autre. Chaque vue peut être zoomée. Les articles cachés derrière d'autres sont signalés, un filtre de profondeur permet de les voir, et l'application propose une vue plus adaptée. Quand un filtre de profondeur est actif, la vue l'indique clairement, avec le nombre d'articles masqués et un bouton pour tout réafficher. Survoler ou sélectionner un article l'identifie, ainsi que sa commande.
- Distinction visuelle des commandes par une couleur et un code de commande (C1, C2…), présenté sous la même forme partout. Une commande peut être mise en évidence : les autres passent alors en gris, leur code restant lisible.
- Lignes de cote : la caisse est cotée (longueur, largeur ou hauteur selon la vue), et l'article sélectionné affiche ses dimensions et sa distance au fond.
- Un article de forme non rectangulaire porte un pictogramme de forme. Son détail précise que la place réservée est celle de sa boîte englobante (RG-18).
- Ordre de chargement sous forme de liste d'étapes et de vue par étape. On avance étape par étape : le camion montre ce qui est déjà chargé, l'article à placer à cette étape et son emplacement. Cette vue sert à relire et valider le plan avant le chargement. Les étapes suivantes peuvent être montrées en silhouette, avec un contour en pointillés sur fond blanc. On voit ainsi la place qui leur est réservée, sans les confondre avec les articles déjà chargés.
- Ajustement manuel par déplacement et rotation des articles, avec une aimantation activée par défaut que l'utilisateur peut désactiver (RG-08, RG-09). Un article peut être retiré vers une zone « Articles à placer », puis replacé à tout moment. Cette zone se trouve juste à côté des vues du camion, visible sans faire défiler la page. On y dépose un article et on l'en sort par glisser-déposer ; les boutons « Placer » et « Tout placer » restent une alternative.
- Dépassement : alerte et proposition de report (RG-10, RG-11).
- Articles mal calés : un bandeau les signale (« 2 articles mal calés : A10, A11 (C2) »), avec un bouton qui les sélectionne dans les vues. Les blocs concernés portent l'icône triangle (RG-19).
- Équilibre de la charge (RG-20) : une carte « Équilibre de la charge » montre la répartition gauche / droite en pourcentages et en tonnes, et le statut en texte et icône. Un tableau repliable donne l'équilibre au départ puis après chaque livraison. La vue de dessus montre le centre de gravité et l'axe du camion. Tout se met à jour à chaque déplacement.
- Passage en mode quai.

### 4.5 Mode quai

- Affichage de l'étape en cours : quel article charger et à quel endroit, avec la vue par étape du camion. Le choix des vues et les repères fond / portes sont les mêmes qu'en préparation.
- Validation de l'étape, puis passage à la suivante.
- Signalement d'un problème, choix d'une action, puis revérification et, si besoin, nouvelle simulation (RG-12 à RG-16).
- Demande de nouvelle simulation à tout moment par l'opérateur.
- Lisibilité sur tablette : gros boutons, informations essentielles seulement.
- Statut d'équilibre de la charge, en texte et icône (RG-20).

### 4.6 Catalogue des articles et fiche article

- Liste des articles, avec recherche et filtre par famille. Le tableau se trie par colonne d'un clic sur son en-tête ; sans tri choisi, les articles sont rangés par famille.
- Création, modification et suppression d'articles (RG-02), avec leur forme et leur dessus porteur (RG-18). Les orientations sont proposées par défaut selon la famille, d'après RG-04 : une fenêtre « debout », une plaque « à plat » et « contre une paroi ». L'utilisateur reste libre de les changer.
- La fiche montre un aperçu coté de l'article posé à plat, sous trois faces au choix : dessus (longueur × largeur), face (longueur × hauteur) et côté (largeur × hauteur). La taille nue, quand il y en a une, y figure en pointillés.
- Base d'exemple générée au premier lancement (RG-01).

### 4.7 Modèles de camions et fiche camion

- Liste des modèles, triée par nom par défaut et triable par colonne, avec création, modification et suppression. Un modèle utilisé par une tournée en préparation, prête ou en chargement ne peut pas être supprimé (RG-21).
- Modèles d'exemple générés au premier lancement.

### 4.8 Liste d'attente

- Liste des commandes et articles reportés, avec leur tournée d'origine et leur motif.
- Affectation à une nouvelle tournée.
- Suppression d'un élément devenu inutile.

## 5. Règles de gestion

### Catalogue et dimensions

- **RG-01** : au premier lancement, l'application génère une base d'exemple. Elle contient les familles courantes du négoce (fenêtres, plaques de plâtre, planches, poutres, quincaillerie…) et quelques modèles de camions. Les dimensions sont plausibles mais fictives, et modifiables.
- **RG-02** : la taille retenue par défaut pour un article est la taille maximale connue. Un article qui peut être livré nu ou emballé possède deux tailles.
- **RG-03** : une dimension modifiée dans une commande ne s'applique qu'à cette commande. Une dimension modifiée dans le catalogue s'applique aux commandes créées ensuite. Quand les dimensions d'une ligne de commande changent, son poids est proposé au prorata du volume, signalé comme estimé, et reste modifiable ; il ne s'applique qu'à cette commande.
- **RG-18** *(numérotée à la suite pour ne pas décaler les références)* : tout article est décrit par sa boîte englobante, la plus petite boîte qui le contient entièrement, quelle que soit sa forme réelle. Le placement réserve toute cette boîte. La forme réelle (rectangulaire, cylindrique ou irrégulière) est indiquée à titre d'information. Un article dont le dessus n'est pas porteur (pente, arrondi, dessus irrégulier) ne supporte rien au-dessus de lui : c'est le cas par défaut d'un article cylindrique ou irrégulier, et cela se modifie dans sa fiche.

### Placement

- **RG-04** : le calcul respecte les règles suivantes.
  - Les plaques se transportent à plat ou debout contre une paroi.
  - Un article debout ou contre une paroi est posé au plancher, et rien n'est posé dessus.
  - Les fenêtres se transportent debout.
  - Un article fragile, ou dont le dessus n'est pas porteur (RG-18), ne supporte rien au-dessus de lui.
  - Les articles lourds vont en bas.
  - Un article de plus de 500 kg n'a pas sa base à plus de 1 000 mm du plancher (seuils provisoires).
  - Le poids est équilibré dans la caisse (RG-20).
- **RG-05** : en V1, le poids sert uniquement à placer les articles (lourds en bas, équilibre). La charge utile maximale du camion n'est pas contrôlée. Chaque article porte un poids chiffré. La valeur maximale connue est retenue par défaut, comme pour les tailles, et la base d'exemple fournit des poids plausibles.
- **RG-06** : aucun article ne chevauche un autre ni ne dépasse des parois. Cette règle ne souffre aucune exception.
- **RG-07** : l'ordre de déchargement est garanti par l'accès. À chaque livraison, les articles de la commande doivent pouvoir sortir par les portes sans déplacer aucun article livré plus tard. Cela vaut en longueur, en largeur et en hauteur : un article livré plus tard gêne dès qu'il se trouve entre l'article et les portes, dans la même bande en largeur, et plus bas que le dessus de l'article. On ne fait pas passer un article par-dessus le chargement. Un article livré tôt peut donc se trouver plus au fond qu'un article livré plus tard, s'il est dans un autre couloir. Il peut aussi être posé sur des articles livrés plus tard, par exemple une plaque à plat posée sur le dessus du chargement, côté portes, quand rien de ce qui est livré plus tard ne se trouve entre elle et les portes. Les autres règles (RG-04) doivent aussi être respectées. Charger les dernières commandes au fond reste la tendance générale, pas une règle absolue.
- **RG-19** *(numérotée à la suite pour ne pas décaler les références)* : chaque article doit être calé pour ne pas se déplacer pendant le trajet.
  - **Article debout** (fenêtre, plaque debout…) : il s'appuie, sur au moins une de ses deux grandes faces, contre une paroi ou contre des articles qui couvrent au moins la moitié de cette face (seuil de calage provisoire). Des articles debout appuyés les uns contre les autres forment un groupe : au moins l'un d'eux doit s'appuyer contre une paroi ou contre un article qui n'est pas debout. Deux fenêtres face à face, seules au milieu de la caisse, ne sont donc pas calées. Un placement qui ne respecte pas cette règle est refusé, comme les autres règles de placement (RG-08).
  - **Autres articles** : ils touchent une paroi ou un article côté fond, et d'au moins un côté en largeur. Sinon, le placement n'est pas refusé : le plan signale l'article comme « mal calé », et le préparateur décide.
  - **Côté portes** : il peut rester libre, puisque c'est par là que l'article sort (RG-07). Son maintien relève du sanglage, hors V1.
  - **Calcul automatique** : entre deux positions presque aussi compactes, il choisit celle où l'article touche le plus de parois et d'articles.
- **RG-20** *(numérotée à la suite)* : équilibre de la charge.
  - L'équilibre se mesure par le centre de gravité de la charge : la répartition entre les côtés gauche et droit, et la distance au fond.
  - Il est calculé au départ, puis après chaque livraison, sur la charge qui reste dans le camion. Un plan équilibré au départ peut en effet se déséquilibrer en cours de tournée.
  - Le statut retient le pire moment de la tournée : « Équilibré » jusqu'à 55 / 45, « À surveiller » jusqu'à 60 / 40, « Déséquilibré » au-delà (seuils provisoires).
  - Un plan déséquilibré n'est pas refusé : il est signalé, et le préparateur décide.
  - Le calcul automatique cherche le meilleur équilibre, une fois que tous les articles rentrent et sont calés.
  - La distance au fond est affichée sans être jugée : la répartition sur les essieux est hors V1.
- **RG-08** : un déplacement manuel qui enfreint une règle de placement est bloqué. L'article revient à sa place et un message explique la règle enfreinte.
- **RG-09** : un déplacement manuel qui crée un chevauchement ou fait sortir un article de la caisse est toujours bloqué, avec un message.

### Dépassement

- **RG-10** : si tout ne rentre pas, l'application le signale et indique les articles et les commandes concernés.
- **RG-11** : l'utilisateur choisit de reporter soit la commande entière, soit seulement les articles en trop. La partie reportée rejoint la liste d'attente.

### Mode quai

- **RG-12** : l'opérateur peut signaler les problèmes suivants, avec un commentaire libre facultatif :
  - article manquant ;
  - article plus grand que prévu, avec la saisie facultative des dimensions mesurées, que la revérification (RG-14) utilise à la place des dimensions prévues ;
  - article abîmé ;
  - emplacement non conforme au plan.
- **RG-13** : après un signalement, l'opérateur choisit l'une de ces actions :
  - annuler tout le chargement, la tournée revenant alors en préparation ;
  - retirer l'article, qui rejoint la liste d'attente pendant que la commande part incomplète ;
  - retirer la commande entière, qui rejoint la liste d'attente ;
  - conserver l'article sans rien retirer.
- **RG-14** : après un retrait ou une conservation, l'application revérifie toujours le reste du plan.
- **RG-15** : si la revérification juge une nouvelle simulation nécessaire, l'application la propose. L'opérateur l'accepte ou la refuse. En cas de refus, le chargement reprend avec le plan actuel.
- **RG-16** : l'opérateur peut demander une nouvelle simulation à tout moment. Elle part de l'état réel du camion et ne déplace en principe que les articles pas encore chargés. Si la sécurité du chargement ou la protection des articles fragiles l'exige, elle peut aussi déplacer des articles déjà chargés. Dans ce cas, elle indique clairement à l'opérateur ce qu'il faut décharger et replacer.

### Saisies et confirmations

- **RG-21** *(numérotée à la suite)* : vérification des saisies.
  - Chaque champ obligatoire porte la mention « (obligatoire) » en texte.
  - Les champs sont vérifiés quand on les quitte, puis à l'enregistrement. Une erreur disparaît dès que la valeur est corrigée. Le bouton d'enregistrement reste toujours actif.
  - Tant qu'un formulaire contient des modifications non enregistrées, la mention « Modifications non enregistrées » s'affiche près du bouton d'enregistrement, avec une icône, et ce bouton est mis en avant. Elle disparaît à l'enregistrement. Quitter le formulaire dans cet état demande confirmation (RG-22).
  - Une **erreur** bloque l'enregistrement : champ obligatoire vide, valeur invalide, doublon interdit. Elle s'affiche sous le champ, en rouge, avec une icône et un message qui dit comment corriger : « Indiquez un nombre entier de millimètres, par exemple 1 250. » À l'enregistrement, un résumé en haut du formulaire compte les champs à corriger (« 2 champs à corriger »), avec un lien vers chacun.
  - Un **avertissement** ne bloque pas : il s'affiche en ambre sous le champ, et l'utilisateur peut enregistrer.
  - Il n'y a pas de bornes de plausibilité : une valeur valide mais inhabituelle n'est pas signalée, l'utilisateur en juge lui-même.
  - Un article ou un modèle de camion déjà utilisé ne se supprime pas : il s'archive. Il disparaît alors des listes et des choix (catalogue, saisie express, choix du camion), mais reste visible, avec la mention « archivé », dans les commandes, les tournées et les plans qui l'utilisent. Seul un élément jamais utilisé peut être supprimé. Un élément archivé peut être réactivé depuis la liste des éléments archivés.
  - Les règles par formulaire :

    | Formulaire | Erreurs (bloquantes) | Avertissements |
    | --- | --- | --- |
    | Fiche article | Référence facultative, mais unique parmi les articles actifs : un article archivé peut laisser sa référence à son remplaçant. Nom, famille, poids et les trois dimensions emballées obligatoires. Dimensions en millimètres entiers supérieurs à 0 ; poids supérieur à 0, virgule acceptée. Case « Peut être livré nu » cochée : les trois dimensions nues sont obligatoires, et chacune est inférieure ou égale à la dimension emballée correspondante ; case décochée : les champs nus sont masqués. Au moins une orientation cochée | Nom déjà utilisé par un autre article. Article qui ne rentre dans aucun modèle de camion actif, quelle que soit l'orientation autorisée. Orientation contraire à RG-04, par exemple « à plat » autorisé pour une fenêtre |
    | Fiche camion | Nom et les trois dimensions utiles obligatoires, en millimètres entiers supérieurs à 0. Suppression et archivage refusés si le camion est utilisé par une tournée en préparation, prête ou en chargement, avec un message qui cite ces tournées. Un camion utilisé seulement par des tournées chargées s'archive | — |
    | Saisie express | Numéro et destination obligatoires ; numéro unique dans la tournée. Au moins une ligne. Quantité entière d'au moins 1. Dimensions propres : les trois ou aucune, entières et supérieures à 0. Poids propre supérieur à 0 | Poids estimé au prorata du volume (RG-03). Article qui ne rentre pas dans le camion de la tournée, quelle que soit l'orientation autorisée : il finira en trop (RG-10) |
    | Préparation d'une tournée | Date et camion obligatoires. Au moins une commande avant « Lancer le calcul » | — |
    | Signalement | Type de problème et action obligatoires. Dimensions mesurées : les trois ou aucune, supérieures à 0 | « Article plus grand que prévu » alors qu'aucune mesure ne dépasse les dimensions prévues |
    | Raccourcis clavier | Une touche ne sert qu'à une action (« La touche R sert déjà à Faire pivoter »). Un raccourci prend effet tout de suite : le refus est immédiat, sans bouton d'enregistrement | — |

- **RG-22** *(numérotée à la suite)* : fenêtres de confirmation.
  - Une fenêtre de confirmation s'ouvre seulement avant une action destructrice ou irréversible, jamais pour signaler une erreur de saisie.
  - Cas couverts :
    - supprimer un article ou un modèle de camion jamais utilisé, une commande, une tournée ou un élément en attente ;
    - supprimer un article ou un modèle de camion déjà utilisé : la fenêtre explique qu'il ne peut pas être supprimé et propose de l'archiver (« Cet article est utilisé dans 2 commandes. Archivez-le : il ne sera plus proposé, et restera visible dans ces commandes. », bouton « Archiver l'article », de ton neutre, et « Annuler ») ;
    - annuler tout le chargement (RG-13) ;
    - retirer une commande entière (RG-13) ;
    - enregistrer un modèle de camion utilisé par une tournée en cours ;
    - quitter un formulaire qui contient des modifications non enregistrées, signalées par la mention « Modifications non enregistrées » (RG-21).
  - Forme :
    - un titre en question (« Supprimer « Poutre lamellé-collé » ? ») ;
    - la conséquence concrète (« Cet article n'est utilisé dans aucune commande. Il sera définitivement supprimé. ») ;
    - un bouton qui nomme l'action (« Supprimer l'article »), et un bouton « Annuler ». Le bouton d'action est rouge quand l'action supprime ou fait perdre des données : supprimer, quitter sans enregistrer, abandonner un signalement. Le bouton qui ouvre la fenêtre reste en style secondaire.
  - Le focus va d'abord sur « Annuler ». La touche Échap ferme la fenêtre sans rien faire.

### Comptes

- **RG-17** : la V1 fonctionne sans compte utilisateur. L'application doit être conçue pour accueillir plus tard une connexion et des droits par profil.

## 6. Parcours de signalement en mode quai

Ce parcours est le plus délicat de la V1. Le schéma le résume.

&#91;embedded content: Parcours de signalement en mode quai · RG-13 à RG-16\]

L'annulation remet la tournée en préparation. Un retrait ou une conservation déclenche toujours une revérification, et une nouvelle simulation n'est appliquée que si l'opérateur l'accepte ou la demande lui-même.

Le parcours de préparation, de l'accueil jusqu'au mode quai, suit simplement l'arborescence. Il n'appelle pas de schéma :

1. créer une tournée ;
2. choisir le camion ;
3. saisir les commandes ;
4. ordonner les livraisons ;
5. calculer le plan ;
6. ajuster le plan ;
7. passer en mode quai.

## 7. Exigences d'ergonomie et d'usage

- **Ambiance** : interface sobre et professionnelle, sans rien de tape-à-l'œil. Une touche ludique inspirée de Tetris est réservée à la vue du placement dans le camion. Le détail figure ci-dessous et dans la charte graphique.
- **Supports** :
  - la préparation se fait sur ordinateur de bureau ou portable ;
  - le mode quai doit être confortable sur tablette, avec de grandes zones tactiles et un contenu limité à l'étape en cours.
- **Rapidité de saisie** : la saisie express permet de créer une commande et ses articles en quelques actions.
- **Messages** : chaque blocage ou alerte explique la règle en cause en langage courant (RG-08, RG-09, RG-10, RG-19).
- **Formulaires** : les erreurs de saisie s'affichent sous les champs, jamais dans une fenêtre surgissante (RG-21). Les modifications non enregistrées sont signalées près du bouton d'enregistrement (RG-21). Les fenêtres de confirmation sont réservées aux actions destructrices ou irréversibles (RG-22).
- **Tableaux** : les listes en tableau (catalogue, modèles de camions) se trient par colonne, d'un clic ou au clavier sur l'en-tête ; le sens du tri est indiqué par une flèche et annoncé aux lecteurs d'écran.
- **Données d'exemple** : l'application est utilisable dès le premier lancement grâce à la base générée (RG-01).

### Charte graphique et principes d'interface

La charte graphique V2 et son fichier de jetons font référence. Ils servent de ligne directrice au maquettiste, qui peut s'en écarter s'il le juge nécessaire ou meilleur, en signalant l'écart. Les grandes lignes sont les suivantes.

| Élément | Choix |
| --- | --- |
| Thème | Clair uniquement : fond gris très clair (#F4F5F7), cartes blanches, texte presque noir (#1B1F24) |
| Interaction | Une seule couleur, le bleu #1F4FA8 (liens, focus, étape en cours) ; boutons principaux en encre |
| Typographies | IBM Plex Sans pour l'interface, IBM Plex Mono pour les données (dimensions, positions, cotes, codes de commande) |
| Formes | Coins francs : 8 px pour les cartes, 4 px pour les boutons et champs, 3 px pour les blocs d'articles |
| Ombres | Aucune ombre décorative ; une ombre seulement pour ce qui flotte au-dessus du contenu (menus, info-bulles, article en cours de glisser) |
| Alertes | Sur fond blanc, avec un contour ambre fin, une icône et un titre ; pas de fond crème ni de barre colorée sur un seul côté |
| Erreurs | Rouge (#B42318), réservé à ce qui doit être corrigé et aux boutons de suppression ; toujours avec une icône et un texte. L'ambre reste pour les avertissements, qui n'empêchent pas de continuer |
| Icônes | Style au trait ; Lucide en option, non arrêté ; une seule famille dans toute l'application |

**Le camion**, cœur visuel de l'application :

- chaque article est un bloc au fond pâle, au contour de 3 px de la couleur de sa commande, avec son code de commande ;
- six couleurs de commandes (framboise, orange, vert d'eau, violet, bleu canard, brun), choisies pour rester distinctes pour les daltoniens ; au-delà de six, les teintes reviennent avec un fond hachuré ;
- le camion se lit comme un plan coté : quadrillage de 1 m, lignes de cote, repères Fond / Portes ;
- trois états peuvent se cumuler sur un bloc, et se distinguent par leur forme : sélectionné (anneau noir), étape en cours (contour bleu épais et étiquette « Étape n »), focus clavier (double anneau décalé).

**Ton des textes** :

- vouvoiement ;
- boutons en verbe à l'infinitif : « Valider l'étape », « Signaler un problème » ;
- messages courts et factuels, qui disent ce qui se passe puis quoi faire ;
- pas de points d'exclamation.

**Anti-références** : les visuels typiques des sites générés par IA (fonds crème, accents orange, dégradés, cartes très arrondies, émojis en guise d'icônes) et tout ce qui est flashy.

**Nom et logo** : à définir plus tard.

### Accessibilité

L'application vise le niveau **AA des WCAG 2.2**, le référentiel international d'accessibilité du web. Cela se traduit concrètement par les exigences suivantes.

- **Plan de chargement** : la vue 2D dispose d'une alternative textuelle, lisible par un lecteur d'écran. C'est la liste des articles avec leur commande, leur position et leur orientation.
- **Couleurs** :
  - la couleur par commande n'est jamais le seul repère, car chaque article affiche aussi le numéro de sa commande ;
  - les contrastes sont suffisants, touche Tetris comprise : au moins 4,5:1 pour les textes et 3:1 pour les contours utiles ;
  - les couleurs de commandes restent distinctes pour les formes courantes de daltonisme ;
  - les articles atténués et les silhouettes gardent un code de commande lisible.
- **Clavier** : toute l'application est utilisable au clavier. Pour l'ajustement manuel, un article sélectionné se déplace aux flèches, en alternative au glisser-déposer. Les raccourcis clavier sont personnalisables à tout moment.
- **Messages** : les blocages, alertes et signalements sont annoncés aux technologies d'assistance. Ils ne reposent jamais sur la couleur seule.
- **Mode quai** :
  - les zones tactiles sont larges ;
  - les textes sont plus grands qu'en préparation (18 px pour le texte courant) et peuvent être agrandis sans perte d'information ;
  - les boutons principaux mesurent au moins 56 px de haut.
- **Code de commande** : jamais affiché en dessous de 11 px ; pour un article trop petit à l'écran, il s'affiche dans une étiquette reliée à l'article.
- **Focus** : toujours visible, et distinct de l'indication de l'étape en cours.
- **Animations** : elles restent sobres, et sont désactivées si l'utilisateur a demandé à réduire les animations sur son appareil.
- **Formulaires** : chaque champ et chaque bouton porte un libellé explicite, et l'interface est déclarée en français. Chaque message d'erreur est relié à son champ et lu par les lecteurs d'écran ; le résumé des erreurs reçoit le focus à l'enregistrement. Une suppression est toujours confirmée (RG-22).

## 8. Critères d'acceptation par prototype

| Prototype | Le prototype est accepté quand… |
| --- | --- |
| 1 · Catalogue, commandes et calcul 2D | Pour une tournée d'essai de plusieurs commandes, le plan ne présente aucun chevauchement, respecte les règles de placement applicables et l'ordre de livraison. Un dépassement est signalé et le report fonctionne. Les cinq vues et la vue par étape montrent le plan, avec le fond et les portes toujours indiqués. L'indicateur d'équilibre donne le statut « À surveiller » pour le jeu d'essai « couloirs ». |
| 2 · Ajustement manuel | Un article peut être déplacé à la main. Tout déplacement interdit est bloqué avec un message clair. |
| 3 · Mode quai | Un chargement complet peut être déroulé étape par étape sur tablette. |
| 4 · Signalement et recalcul | Un chargement est déroulé avec un problème signalé. Le retrait, la revérification et la nouvelle simulation fonctionnent comme le décrit le parcours de la section 6. |
| En continu | Le porteur sait expliquer le fonctionnement de l'algorithme de placement. Chaque prototype respecte les exigences d'accessibilité de la section 7. Chaque formulaire applique RG-21 et chaque action destructrice RG-22. |

## 9. Points ouverts

- [ ] **Partage des données entre bureau et quai** : choix technique à faire dans le cahier des charges technique.
- [ ] **Validation métier, sanglage, valeurs réelles** : reportés de la note de cadrage.
- [ ] **Seuils de calage** : part couverte d'une face (50 % provisoire) et écart toléré pour considérer deux faces en contact (20 mm provisoire), à confirmer avec un professionnel.
- [ ] **Seuils d'équilibre** : 55 / 45 et 60 / 40, provisoires, à confirmer avec un professionnel.

## 10. État du projet

- **Étape atteinte** : Cahier des charges fonctionnel V5.9 du 15 novembre 2026 : tableaux triables, indication des modifications non enregistrées, aperçu de l'article sous trois faces, ajoutés pendant le développement du prototype 1 (étape 8b). V5.8 du 4 novembre 2026 : formes non rectangulaires, poids par commande, dimensions mesurées, calage, équilibre, zone « Articles à placer », vérification des saisies et confirmations validés. La V5.2 était validée le 2 novembre 2026. Le brief V4, la note de cadrage V5.3 et le cahier des charges technique V3.9 sont rédigés.
- **Prochaine étape** : suite du développement du prototype 1 avec Claude Code (étape 9, tournées et commandes), d'après les maquettes validées le 4 novembre 2026.
- **Profil du client** : technique (développeur), sans connaissance du métier.
- **Direction artistique** : piste retenue (charte graphique V2) ; ligne directrice pour le maquettiste.
- **Décisions prises** :
  - priorités définitives et répartition par prototype ;
  - blocage avec message pour tout déplacement manuel interdit ;
  - quatre actions après signalement : annuler (la tournée revient en préparation), retirer l'article, retirer la commande, conserver l'article ;
  - commentaire libre facultatif sur chaque signalement ;
  - revérification systématique ;
  - nouvelle simulation proposée et soumise à l'accord de l'opérateur, ou demandée par lui ;
  - articles déjà chargés déplacés seulement si la sécurité ou la fragilité l'exige ;
  - poids chiffré par article, valeur maximale par défaut, utilisé pour le placement sans contrôle de la charge maximale ;
  - une couleur par commande sur le plan ;
  - tous les éléments proposés validés ;
  - pas de compte en V1, mais une conception prête à en accueillir ; accessibilité visée : WCAG 2.2 niveau AA ;
  - charte graphique V2 : thème clair, IBM Plex, une couleur d'interaction, coins francs, aucune ombre décorative, camion présenté comme un plan coté ;
  - code de commande (C1, C2…) sous la même forme partout ;
  - vouvoiement et messages courts ;
  - boîte englobante pour tout article, forme indiquée à titre d'information, dessus porteur ou non (RG-18) ;
  - poids d'une commande sur mesure proposé au prorata du volume, signalé comme estimé et modifiable (RG-03) ;
  - dimensions mesurées facultatives au signalement d'un article plus grand que prévu (RG-12) ;
  - calage (RG-19) : article debout non calé refusé, autres articles mal calés signalés, calcul automatique qui favorise le calage ;
  - équilibre (RG-20) : indicateur avec statut au pire moment de la tournée, plan déséquilibré signalé sans être refusé, calcul automatique qui recherche l'équilibre ;
  - zone « Articles à placer » à côté des vues, avec glisser-déposer ;
  - vérification des saisies (RG-21) : erreurs en rouge sous les champs et résumé, avertissements en ambre, pas de bornes de plausibilité, numéro de commande unique, nom d'article en double seulement signalé ;
  - confirmations (RG-22) avant chaque action destructrice ou irréversible, bouton rouge pour toute perte de données ;
  - fiche article : case « Peut être livré nu », taille nue jamais plus grande qu'emballée, orientations par défaut selon la famille ;
  - camion utilisé par une tournée en cours non supprimable ;
  - tableaux triables par colonne, modèles de camions triés par nom par défaut ;
  - modifications non enregistrées signalées près du bouton d'enregistrement ;
  - aperçu de l'article sous trois faces (dessus, face, côté).
- **Priorités** : définitives, voir la section 2.
- **Points à arbitrer** : aucun.
- **Informations à définir** :
  - partage des données entre bureau et quai ;
  - sanglage ;
  - valeurs réelles ;
  - validation métier ;
  - nom et logo de l'application ;
  - seuils de calage ;
  - seuils d'équilibre.
