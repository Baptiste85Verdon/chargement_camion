Application qui calcule et affiche le plan de chargement d'un camion de livraison à caisse fermée, pour un négoce de matériaux, puis guide l'opérateur étape par étape sur le quai. Deux usages : la **préparation** sur ordinateur, le **mode quai** sur tablette.

L'interface est sobre et professionnelle, avec un caractère d'outil technique. La seule touche ludique, inspirée de Tetris, est réservée au camion. Cette charte est une ligne directrice : un maquettiste peut s'en écarter s'il le juge meilleur, en signalant l'écart.

## Règles en bref

- Thème clair uniquement. Fond de page `fond-page`, cartes en `surface`, texte en `encre`.
- Une seule couleur d'interaction : `action`. Les boutons principaux sont en `encre`, jamais en bleu.
- Coins francs : `rayon-carte` (8 px) au plus pour une carte, `rayon-controle` (4 px) pour un bouton.
- Aucun dégradé. Aucune ombre décorative : seule `ombre-flottant` existe, pour ce qui flotte (menu, info-bulle, fenêtre de confirmation, article en cours de glisser).
- Le camion se lit comme un **plan coté** : quadrillage de 1 m, lignes de cote, repères Fond / Portes en police à chasse fixe.
- Une couleur ne porte jamais seule une information : chaque article affiche son code de commande, chaque état a une icône ou un texte.

## Contenu et ton

- Vouvoiement, toujours.
- Boutons en verbe à l'infinitif, sans ponctuation : « Valider l'étape », « Signaler un problème », « Tout placer », « Passer en mode quai ».
- Messages courts et factuels : ce qui se passe, puis la règle ou l'action. « Rotation refusée : une fenêtre se transporte debout. » « 3 articles ne rentrent pas. Reportez-les ou ajustez le plan. »
- Pas de point d'exclamation, pas de « avec succès », pas d'émoji.
- Les dimensions s'écrivent en millimètres, avec une espace fine pour les milliers : « 7 200 mm », « 1 250 × 120 × 1 480 mm ». Les distances au fond peuvent s'écrire en mètres : « à 5,0 m du fond ».
- Les repères du camion : « Fond (cabine) », « Portes · entrée des articles », « Paroi gauche », « Paroi droite », « vu depuis les portes ».
- Statuts d'une tournée : « En préparation », « Prête », « En chargement », « Chargée ».

## Couleurs

**Structure.** `fond-page` derrière les cartes, `surface` pour les cartes, l'en-tête, les bandeaux et les boutons secondaires. Texte : `encre` pour le principal, `texte-fort` pour les repères et légendes appuyées, `texte-doux` pour le secondaire, `texte-desactive` seulement pour un élément désactivé. Bordures : `bordure` pour les cartes, `bordure-controle` pour un bouton secondaire, `bordure-forte` pour un champ, une case à cocher ou un curseur (3:1 exigé).

**Interaction.** `action` pour les liens, le focus, l'interrupteur activé, le curseur d'étape et l'étape en cours. `info-fond` avec du texte `action-fonce` pour un bouton pressé, une ligne sélectionnée, le bandeau de filtre actif ou la description d'étape.

**Alertes.** Fond `surface`, contour de 1 px `alerte-bordure` sur tout le pourtour, icône triangle `alerte-icone`, titre en `alerte-texte`, corps en `encre`. Jamais de fond crème, jamais de barre colorée sur un seul côté.

**Erreurs.** Le rouge est réservé à ce qui doit être corrigé et aux boutons d'une action qui supprime ou fait perdre des données (supprimer, quitter sans enregistrer, abandonner un signalement) : `erreur` pour le contour de 2 px d'un champ, l'icône et le fond d'un bouton de suppression, `erreur-texte` pour le message. L'ambre reste pour les avertissements, qui n'empêchent pas de continuer. Une erreur a toujours une icône et un texte.

**Camion.** Caisse en `camion-fond`, quadrillage de 1 m en `camion-grille`, contour de 2 px et plancher de 6 px en `camion-contour`, lignes de cote en `cote`.

## Formulaires et confirmations

- Les erreurs de saisie s'affichent sous le champ, jamais dans une fenêtre surgissante. Le champ prend un contour de 2 px `erreur`, et le message est en `erreur-texte` avec l'icône d'erreur : « Indiquez un nombre entier de millimètres, par exemple 1 250. »
- Un avertissement (doublon de nom d'article, poids « estimé ») ne bloque pas : message en `alerte-texte` avec l'icône triangle.
- Chaque champ obligatoire porte « (obligatoire) » en texte après son libellé. L'unité (« mm », « kg ») est à droite dans le champ, en `texte-doux`.
- Les champs sont vérifiés quand on les quitte et à l'enregistrement. Le bouton « Enregistrer » reste toujours actif. À l'enregistrement, un résumé en haut du formulaire (« 2 champs à corriger », contour 1 px `erreur`) liste un lien par champ.
- Une fenêtre de confirmation s'ouvre seulement avant une action destructrice ou irréversible : supprimer, annuler tout le chargement, retirer une commande entière, enregistrer un camion utilisé, quitter sans enregistrer. Voile `voile`, carte `surface` aux coins `rayon-carte` avec `ombre-flottant`, titre en question, conséquence concrète, bouton d'action nommé (sur fond `erreur` quand l'action supprime ou fait perdre des données ; le bouton qui ouvre la fenêtre reste secondaire) et « Annuler », qui reçoit le focus en premier. Échap ferme.

## Commandes

Chaque commande a un couple fond / contour : `cmd1-fond` / `cmd1-bord` jusqu'à `cmd6-fond` / `cmd6-bord` (framboise, orange, vert d'eau, violet, bleu canard, brun). Le texte posé dessus est toujours `encre`.

- Le contour fait toujours 3 px (`contour-bloc`). C'est lui, avec le code, qui distingue les commandes : les fonds pâles sont très proches entre eux, surtout pour les daltoniens.
- De C7 à C12, on reprend les teintes 1 à 6 avec un fond hachuré. Deux commandes qui se suivent n'ont jamais la même teinte.
- Le **code de commande** (C1, C2…) est la signature de l'application. Il a toujours la même forme : cartouche en `code-commande`, fond `cmdN-fond`, contour `cmdN-bord`, coins `rayon-code`. Il apparaît dans les blocs, la légende, l'ordre de chargement, le tableau des placements et la liste d'attente.
- Le code ne descend jamais sous 11 px. Pour un bloc de moins de 24 px de côté à l'écran, il passe dans une étiquette à côté, reliée par un trait `cote`.

## États d'un article

| État | Rendu |
| --- | --- |
| Normal | Fond et contour de sa commande |
| Sélectionné | Anneau `encre` de 3 px collé au bloc |
| Étape en cours | Contour `action` de 4 px, étiquette « Étape n » |
| Focus clavier | Double anneau décalé : 2 px `surface` puis 2 px `action` |
| Atténué (une autre commande est mise en évidence) | Fond `attenue-fond`, contour `attenue-bord` de 2 px, code en `texte-doux`. Jamais d'opacité sur le bloc |
| Silhouette (étape à venir) | Fond `surface`, contour pointillé de 2 px `bordure-forte`, code en `texte-doux` |
| Glisser : position permise | `ombre-flottant`, contour `action`, icône coche et « Position permise » |
| Glisser : position interdite | `ombre-flottant`, contour `alerte-bordure`, icône triangle et la règle enfreinte |

Ces états peuvent se cumuler : ils se distinguent par leur forme, pas seulement par leur couleur.

## Typographie

IBM Plex Sans pour l'interface (`--font-sans`), IBM Plex Mono pour toutes les données : dimensions, positions, poids, cotes, repères, codes de commande (`--font-mono`). Les deux viennent de Google Fonts.

- **Préparation** : `titre-page` pour le titre de page, `titre-section` pour les cartes et cadres de vue, `interface` pour le texte courant et les tableaux, `corps` pour les messages, `bouton` et `bouton-principal` pour les boutons, `legende` et `badge` pour les petits textes, `donnees` pour les chiffres, `repere` pour les repères et les cotes.
- **Mode quai** : le texte se lit à bout de bras, debout. Utiliser `quai-titre` pour l'étape en cours, `quai-corps` pour la description, `quai-bouton` pour les boutons, `quai-donnees` et `quai-code` pour les chiffres et les codes.
- Pas d'autre police. Pas de capitales en dehors de `surtitre`.

## Espacements, formes, cibles

- Espacements : `espace-1` (4 px) à `espace-7` (32 px). Marge de page `espace-7`, écart entre cartes `espace-4`, marge intérieure des cartes `espace-4` en vertical et `espace-5` en horizontal.
- Rayons : `rayon-code` (cartouches), `rayon-bloc` (articles), `rayon-controle` (boutons, champs, bandeaux, badges, caisse), `rayon-carte` (cartes, cadres de vue), `rayon-pilule` pour les interrupteurs uniquement.
- Cibles : `cible-principale` (44 px) pour les boutons principaux en préparation, `cible-barre`, `cible-compacte` et `cible-mini` pour le reste ; `cible-quai` (56 px) pour les boutons principaux du mode quai, et jamais moins de 44 px ailleurs dans ce mode.

## Le plan de chargement

- Deux cadres de vue côte à côte, chacun avec son sélecteur (Dessus, Gauche, Droite, Avant, Arrière). La vue affichée dans un cadre est indisponible dans l'autre. Par défaut : Dessus et Gauche en préparation, Arrière et Dessus en mode quai.
- Repères toujours visibles : « Fond (cabine) » d'un côté, « Portes · entrée des articles » de l'autre avec une flèche d'entrée, plancher marqué.
- Lignes de cote le long de la caisse ; l'article sélectionné affiche ses propres cotes en `action`.
- Les épaisseurs et les textes gardent leur taille quand on zoome.
- Légende des commandes : un cartouche par commande, cliquable pour la mettre en évidence (bouton pressé en `info-fond`).

## Iconographie

Icônes au trait, bouts arrondis, 20 px dans l'interface, 24 px en mode quai, couleur du texte voisin. Lucide est l'option proposée, sans être arrêtée ; une seule famille dans toute l'application. Une icône accompagne un libellé sur les actions importantes, elle ne le remplace pas. Aucun logo pour l'instant : le nom « Plan de chargement » s'écrit en `titre-page`.

## Accessibilité

- Niveau visé : WCAG 2.2 AA. Texte : 4,5:1 au moins. Contour utile (champ, contour de commande, focus) : 3:1 au moins.
- Le focus est toujours visible, en double anneau, distinct de l'étape en cours.
- Chaque article du plan a un nom accessible : « Commande 3, fenêtre, debout, au fond à gauche ».
- Un tableau des placements double toujours les vues du camion.
- Les animations sont courtes et disparaissent si l'appareil demande moins de mouvement.

## À éviter

Les visuels typiques des interfaces générées par IA : fonds crème, accents orange en dehors des alertes, dégradés, verre dépoli, ombres douces décoratives, cartes très arrondies ou à bordure colorée sur un seul côté, émojis en guise d'icônes, polices Inter ou Roboto. Et tout ce qui est flashy.
