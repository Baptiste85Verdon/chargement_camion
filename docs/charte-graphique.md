# Plan de chargement — Charte graphique

**Version V2.4, 4 novembre 2026 : rouge étendu aux actions qui font perdre des données. Version V2.3, 4 novembre 2026 : couleur d'erreur, états des champs, fenêtres de confirmation. Version V2.2, 4 novembre 2026 : indicateur d'équilibre. Version V2.1, 4 novembre 2026 : pictogramme de forme sur les blocs. Version V2, 3 novembre 2026.** Charte relevée sur la maquette « Plan de chargement », puis corrigée : palette des commandes vérifiée pour les daltonismes, articles atténués lisibles, alertes sans fond crème, coins plus francs, lignes de cote, ombres décoratives retirées. Elle sert de ligne directrice aux maquettes Figma et au code. Elle accompagne le cahier des charges fonctionnel V5.8 et le cahier technique V3.8.

La personne qui réalise les maquettes suit les grandes lignes de cette charte. Elle peut s'en écarter si elle le juge nécessaire ou meilleur, en signalant l'écart.

## Principe

L'interface est **sobre et professionnelle**, avec un caractère d'**outil technique** :

- fond gris très clair, cartes blanches, texte presque noir ;
- une seule couleur d'interaction, le bleu `action` ; les boutons principaux sont en `encre`, pas en bleu ;
- des coins francs : 8 px au plus pour les cartes, 4 px pour les boutons ;
- aucun dégradé, aucune ombre décorative.

La **touche Tetris** est réservée au camion. Chaque article est un bloc au fond pâle, au contour coloré de 3 px et aux coins de 3 px, qui porte son code de commande. Le camion se lit comme un **plan coté** : quadrillage de 1 m, lignes de cote, repères Fond / Portes en police à chasse fixe.

La couleur porte toujours un sens précis, et jamais seule : chaque bloc affiche son code de commande (C1, C2…), chaque état a une icône ou un texte.

### Anti-références

L'application ne doit pas ressembler à un site généré par IA :

- pas de fonds crème ni d'accents orange en dehors des alertes ;
- pas de dégradés, de verre dépoli, d'ombres douces décoratives ;
- pas de cartes très arrondies, ni de cartes à bordure colorée sur un seul côté ;
- pas d'émojis en guise d'icônes ;
- rien de flashy.

### Ombres

Une ombre n'est permise que si elle a une fonction : séparer un élément qui flotte au-dessus du contenu.

| Usage | Ombre |
| --- | --- |
| Menu déroulant, info-bulle, panneau de raccourcis, fenêtre de confirmation | `ombre-flottant` |
| Article en cours de glisser-déposer (il « décolle » du plan) | `ombre-flottant` |
| Cartes, boutons, blocs d'articles, bandeaux, camion | Aucune : une bordure suffit |

Le relief intérieur des blocs (`relief-bloc`) de la maquette est supprimé : il était purement décoratif.

## Couleurs, élément par élément

### Structure et texte

| Jeton | Valeur | Élément |
| --- | --- | --- |
| `fond-page` | #F4F5F7 | Fond de page derrière les cartes ; fond des touches kbd |
| `surface` | #FFFFFF | Cartes, en-tête, barre d'outils, boutons secondaires, bandeaux d'alerte, fond des silhouettes |
| `encre` | #1B1F24 | Texte principal, titres ; fond des boutons principaux et de la vue active ; anneau de l'article sélectionné ; texte sur les blocs |
| `texte-fort` | #3B434D | Repères Fond / Portes, lignes de cote, légende des commandes, badge de statut, zoom |
| `texte-doux` | #59616C | Fil d'Ariane, sous-titres de vues, en-têtes de tableau, intitulés du détail, numéros d'étape, code des articles atténués et des silhouettes |
| `texte-desactive` | #8A929C | Vue déjà affichée dans l'autre cadre, interrupteur désactivé |
| `bordure` | #D9DDE3 | Bordures des cartes et séparateurs |
| `bordure-controle` | #B9C0C9 | Contour des boutons secondaires, de vue, de zoom, des kbd |
| `bordure-forte` | #7A828C | Contour au survol ; contour des champs, curseurs et cases à cocher (3,9:1) ; contour en pointillés des silhouettes |
| `bordure-zone` | #9AA3AE | Pointillés de la zone « Articles à placer » |
| `ligne-tableau` | #EEF0F3 | Lignes du tableau des placements |
| `statut-fond` | #EEF1F5 | Badge « En préparation » |

### Camion

| Jeton | Valeur | Élément |
| --- | --- | --- |
| `camion-fond` | #FBFBFC | Intérieur de la caisse |
| `camion-grille` | #E6E9ED | Quadrillage de 1 m |
| `camion-contour` | #7A828C | Contour de la caisse (2 px), plancher (6 px) |
| `cote` | #3B434D | Lignes de cote (1 px) et leurs flèches ; même valeur que `texte-fort` (9,7:1) |

### Interaction et information

| Jeton | Valeur | Élément |
| --- | --- | --- |
| `action` | #1F4FA8 | Liens, anneau de focus, interrupteur activé, contour de l'étape en cours, curseur d'étape, pictogramme de vue, camion filtré (pointillés) |
| `action-fonce` | #163A7C | Texte sur fond info, survol des liens |
| `info-fond` | #EAF0FB | Bandeau de filtre actif, description d'étape, ligne sélectionnée, boutons pressés |
| `info-bordure` | #B8C8EC | Bordure de la description d'étape |

### Survol et appui

| Jeton | Valeur | Élément |
| --- | --- | --- |
| `encre-survol` | #343A42 | Bouton principal au survol |
| `encre-appui` | #0E1114 | Bouton principal pendant l'appui |
| `surface-survol` | = `fond-page` | Bouton secondaire, de vue, de zoom au survol |
| `surface-appui` | = `statut-fond` | Bouton secondaire pendant l'appui |

### Alertes

Les alertes ne reposent plus sur un fond crème : elles sont posées sur `surface`, avec un contour ambre de 1 px sur tout le pourtour, une icône triangle et un titre. Pas de barre colorée sur un seul côté : la carte à bordure gauche colorée est un des clichés visuels des interfaces générées par IA.

| Jeton | Valeur | Élément |
| --- | --- | --- |
| `alerte-bordure` | #A06B12 | Contour de 1 px des messages du validateur, des articles en trop et de la liste des articles cachés ; contour des blocs dont la position est interdite pendant un glisser (4,6:1 sur surface) |
| `alerte-texte` | #5C3A00 | Titre des messages d'alerte (10,2:1 sur surface) ; le corps du message reste en `encre` |
| `alerte-icone` | #8A5300 | Icône triangle (6,3:1 sur surface) |

L'ambre des alertes reste proche de l'orange de C2. Ce n'est pas gênant, car une alerte a toujours un contour, une icône et un titre, et n'apparaît jamais à l'intérieur du camion.

### Erreurs

Le rouge est réservé à ce qui doit être corrigé avant de continuer, et aux boutons d'une action qui supprime ou fait perdre des données (supprimer, quitter sans enregistrer, abandonner un signalement). L'ambre reste pour les avertissements, qui n'empêchent pas de continuer. Une erreur a toujours une icône (cercle avec point d'exclamation) et un texte.

| Jeton | Valeur | Élément |
| --- | --- | --- |
| `erreur` | #B42318 | Contour de 2 px d'un champ en erreur, contour du résumé des erreurs, icône d'erreur, fond du bouton de suppression (texte `surface` dessus : 6,6:1) ; 6,6:1 sur surface |
| `erreur-texte` | #8A1C12 | Message d'erreur sous un champ, titre du résumé des erreurs ; 9,3:1 sur surface |
| `voile` | #1B1F2473 | Voile derrière une fenêtre de confirmation (encre à 45 %) |

Le rouge des erreurs est proche du framboise de C1. Ce n'est pas gênant : les erreurs n'apparaissent que dans les formulaires et les fenêtres, jamais dans le camion, et toujours avec icône et texte.

### Commandes

Chaque commande a un couple fond / contour. Le texte des blocs reste en `encre`.

| Commande | Contour | Fond | Teinte |
| --- | --- | --- | --- |
| C1 | `cmd1-bord` #B03A64 | `cmd1-fond` #F6DCE5 | Framboise |
| C2 | `cmd2-bord` #C26A1E | `cmd2-fond` #F6E3D2 | Orange |
| C3 | `cmd3-bord` #2C8A7E | `cmd3-fond` #D5EDEA | Vert d'eau |
| C4 | `cmd4-bord` #7656B0 | `cmd4-fond` #E7E0F3 | Violet |
| C5 | `cmd5-bord` #1A7FA0 | `cmd5-fond` #D4EAF2 | Bleu canard |
| C6 | `cmd6-bord` #8B5A3C | `cmd6-fond` #EEDFD4 | Brun |

**Pourquoi C5 a changé** : l'olive de la maquette (#6B7A1E) et l'orange de C2 devenaient la même couleur pour une personne protanope. Avec le bleu canard, les six contours restent distincts dans les trois cas testés (vision normale, deutéranopie, protanopie). Le bleu canard reste nettement différent du bleu `action`.

**Les fonds seuls ne suffisent pas** : entre eux, les fonds pâles sont très proches, surtout pour les daltoniens. C'est le contour de 3 px et le code de commande qui identifient une commande. Le contour ne descend donc jamais sous 3 px dans les vues.

**Plus de six commandes** : six teintes pleines pour C1 à C6, les mêmes teintes avec un fond hachuré pour C7 à C12, puis les teintes reviennent, sans jamais donner la même à deux commandes qui se suivent. Le code de commande reste l'identifiant.

### Articles atténués et silhouettes

L'opacité n'est plus utilisée sur les blocs : elle rendait le code illisible (1,7:1).

| Jeton | Valeur | Élément |
| --- | --- | --- |
| `attenue-fond` | #EEF0F3 | Fond des articles des autres commandes quand une commande est mise en évidence |
| `attenue-bord` | #8A929C | Contour de 2 px de ces articles (3,1:1 sur camion-fond) |
| Code atténué | `texte-doux` | Code de commande des articles atténués (5,5:1 sur attenue-fond) |
| Silhouette | `surface` + `bordure-forte` en pointillés | Étapes à venir : fond blanc, contour pointillé de 2 px (3,9:1), code en `texte-doux` (6,3:1) |
| Ligne atténuée | `texte-doux` + cartouche atténué | Étapes à venir et autres commandes dans l'ordre de chargement (la maquette utilisait une opacité de 0,5) |

## Code de commande

Le code de commande est la signature de l'application. Il a **toujours la même forme**, partout où il apparaît :

- dans les blocs du camion ;
- dans la légende ;
- dans l'ordre de chargement et la vue par étape ;
- dans le tableau des placements, la zone « Articles à placer » et la liste d'attente.

Il s'agit d'un cartouche : texte « C1 » en `code-commande`, fond `cmdN-fond`, contour de 2 px `cmdN-bord`, coins de 2 px. Dans les blocs du camion, le fond et le contour du bloc font office de cartouche.

**Taille minimale** : 11 px. Quand un bloc est trop petit pour l'afficher (moins de 24 px de côté à l'écran), le code passe dans une étiquette à côté du bloc, reliée à lui par un trait fin `cote`.

## Plan coté

Le camion se lit comme un plan technique :

- **Quadrillage** de 1 m en `camion-grille`.
- **Lignes de cote** le long de la caisse : longueur sous la vue, largeur ou hauteur sur le côté. Trait de 1 px `cote`, petites flèches aux extrémités, valeur en `repere` (« 7 200 mm »).
- **Cote de l'article sélectionné** : ses dimensions et sa distance au fond s'affichent en lignes de cote, en `action`.
- **Repères** « Fond (cabine) » et « Portes · entrée des articles » en `repere`.

Les cotes restent à taille lisible quand on zoome, comme les repères.

## États des blocs : sélection, étape, focus

Trois indications peuvent se cumuler sur un même bloc. Elles se distinguent par leur forme, pas seulement par leur couleur.

| État | Rendu |
| --- | --- |
| Sélectionné | Anneau `encre` de 3 px, collé au bloc |
| Étape en cours | Contour `action` de 4 px, étiquette « Étape n » et flèche depuis les portes |
| Focus clavier | Double anneau décalé de 2 px : 2 px `surface` puis 2 px `action` |
| Forme non rectangulaire | Pictogramme de forme (cylindre ou forme libre) de 14 px dans un coin, en `texte-fort`. Le bloc reste rectangulaire : il montre la place réservée, la boîte englobante |

## Formulaires

| État du champ | Rendu |
| --- | --- |
| Normal | Fond `surface`, contour de 1 px `bordure-forte`, coins `rayon-controle`, hauteur `cible-compacte` (36 px), 44 px en mode quai |
| Focus | Double anneau décalé, comme partout |
| Erreur | Contour de 2 px `erreur` ; dessous, icône d'erreur et message en `erreur-texte`, style `legende` |
| Avertissement | Contour inchangé ; dessous, icône triangle `alerte-icone` et message en `alerte-texte` |
| Désactivé | Fond `fond-page`, texte `texte-desactive`, contour en pointillés |

- **Libellé** au-dessus du champ, en `bouton` (13 px, 600). La mention « (obligatoire) » le suit, en `interface`, couleur `texte-doux`. Jamais d'astérisque seul.
- **Unité** à droite dans le champ, en `texte-doux` : « mm », « kg ».
- **Résumé des erreurs** en haut du formulaire, à l'enregistrement : contour de 1 px `erreur`, titre « 2 champs à corriger » en `erreur-texte`, puis un lien `action` par champ.
- **Bouton d'enregistrement** : toujours actif.

## Fenêtres de confirmation

- Réservées aux actions destructrices ou irréversibles, jamais aux erreurs de saisie.
- Voile `voile` sur toute la page, carte `surface` de 400 px de large au plus, coins `rayon-carte`, `ombre-flottant`.
- Titre en question, en `titre-section` ; conséquence en `corps`.
- Boutons : l'action nommée (« Supprimer l'article ») à gauche, sur fond `erreur` pour une action qui supprime ou fait perdre des données et en `encre` sinon ; « Annuler » en bouton secondaire. Le bouton qui ouvre la fenêtre (« Supprimer » dans une liste) reste en style secondaire. Le focus va d'abord sur « Annuler ».

## Indicateur d'équilibre

- **Jauge gauche / droite** : deux segments, `encre` pour la gauche et `surface` pour la droite, dans un contour de 1 px `bordure-forte`. Les pourcentages et les tonnes sont toujours écrits en texte.
- **Statut** : « Équilibré » avec une icône coche, ou « À surveiller » et « Déséquilibré » avec l'icône triangle et un contour `alerte-bordure`.
- **Centre de gravité** sur la vue de dessus : une croix dans un cercle `action` de 22 px, libellé « CG » en `action-fonce`, et l'axe longitudinal en pointillés `cote`.
- **Au fil de la tournée** : un tableau compact, en `interface` pour les libellés et `donnees` pour les chiffres.

## Composants

Chaque composant a sa fiche avec un aperçu de tous ses états :

- **Bouton** : principal, secondaire, secondaire pressé, texte, icône, petit, avec normal, survol, appui, focus et désactivé.
- **Sélecteur** : vues, mode d'affichage, profondeur, mise en évidence d'une commande, interrupteur d'aimantation.
- **Bandeau** : alerte du validateur, filtre actif, description d'étape, articles cachés.
- **Bloc d'article** : neuf états (dont survol, position permise ou interdite pendant un glisser), atténué, silhouette, et la palette des commandes 1 à 12.
- **Code de commande** : cartouche, étiquette reliée pour les petits blocs.
- **Ligne de cote** : cote de caisse, cote d'article sélectionné.
- **Équilibre** : jauge, statut, marqueur du centre de gravité, tableau au fil de la tournée.
- **Champ** : normal, focus, erreur, avertissement, désactivé ; résumé des erreurs.
- **Fenêtre de confirmation** : ton danger et ton neutre.
- **Carte** : carte, zone « Articles à placer », article à placer ou en trop, badge, touche clavier, panneau de détail.

## Icônes

**Lucide** est proposé comme option, sans être arrêté : icônes au trait, bouts arrondis, gratuites (licence ISC), avec un paquet pour Vue. Le maquettiste peut proposer une autre famille au trait. Une seule famille d'icônes est utilisée dans toute l'application, et les icônes ne remplacent jamais un libellé sur les actions importantes.

## Ton des textes

- Vouvoiement.
- Boutons en verbe à l'infinitif : « Valider l'étape », « Signaler un problème », « Tout placer ».
- Messages courts et factuels, qui disent ce qui se passe puis quoi faire : « Rotation refusée : une fenêtre se transporte debout. »
- Pas de points d'exclamation ni de « avec succès ».

## Typographie

Deux familles Google Fonts, gratuites : **IBM Plex Sans** pour l'interface et **IBM Plex Mono** pour les données (codes, dimensions, positions, cotes, repères). Le mono aligne les chiffres et renforce le côté plan technique.

### Préparation (ordinateur)

| Style | Famille | Taille / graisse / interligne | Élément |
| --- | --- | --- | --- |
| `titre-page` | Sans | 24 px / 700 / 1,2, −0,01 em | Titre de page |
| `titre-article` | Sans | 17 px / 600 / 1,3 | Nom de l'article sélectionné |
| `titre-section` | Sans | 16 px / 600 / 1,3 | Titres des cartes et cadres de vue |
| `corps` | Sans | 14 px / 400 / 1,5 | Messages, description d'étape |
| `bouton-principal` | Sans | 14 px / 600 / 1,2 | Boutons principaux |
| `interface` | Sans | 13 px / 400 / 1,45 | Texte courant, tableau, ordre |
| `bouton` | Sans | 13 px / 600 / 1,2 | Boutons secondaires, sélecteurs |
| `legende` | Sans | 12 px / 400 / 1,4 | Sous-titres, légende |
| `badge` | Sans | 12 px / 600 / 1,2 | Badge, boutons de profondeur |
| `surtitre` | Sans | 12 px / 600 / 1,2, capitales, +0,06 em | « ARTICLE SÉLECTIONNÉ » |
| `donnees` | Mono | 13 px / 400 / 1,45 | Dimensions, positions, poids |
| `code-commande` | Mono | 11 px / 600 / 1 | C1, C2… dans les blocs et les cartouches ; jamais en dessous de 11 px |
| `repere` | Mono | 11 px / 400 / 1,2 | Repères Fond / Portes, cotes, kbd |

### Mode quai (tablette)

Le mode quai se lit à bout de bras, souvent debout. Ses tailles sont plus grandes :

| Style | Famille | Taille / graisse / interligne | Élément |
| --- | --- | --- | --- |
| `quai-titre` | Sans | 28 px / 700 / 1,2 | Étape en cours (« Étape 7 sur 12 ») |
| `quai-corps` | Sans | 18 px / 400 / 1,5 | Description de l'article et de son emplacement |
| `quai-bouton` | Sans | 18 px / 600 / 1,2 | Valider l'étape, Signaler un problème |
| `quai-donnees` | Mono | 16 px / 400 / 1,4 | Dimensions, distance au fond |
| `quai-code` | Mono | 14 px / 600 / 1 | Code de commande dans les blocs |

## Espacements, rayons, tailles

- **Espacements** : 4, 8, 12, 16, 20, 24 et 32 px (`espace-1` à `espace-7`).
- **Rayons**, volontairement francs :

| Jeton | Valeur | Élément |
| --- | --- | --- |
| `rayon-code` | 2 px | Cartouches de code de commande, pastilles |
| `rayon-bloc` | 3 px | Blocs d'articles, touches kbd |
| `rayon-controle` | 4 px | Boutons, champs, bandeaux, badges, caisse du camion, cartes d'articles à placer |
| `rayon-carte` | 8 px | Cartes et cadres de vue |
| `rayon-pilule` | 999 px | Interrupteurs uniquement |

- **Cibles** : 44 px (principales), 40, 36 et 32 px en préparation ; **56 px** pour les boutons principaux du mode quai, et 44 px au minimum pour tout le reste du mode quai. Toutes dépassent le minimum WCAG de 24 px.

## Accessibilité

Tous les textes atteignent au moins 4,5:1, et tous les contours utiles à la compréhension au moins 3:1. Les points corrigés depuis la maquette :

- **Champs et cases à cocher** : contour `bordure-forte` (3,9:1), jamais `bordure-controle` (1,8:1).
- **C1** : framboise au lieu du bleu de la maquette, trop proche d'`action`.
- **C5** : bleu canard au lieu de l'olive, que l'on confondait avec C2.
- **Articles atténués** : plus d'opacité ; fond gris et code lisible.
- **Code de commande** : 11 px au minimum, étiquette reliée pour les petits blocs.
- **Focus** : double anneau décalé, distinct de l'étape en cours.

## Ce que la maquette ne définit pas encore

- Disposition de chaque formulaire : à dessiner avec les écrans concernés, en suivant la section Formulaires.
- Rendu exact des lignes de cote et des étiquettes reliées : à dessiner dans Figma.
- Mode sombre : aucun ; à décider seulement si le mode quai en a besoin.
