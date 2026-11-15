# Cahier des charges technique — Application de plan de chargement de camions

Nov 2, 2026 · @Baptiste Verdon

**Version V3.11, 15 novembre 2026 : zoom par Ctrl + molette et pincement à deux doigts (5.11), exception WCAG 2.5.8 pour les blocs du plan, articles du plan nommés par un bouton HTML posé sur le dessin (6). Version V3.10, 16 novembre 2026 : commandes enregistrées en une seule opération (fonctions SQL), lignes modifiées en place, plan « à recalculer », rang d'origine dans la liste d'attente, texte d'aide sous le champ. Version V3.9, 15 novembre 2026 : composant de tableau triable, indication des modifications non enregistrées (6.1), alignement des nombres, lignes de cote en composant, unité d'affichage en point ouvert. Version V3.8, 4 novembre 2026 : formulaires (RG-21) et fenêtres de confirmation (RG-22). Version V3.7, 4 novembre 2026 : seuil d'appui provisoire fixé à 60 %, statut d'équilibre jugé sur les pourcentages affichés. Version V3.6, 4 novembre 2026 : choix du meilleur plan (variantes et échanges), mesure de l'équilibre (RG-20) et son indicateur, zone « Articles à placer » près des vues. Version V3.5, 4 novembre 2026 : calage des articles (RG-19) dans le validateur et le placeur, jeu d'essai « couloirs » chiffré. Version V3.4, 4 novembre 2026 : boîte englobante et dessus porteur (RG-18), poids effectif d'une ligne de commande, dimensions mesurées au signalement. Version V3.3, 3 novembre 2026 : charte graphique dans le code (polices, icônes, jetons), rendu des blocs, lignes de cote, atténuation sans opacité. Version V3.2, validée le 2 novembre 2026 (accès au déchargement en 3D, critère de compacité, jeu d'essai « couloirs » ; précisions sur les silhouettes et le filtre de profondeur).** Ce document traduit en choix techniques le cahier des charges fonctionnel V5.9, la note de cadrage V5.3, le brief V4 et la charte graphique V2.4. Les références RG renvoient aux règles de gestion du cahier fonctionnel. Il sert de spécification de départ pour le développement avec Claude Code.

## 1. Architecture générale

L'application est une application web monopage. Tout ce qui calcule s'exécute dans le navigateur, et le serveur ne fait que stocker les données.

&#91;embedded content: Architecture V1 · l'API maison en pointillés viendra plus tard\]

L'algorithme et son validateur sont le cœur du projet. Ils ne dépendent ni de Vue ni de Supabase, ce qui les rend testables seuls.

La couche d'accès aux données est le seul endroit qui connaît Supabase. Le jour où votre propre API arrivera, elle se branchera à cet endroit sur la même base, sans toucher au reste de l'application.

## 2. Choix techniques

Le choix de Vue et TypeScript est pressenti, mais pas encore définitivement acté. Les autres choix en découlent.

| Domaine | Choix | Raison |
| --- | --- | --- |
| Langage | TypeScript, en mode strict | Typage des dimensions, des positions et des règles, qui évite beaucoup d'erreurs dans l'algorithme |
| Interface | Vue 3 (Composition API) + Vite | Choix du porteur ; Vite est l'outil de construction standard de Vue |
| Navigation | Vue Router | Une route par page de l'arborescence |
| État | Pinia | Bibliothèque d'état officielle de Vue ; elle garde la tournée et le plan en cours |
| Plan 2D | SVG dessiné par des composants Vue | Chaque article est un élément du DOM : il peut recevoir le focus, être décrit aux lecteurs d'écran et être déplacé |
| Algorithme | Module TypeScript maison, sans dépendance | Objectif d'apprentissage, testable seul, exécuté dans le navigateur |
| Données | Supabase (PostgreSQL), via sa bibliothèque JavaScript officielle | Offre gratuite, SQL standard réutilisable par une future API, authentification disponible pour plus tard |
| Hors connexion | PWA (application installable) avec cache local | Souhaitable, reportable en V2 |
| Tests | Vitest (unitaires et composants), Playwright (bout en bout, non-régression, visuel), axe-core (accessibilité) | Démarche TDD et contrôle automatique de l'accessibilité |
| Qualité du code | ESLint + Prettier, SonarQube Cloud (offre gratuite) | Style homogène et analyse continue de la qualité (bugs, failles, duplication), utiles quand le code est en partie généré |
| Dépôt et intégration continue | GitHub + GitHub Actions | Tests lancés à chaque modification |
| Maquettes | Figma | Référence visuelle pour la comparaison faite avec Playwright |
| Typographies | IBM Plex Sans et IBM Plex Mono, auto-hébergées via les paquets Fontsource | Gratuites (licence OFL) ; servies avec l'application, sans appel à un service tiers |
| Icônes | Lucide (`lucide-vue-next`), en option | Gratuites (licence ISC), au trait ; remplaçables si le maquettiste choisit une autre famille |
| Jetons de design | Fichier `plan-de-chargement.tokens.json` (format des jetons du W3C), converti en variables CSS | Une seule source pour les couleurs, typographies, rayons et épaisseurs, partagée avec Figma |

## 3. Modèle de données

Toutes les dimensions sont stockées en **millimètres entiers** et les poids en **kilogrammes**. Les entiers évitent les erreurs d'arrondi dans les calculs de chevauchement.

**Repère du camion**

L'origine est le coin du fond, côté gauche, au plancher.

- **x** : la longueur, du fond vers les portes.
- **y** : la largeur, de gauche à droite.
- **z** : la hauteur.

| Table | Colonnes principales | Remarques |
| --- | --- | --- |
| `article` | id, référence (facultative), nom, famille, longueur, largeur et hauteur emballées, longueur, largeur et hauteur nues (facultatives), poids, fragile, orientations autorisées, forme, dessus\_porteur, date d'archivage (facultative) | Référence unique parmi les articles actifs. Un article utilisé ne se supprime pas, il s'archive (RG-21). Dimensions de la boîte englobante (RG-18). Orientations parmi : à plat, debout, contre une paroi (RG-02, RG-04). Forme parmi : rectangulaire, cylindrique, irrégulière ; dessus\_porteur vaut faux par défaut pour une forme non rectangulaire |
| `modele_camion` | id, nom, longueur, largeur et hauteur utiles, date d'archivage (facultative) | Données d'exemple au premier lancement (RG-01). Un camion utilisé ne se supprime pas, il s'archive ; pas d'archivage pendant une tournée en préparation, prête ou en chargement (RG-21) |
| `tournee` | id, référence (unique, T-2026-118), date, modele\_camion\_id, statut | Statuts : en préparation, prête, en chargement, chargée. Date et camion vides tant qu'ils sont à fixer ; obligatoires dès que la tournée quitte l'état « en préparation » |
| `commande` | id, tournee\_id (vide si en attente), numéro, destination, ville (facultative), rang de livraison | Le rang fixe l'ordre de chargement (RG-07) |
| `ligne_commande` | id, commande\_id, numéro de ligne, article\_id, quantité, emballé ou nu, dimensions propres à la commande (facultatives), poids propre à la commande (facultatif), poids estimé (oui ou non) | Ces valeurs ne modifient jamais le catalogue. Le poids proposé au prorata du volume est marqué estimé (RG-03), arrondi au dixième de kilogramme. Le numéro de ligne garde l'ordre de saisie ; il est unique dans la commande, vérifié en fin de transaction (contrainte différable), pour qu'un réordonnancement puisse échanger deux numéros. Une ligne modifiée garde son identifiant |
| `plan_chargement` | id, tournee\_id, numéro de version, date de calcul, à recalculer (oui ou non) | Une nouvelle version à chaque simulation, pour garder l'historique. Une version ne se modifie pas, sauf sa marque « à recalculer », posée quand le camion de la tournée change (RG-22) |
| `placement` | id, plan\_id, ligne\_commande\_id, numéro d'unité, x, y, z, orientation, rang de chargement, statut | Un placement par unité physique ; il sert aussi d'étape de chargement, avec les statuts à faire, chargé et en problème |
| `signalement` | id, placement\_id, type, commentaire, longueur, largeur et hauteur mesurées (facultatives), action, résultat de la revérification, date | RG-12 à RG-16 |
| `element_attente` | id, commande\_id, ligne\_commande\_id (vide si toute la commande), tournée d'origine, rang d'origine, motif, date du report | Motifs : dépassement ou signalement (RG-11, RG-13). Le rang d'origine donne le code affiché (C5) : une commande entière en attente n'a plus de rang à elle |

En V1, sans compte, les règles de sécurité de Supabase (sécurité au niveau des lignes) restent ouvertes. Elles seront fermées et liées aux utilisateurs quand les comptes arriveront (RG-17).

## 4. Algorithme de placement

### 4.1 Le principe

Trouver la disposition **optimale** de boîtes dans un volume est un problème réputé très difficile. On vise donc une **bonne** solution, avec une méthode gloutonne simple et compréhensible. On range les articles un par un, dans un ordre réfléchi, chacun à la première place valide trouvée. C'est le principe du « premier emplacement qui convient ».

L'algorithme repose sur deux modules distincts :

- le **validateur** répond à une seule question : « ce placement est-il permis ? » ;
- le **placeur** cherche des places et interroge le validateur.

Le même validateur sert à l'ajustement manuel (RG-08, RG-09) et à la revérification en mode quai (RG-14).

### 4.2 Le validateur

Pour un article placé à une position et dans une orientation données, le validateur contrôle les points suivants.

1. **Dans la caisse** : l'article ne dépasse d'aucune paroi (RG-06).
2. **Sans chevauchement** : il n'occupe le volume d'aucun autre article (RG-06).
3. **Orientation autorisée** : à plat, debout ou contre une paroi selon l'article (RG-04). « Contre une paroi » exige un contact avec un côté de la caisse.
4. **Appui** : s'il n'est pas au plancher, il repose sur au moins `SEUIL_APPUI` de sa base, soit 60 % à titre provisoire, voir les points ouverts (RG-04).
5. **Fragiles et dessus non porteurs** : rien n'est posé sur un article fragile ou dont le dessus n'est pas porteur (RG-04, RG-18).
6. **Lourds en bas** : un article ne repose pas sur un article plus léger que lui (RG-04, RG-05).

   Les règles 5 et 6 sont contrôlées dans les deux sens : ce qui porte l'article, et ce qui est posé sur lui.

7. **Accès au déchargement (RG-07)** : pour un article A, est gênant tout article situé entre A et les portes qui chevauche A en largeur et occupe une hauteur entre le plancher et le dessus de A, c'est-à-dire dont le bas est plus bas que le dessus de A. Tout article gênant doit être livré au plus tard en même temps que A. C'est aussi le cas de tout article posé sur A. Un article livré tôt peut donc être plus au fond dans un autre couloir, ou posé sur des articles livrés plus tard s'il n'a devant lui, dans sa bande, que des articles livrés au plus tard en même temps que lui.
8. **Calage des articles debout (RG-19)** : un article debout a au moins une grande face en contact avec une paroi, ou avec des articles qui couvrent au moins `SEUIL_CALAGE` de cette face (0,5 provisoire). Deux faces sont en contact quand leur écart ne dépasse pas `TOLERANCE_CONTACT` (20 mm provisoire). Les articles debout en contact forment un groupe, calculé de proche en proche : au moins l'un d'eux doit s'appuyer contre une paroi ou contre un article qui n'est pas debout.
9. **Articles debout au plancher (RG-04)** : un article debout ou contre une paroi est posé au plancher, et rien n'est posé sur lui. Comme les règles 5 et 6, elle est contrôlée dans les deux sens.
10. **Lourds au plancher (RG-04)** : un article de plus de `POIDS_LOURD` (500 kg) n'a pas sa base à plus de `HAUTEUR_MAX_LOURD` (1 000 mm) du plancher. Les deux valeurs sont provisoires, voir les points ouverts.

À côté des règles, le validateur fournit `diagnostiquerCalage`. Cette fonction liste les autres articles mal calés : ceux sans contact côté fond, ou sans contact d'aucun côté en largeur. C'est un avertissement, jamais un refus.

Le validateur ne renvoie pas un simple oui ou non. Il renvoie la liste des règles enfreintes, ce qui alimente directement les messages explicatifs de l'interface.

### 4.3 Le placeur, étape par étape

1. **Préparer les unités** : chaque ligne de commande est éclatée en autant d'unités que sa quantité. Chaque unité reçoit ses dimensions effectives : celles de la commande si elles existent, sinon celles du catalogue, nues ou emballées. Son poids effectif suit la même règle : celui de la ligne de commande s'il existe, sinon celui du catalogue.
2. **Trier** : d'abord par rang de livraison décroissant, puisque la dernière commande livrée va au fond. Puis, à l'intérieur d'une commande, les plus lourds d'abord, et à poids égal les plus volumineux.
3. **Tenir une liste de points candidats** : au départ, il n'y en a qu'un, le coin du fond au plancher (0, 0, 0).
4. **Chercher une place** pour chaque unité : on essaie chaque orientation autorisée sur chaque point candidat, en parcourant les points du fond vers les portes, puis du bas vers le haut. Parmi les essais que le validateur accepte, on retient celui qui a le meilleur score. Le premier critère est la **compacité** : on préfère la position qui laisse le plus de longueur libre côté portes, donc celle qui comble les espaces vides au fond et sur les côtés. Le deuxième critère est le **calage** : il départage les positions de compacité égale ou proche (moins de 100 mm d'écart, valeur provisoire), en préférant la plus grande surface de contact avec les parois et les autres articles. Seules les faces verticales comptent : le fond, les parois latérales et les autres articles, à `TOLERANCE_CONTACT` près ; ni le plancher ni le dessus, puisque le calage empêche de glisser sur les côtés. Le troisième critère, en cas d'égalité, est l'équilibre du poids entre la gauche et la droite.
5. **Mettre à jour les points** : une fois l'unité placée, on ajoute trois nouveaux points candidats à ses coins. Le premier est devant elle, côté portes, le deuxième à côté d'elle dans le sens de parcours, le troisième au-dessus. Une variante ajoute en plus un quatrième point : le point « à côté », poussé jusqu'à la paroi d'en face, à la même distance du fond et à la même hauteur. Sans lui, le placeur n'atteint jamais la paroi opposée et la charge penche d'un côté.
6. **Gérer le dépassement** : une unité qui ne trouve aucune place est mise dans la liste des articles en trop (RG-10).
7. **Produire le résultat** : la liste des placements, dans l'ordre où ils ont été trouvés, est aussi l'ordre de chargement. Le résultat comprend en plus la liste des articles en trop.

### 4.4 Choisir le meilleur plan

Un seul passage du placeur ne regarde l'équilibre qu'en dernier recours. On cherche donc le meilleur plan en deux temps.

1. **Plusieurs variantes** : le placeur est lancé plusieurs fois, seize fois à titre provisoire. Chaque variante change une seule chose :
   - le sens de parcours en largeur, de la gauche vers la droite ou l'inverse, pour tout le plan ou commande par commande ;
   - l'ordre des unités de même rang et de poids proche ;
   - la présence du point contre la paroi opposée (4.3, étape 5).

   Les seize variantes croisent quatre sens de parcours (tout depuis la gauche, tout depuis la droite, en alternant commande par commande à partir de la gauche, puis à partir de la droite) avec deux ordres (l'ordre du tri, puis l'ordre inversé dans chaque groupe d'unités consécutives de même rang et de poids proche), chacune sans puis avec le point contre la paroi opposée. Deux unités sont de poids proche quand la plus légère pèse au moins 90 % de la plus lourde (`ECART_POIDS_PROCHE`, provisoire).
2. **Comparer les variantes**, dans cet ordre :
   - le moins d'articles en trop ;
   - le moins d'articles mal calés (`diagnostiquerCalage`) ;
   - le meilleur équilibre, mesuré au pire moment de la tournée (`mesurerEquilibre`) ;
   - la compacité.

   Une fois que tout rentre, un plan équilibré vaut mieux qu'un plan plus compact. Pour comparer deux plans, l'équilibre se mesure sur la part brute, sans arrondi, afin de départager des plans proches ; le statut affiché reste jugé sur les pourcentages arrondis (4.5).
3. **Améliorer par échanges** : sur le meilleur plan, on essaie d'échanger deux unités de même encombrement (à 20 mm près) situées de part et d'autre de l'axe, ou deux couloirs entiers de même longueur. Un échange est gardé si le validateur l'accepte, s'il ne crée aucun article mal calé et s'il améliore l'équilibre. On recommence jusqu'à ne plus rien améliorer, dans la limite d'un nombre maximal d'essais (`MAX_ESSAIS_ECHANGES`, 500, provisoire).
   - **Couloir** : pour les échanges, c'est l'ensemble des unités qui occupent exactement la même bande en largeur. Deux couloirs s'échangent s'ils sont de part et d'autre de l'axe et de même forme : autant d'unités, de même encombrement, aux mêmes positions relatives, à 20 mm près. Chaque unité prend alors la place de son homologue, empilements compris.
   - **Ce qui bouge** : un échange ne déplace aucune position et ne change aucun rang de chargement ; seules les unités changent de place. L'ordre de chargement reste donc réalisable.

Ces trois étapes forment la fonction `optimiser`, appelée par le calcul du plan et par la nouvelle simulation.

### 4.5 Mesurer l'équilibre

- Le centre de gravité de la charge se calcule à partir du poids et du centre de chaque unité : `cgX = Σ poids × x_centre / Σ poids`, de même pour `cgY`.
- La part portée par chaque côté s'en déduit : `partGauche = (largeur − cgY) / largeur` et `partDroite = cgY / largeur`, puisque y part de la paroi gauche.
- La mesure est faite au départ, puis après chaque livraison, en retirant les unités des commandes déjà livrées.
- Le statut retient la plus forte part d'un côté sur toute la tournée : « Équilibré » jusqu'à 55 %, « À surveiller » jusqu'à 60 %, « Déséquilibré » au-delà (`SEUILS_EQUILIBRE`, provisoires). Le statut se juge sur les pourcentages arrondis à l'unité, tels qu'ils sont affichés : un plan affiché à 55 / 45 est donc « Équilibré ». Les tonnes sont arrondies séparément, si bien que leur somme peut différer du total de 0,1 t.
- Un plan vide n'a aucune étape mesurée, et son statut vaut « Équilibré ». Une étape sans poids, après la dernière livraison, n'est pas mesurée.

### 4.6 Revérification et nouvelle simulation

- **Revérification (RG-14)** : on repasse chaque placement restant dans le validateur, en tenant compte de l'état réel du camion. C'est rapide et cela ne déplace rien. Si le signalement porte des dimensions mesurées, l'unité concernée est revérifiée avec ces dimensions.
- **Nouvelle simulation (RG-15, RG-16)** : on relance le placeur avec le choix du meilleur plan (4.4). Les articles déjà chargés sont considérés comme fixes, ils servent d'obstacles. Si aucune solution n'est trouvée, on relance en autorisant le déplacement d'articles déjà chargés, uniquement pour des raisons de sécurité ou de fragilité. L'interface liste alors ce qu'il faut décharger.

### 4.7 Les signatures des fonctions

```ts
type Orientation = 'aPlat' | 'debout' | 'contreParoi' // la rotation qui en découle est décrite sous ce bloc

interface Unite { id: string; commandeRang: number; dims: { l: number; w: number; h: number }; poids: number; fragile: boolean; porteur: boolean; orientations: Orientation[] } // dims : boîte englobante (RG-18) en pose à plat
interface Placement { uniteId: string; x: number; y: number; z: number; orientation: Orientation; rang: number }

function valider(p: Placement, plan: Placement[], unites: Unite[], camion: Camion): RegleEnfreinte[] // unites : dimensions et orientations autorisées de chaque unité du plan
function placer(unites: Unite[], camion: Camion, fixes?: Placement[]): { placements: Placement[]; enTrop: Unite[] }
function diagnostiquerCalage(plan: Placement[], unites: Unite[], camion: Camion): string[] // unités mal calées : avertissement, pas un refus ; unites comme pour valider
function mesurerEquilibre(plan: Placement[], unites: Unite[], camion: Camion): { etapes: { apres: number | null; partGauche: number; cgX: number; cgY: number }[]; statut: 'equilibre' | 'aSurveiller' | 'desequilibre' } // apres : rang de la dernière commande livrée (null au départ)
function optimiser(unites: Unite[], camion: Camion, fixes?: Placement[]): { placements: Placement[]; enTrop: Unite[] } // variantes, comparaison, échanges (4.4)
function projeter(p: Placement, unite: Unite, camion: Camion, vue: Vue): { uniteId: string; rect: Rectangle; profondeur: { proche: number; loin: number } } // 5.8
function projeterPlan(plan: Placement[], unites: Unite[], camion: Camion, vue: Vue): (Projection & { cache: boolean })[] // ordre de dessin, articles cachés (5.10)
function vuesOuVisible(uniteId: string, plan: Placement[], unites: Unite[], camion: Camion): Vue[] // vues où l'article se voit (5.10)
function coterCaisse(camion: Camion, vue: Vue): Cote[] // cotes de la caisse (5.13)
function coter(p: Placement, unite: Unite, camion: Camion, vue: Vue): Cote[] // cotes de l'article sélectionné (5.13)
```

**Orientation et encombrement** : `Unite.dims` décrit la boîte englobante de l'article posé à plat, longueur selon x, largeur selon y, hauteur selon z. Mettre une unité debout revient à la faire pivoter d'un quart de tour autour de sa longueur. La longueur reste selon x, la largeur et la hauteur s'échangent. « Contre une paroi » est la même pose que « debout », avec en plus un contact obligatoire avec la paroi gauche ou la paroi droite, à `TOLERANCE_CONTACT` près. Par exemple, une fenêtre de 1 500 × 1 350 × 180 mm à plat occupe 1 500 × 180 × 1 350 mm debout.

Ces fonctions sont **pures** : elles ne lisent et n'écrivent rien en dehors de leurs paramètres. C'est ce qui permet de les développer en TDD, avec un test par règle de gestion.

## 5. Plan 2D interactif

### 5.1 Rendu

- Cinq vues SVG, toutes calculées à partir des mêmes placements (détail en 5.8). Deux cadres de vue sont affichés côte à côte ou l'un sous l'autre, chacun avec son propre sélecteur. Chaque cadre peut afficher n'importe laquelle des cinq vues, sauf celle déjà affichée dans l'autre cadre.
- Le `viewBox` de chaque vue est exprimé directement en millimètres, aux dimensions de la caisse. Le navigateur gère l'échelle : aucune conversion manuelle, et le rendu s'adapte à la taille de l'écran.
- Chaque article est dessiné comme un bloc : fond `cmdN-fond`, contour de 3 px `cmdN-bord`, coins de 3 px, et son code de commande (C1, C2…) en IBM Plex Mono. C'est la touche Tetris. Le code garantit que la couleur n'est jamais le seul repère.
- Comme le `viewBox` est en millimètres, les épaisseurs et les textes sont fixés en pixels écran : `vector-effect: non-scaling-stroke` pour les contours, et un calque de libellés (codes, cotes, repères) positionné à partir des coordonnées du plan mais dessiné à taille fixe. Ainsi un contour de 3 px reste de 3 px quel que soit le zoom.
- Le code de commande ne descend jamais sous 11 px. Si un bloc mesure moins de 24 px de côté à l'écran, le code est placé dans une étiquette à côté du bloc, reliée par un trait fin.
- Aucune ombre sur les blocs : seul l'article en cours de glisser-déposer reçoit `ombre-flottant`.
- Un article cylindrique ou irrégulier porte un pictogramme de forme de 14 px dans un coin du bloc. Le bloc reste rectangulaire, puisqu'il représente la place réservée (RG-18).
- Sélectionner un article dans une vue le met en évidence dans l'autre.

### 5.2 Glisser-déposer

Le glisser-déposer s'appuie sur les Pointer Events du navigateur. Ils gèrent la souris, le doigt et le stylet avec le même code.

1. **Saisie** : l'article suit le pointeur. Dans la vue de dessus, on modifie x et y ; dans la vue de côté, on modifie x et z.
2. **Pendant le déplacement** : le validateur est consulté en continu. Le contour indique si la position est permise, toujours accompagné d'une icône et d'un court texte, jamais par la couleur seule.
3. **Élévation** : l'article saisi reçoit l'ombre `ombre-flottant`, la seule ombre du plan, pour montrer qu'il « décolle ».
4. **Aimantation désactivable** : près d'une paroi ou du bord d'un autre article, la position s'y colle. Elle est activée par défaut ; un interrupteur permet de la désactiver ou de la réactiver à tout moment, et le choix est mémorisé sur l'appareil. Aucune simulation physique (gravité, glissement) n'est faite en V1 : la fidélité repose sur le validateur.
5. **Dépôt** : une position permise est enregistrée et l'ordre de chargement est recalculé. Une position interdite est refusée : l'article revient à sa place et un message cite la règle enfreinte (RG-08, RG-09).

### 5.3 Sans glisser

Les règles d'accessibilité exigent une alternative au glisser-déposer.

- **Au clavier** : Tab sélectionne un article, les flèches le déplacent d'un pas fixe, Maj + flèches d'un pas plus grand. Entrée valide la position, Échap annule.
- **D'un seul clic ou d'un seul toucher** : on sélectionne l'article, puis on touche la destination.

### 5.4 Animations

Une courte animation d'emboîtement accompagne le dépôt. Elle est désactivée quand l'appareil demande moins d'animations (`prefers-reduced-motion`).

### 5.5 Rotation

Pendant l'ajustement, un article sélectionné peut changer d'orientation, parmi celles autorisées pour lui. On utilise pour cela un bouton, ou la touche R au clavier. Le validateur contrôle la nouvelle orientation comme un déplacement : si elle enfreint une règle, elle est refusée avec un message.

### 5.6 Raccourcis clavier personnalisables

Tous les raccourcis du plan se modifient à tout moment dans un petit panneau de réglages, accessible depuis le plan : rotation (R par défaut), retrait (Suppr par défaut), aimantation, et ainsi de suite. Le choix est mémorisé sur l'appareil. Cela répond aussi à une exigence des WCAG : un raccourci d'une seule touche doit pouvoir être modifié ou désactivé.

### 5.7 Zone « Articles à placer »

Juste à côté des cadres de vue, à la même hauteur et visible sans faire défiler la page, une zone regroupe les articles de la tournée qui ne sont pas dans le camion. Elle n'est jamais placée sous l'ordre de chargement ou le tableau des placements : le glisser-déposer entre la zone et le camion doit rester court. C'est le moyen principal de retirer et de remettre un article ; les boutons restent l'alternative exigée par les WCAG.

- **Retirer un article** : on le glisse hors du camion vers la zone, ou on utilise le bouton « Retirer » ou le raccourci correspondant. L'ordre de chargement est alors recalculé.
- **Remettre un article** : on le glisse de la zone vers le camion, sous le contrôle du validateur, ou on le sélectionne puis on touche la destination. Un bouton demande au placeur de le placer automatiquement, et un bouton « Tout placer » place d'un coup tous les articles de la zone. Le calcul complet du plan, décrit à la section 4, reste disponible à tout moment.
- **Articles en trop** : après un calcul, ils apparaissent aussi dans cette zone. Ils peuvent y être replacés à la main ou reportés en liste d'attente (RG-10, RG-11).

Côté données, un article à placer est une unité de la tournée qui n'a pas de position dans le plan.

### 5.8 Choix des vues et repères

| Vue | Axes affichés | Point de vue | Au premier plan |
| --- | --- | --- | --- |
| Dessus | x (longueur) · y (largeur) | Au-dessus de la caisse | Les articles les plus hauts |
| Côté gauche | x · z (hauteur) | Depuis la paroi gauche | Les articles proches de la paroi gauche |
| Côté droit | x · z, en miroir | Depuis la paroi droite | Les articles proches de la paroi droite |
| Avant | y · z | Depuis le fond, côté cabine | Les articles proches du fond |
| Arrière | y · z | Depuis les portes : c'est la vue de la personne qui charge | Les articles proches des portes |

**Sélecteur de vue** : un groupe de boutons (Dessus, Gauche, Droite, Avant, Arrière), utilisable au clavier. Chaque cadre propose les cinq vues ; la vue déjà affichée dans l'autre cadre y est indisponible, et l'annonce l'indique (« déjà affichée à gauche »). Par défaut : Dessus et Côté gauche en préparation, Arrière et Dessus en mode quai.

**Repères toujours visibles**, quelle que soit la vue :

- un libellé « Fond (cabine) » et un libellé « Portes · entrée des articles », placés sur le bord concerné, avec une flèche d'entrée côté portes ;
- dans les vues avant et arrière, où le fond et les portes ne sont pas sur un bord, les libellés « Gauche » et « Droite » et un rappel du sens de la vue (« vu depuis les portes ») ;
- un mini-pictogramme du camion vu de dessus, qui montre d'où l'on regarde ;
- le plancher, marqué par un trait plus épais.

**Calcul** : une fonction pure `projeter(placement, unite, camion, vue)` renvoie le rectangle à dessiner, en millimètres dans le repère de la vue, et sa profondeur : distance de l'observateur à la face la plus proche et à la face la plus éloignée. L'unité donne les dimensions ; le camion sert aux vues prises depuis la paroi droite, le fond ou les portes, et à inverser la hauteur, car le plancher est en bas. `projeterPlan(plan, unites, camion, vue)` renvoie les projections dans l'ordre de dessin, du plus éloigné au plus proche, si bien que ceux de devant recouvrent ceux de derrière. Trier sur la face la plus proche suffit : deux articles ne se chevauchent pas (RG-06), donc deux rectangles qui se recouvrent dans une vue sont séparés en profondeur. Ces fonctions sont développées en TDD, comme le validateur.

### 5.9 Vue par étape

- **Deux modes d'affichage** : « Plan complet » ou « Par étape », via un interrupteur, en préparation comme en mode quai.
- **Navigation** : un curseur d'étape (0 à N), les boutons Précédent et Suivant, et des raccourcis personnalisables. Les flèches restent réservées au déplacement des articles.
- **À l'étape n** :
  - les articles des étapes précédentes sont affichés comme chargés ;
  - l'article de l'étape n est mis en évidence par un contour épais, une étiquette « Étape n » et une flèche depuis les portes ;
  - les articles des étapes suivantes sont masqués, ou montrés en silhouette si l'utilisateur le choisit : contour en pointillés de 2 px `bordure-forte`, fond blanc, code en `texte-doux`, sans opacité réduite. Les silhouettes ne comptent jamais comme articles cachés et ne gênent pas le glisser-déposer. Les lecteurs d'écran les annoncent « pas encore chargé », et le choix est mémorisé sur l'appareil.
- **Description en texte**, annoncée aux lecteurs d'écran. Par exemple : « Étape 7 sur 12 : fenêtre emballée, commande 2, debout, contre la paroi gauche, à 5,0 m du fond. »
- **Aucune donnée supplémentaire** : la vue se déduit du rang de chargement de chaque placement, avec le même composant de vue.
- **Prototype** : la vue par étape arrive dès le prototype 1, pour relire et valider le plan, puis le mode quai du prototype 3 la réutilise.

### 5.10 Articles cachés

Dans une vue, un article peut être entièrement masqué par ceux de devant : sur la première maquette, par exemple, les fenêtres cachent la vitre de toit en vue de côté.

- **Signalement** : chaque cadre indique le nombre d'articles cachés (« 2 articles cachés dans cette vue »). Un clic ouvre leur liste.
- **Vue plus adaptée** : pour un article caché, l'application propose de passer à une vue où il est visible (« Voir dans la vue Dessus »). `projeterPlan` marque chaque article entièrement masqué par ceux de devant, et `vuesOuVisible(uniteId, plan, unites, camion)` liste les vues où il se voit. Le plan transmis ne contient que les articles affichés : ceux qui sont masqués par le filtre de profondeur ou montrés en silhouette ne cachent rien et ne sont pas comptés.
- **Filtre de profondeur** : un curseur à deux poignées limite l'affichage à une tranche de profondeur. Par exemple, en vue de côté gauche, seulement les articles situés entre 0 et 1 m de la paroi gauche. Les articles hors tranche sont masqués, et la tranche choisie reste affichée en clair. Tant qu'un filtre est actif, un bandeau dans le cadre l'indique (« Filtre actif : moitié fond · 6 articles masqués ») avec un bouton « Tout afficher », et le contour du camion change d'aspect. Les articles masqués par le filtre ne sont pas comptés comme cachés. Ce point vient de la maquette : un filtre actif y a été pris pour une erreur d'affichage.
- **Survol** : au survol ou au focus d'un article, ceux qui le recouvrent deviennent semi-transparents.

### 5.11 Zoom

- Chaque cadre a ses boutons Zoom +, Zoom − et Ajuster. Ils accompagnent les gestes, car un geste ne doit jamais être le seul moyen d'agir (WCAG) :
  - **Ctrl + molette** sur ordinateur, autour du point visé. La molette seule continue de faire défiler la page : sinon, passer la souris sur une vue bloquerait le défilement. Le pincement d'un pavé tactile arrive au navigateur sous la même forme et marche donc aussi ;
  - **pincement à deux doigts** sur tablette, autour du point situé entre les doigts : le zoom suit le rapport des écarts entre les doigts. La page elle-même ne zoome pas.
- Une fois zoomé, on déplace la zone visible en faisant glisser le fond de la vue, ou avec des raccourcis personnalisables.
- Techniquement, le zoom modifie le `viewBox` du SVG : rien n'est redessiné et les coordonnées restent en millimètres.
- Le zoom n'agit que sur la vue. Les libellés et les repères fond / portes restent à taille lisible.

### 5.12 Mise en évidence d'une commande

- Un clic sur une commande de la légende la met en évidence. Ses articles gardent leur couleur. Les autres passent en `attenue-fond` avec un contour `attenue-bord`, et leur code reste en `texte-doux` (5,5:1). Aucune opacité n'est appliquée au bloc entier : elle rendait le code illisible. Un second clic revient à l'affichage normal.
- Les boutons de la légende portent `aria-pressed`. La mise en évidence vaut pour les deux cadres, pour la vue par étape et pour l'ordre de chargement.

### 5.13 Lignes de cote

- La caisse est cotée dans chaque vue : la longueur sous la vue, la largeur ou la hauteur sur le côté. Trait de 1 px `cote`, flèches aux extrémités, valeur en millimètres en IBM Plex Mono (« 7 200 mm »).
- L'article sélectionné affiche ses propres cotes, en `action` : ses dimensions et sa distance au fond.
- Les cotes appartiennent au calque de libellés : elles suivent le zoom en position, mais gardent une taille lisible.
- Dans les fiches, un composant `LigneCote` dessine une cote en HTML (trait, flèche pleine à chaque extrémité, valeur au milieu) et `PlanCote` l'emploie autour d'un dessin SVG en millimètres : vues de la caisse dans la fiche camion, faces de l'article (dessus, face, côté) dans la fiche article. Une cote plus courte que sa valeur garde la hauteur du dessin ; la valeur dépasse, centrée, sur fond `surface`.
- Deux fonctions pures, développées en TDD comme `projeter` :
  - `coterCaisse(camion, vue)` renvoie les cotes de la caisse ;
  - `coter(placement, unite, camion, vue)` renvoie celles de l'article : ses dimensions telles qu'il est posé, puis sa distance au fond.

  Chaque cote donne sa mesure, sa valeur en millimètres et son segment, posé sur le bord mesuré. Le calque de libellés le décale vers l'extérieur. En vues avant et arrière, la distance au fond est dans l'axe du regard : elle n'a pas de segment et s'affiche en texte.

### 5.14 États superposés d'un bloc

| État | Rendu technique |
| --- | --- |
| Sélectionné | Anneau `encre` de 3 px collé au bloc |
| Étape en cours | Contour `action` de 4 px, étiquette « Étape n » et flèche depuis les portes |
| Focus clavier | Double anneau décalé de 2 px : 2 px `surface` puis 2 px `action` |

Les trois états se distinguent par leur forme et peuvent se cumuler sans se masquer.

### 5.15 La charte graphique dans le code

- Le fichier de jetons est copié dans `src/styles/` et converti en variables CSS (`--encre`, `--cmd1-bord`, `--rayon-carte`…) par un petit script maison ou par Style Dictionary, outil libre. Les composants n'utilisent jamais une valeur en dur.
- Toute modification de la charte passe par le fichier de jetons, partagé avec Figma, pour que les maquettes et le code restent alignés.
- **Ombres** : `box-shadow` n'est utilisé que pour `ombre-flottant` (menus, info-bulles, panneau de raccourcis, article en cours de glisser) et pour l'anneau de focus. Une revue de code le vérifie ; une règle Stylelint, gratuite, pourra l'automatiser.
- **Rayons** : uniquement les jetons `rayon-*` ; pas de valeur supérieure à 8 px en dehors des interrupteurs.

### 5.16 Articles mal calés

- Après chaque calcul, déplacement ou revérification, `diagnostiquerCalage` est appelé.
- S'il trouve des articles mal calés, un bandeau d'alerte s'affiche au-dessus des vues (« 2 articles mal calés : A10, A11 (C2) »), avec un bouton « Voir » qui les sélectionne. Les blocs concernés portent l'icône triangle, et le message est annoncé dans la zone `aria-live`.
- Pendant un glisser-déposer, un article debout sans calage est refusé comme les autres règles, avec le message « Fenêtre non calée : appuyez-la contre une paroi ou un article ».

### 5.17 Indicateur d'équilibre

- **Carte « Équilibre de la charge »**, dans le panneau à côté des vues :
  - une jauge gauche / droite en deux segments (`encre` et `surface`, contour `bordure-forte`), avec les pourcentages et les tonnes en texte ;
  - le statut en texte et icône (coche ou triangle). Un statut « À surveiller » ou « Déséquilibré » prend le contour `alerte-bordure` ;
  - un tableau repliable « Au fil de la tournée » : départ, puis après chaque livraison.
- **Sur la vue de dessus** :
  - le centre de gravité, une croix dans un cercle `action` de 22 px avec le libellé « CG » ;
  - l'axe longitudinal en pointillés `cote` ;
  - la distance du centre de gravité au fond, en `repere`.

  Le marqueur ne gêne pas le glisser-déposer et ne compte pas comme un article.
- **Plan vide** : la carte affiche « Aucun article » à la place du statut, sans jauge ni tableau. `mesurerEquilibre` ne renvoie alors aucune étape (4.5) : l'interface teste ce cas avant d'afficher le statut.
- **Mise à jour** : à chaque calcul, déplacement ou revérification. Un changement de statut est annoncé dans la zone `aria-live`.
- **Mode quai** : le statut seul, en `quai-corps`.

## 6. Accessibilité côté technique

La cible est le niveau AA des WCAG 2.2, comme le fixe le cahier fonctionnel.

- **Articles du plan** : le dessin SVG porte un nom qui le résume ; chaque article visible y est doublé d'un bouton HTML transparent, posé sur son bloc dans le calque de libellés (5.1). Le bouton reçoit le focus et porte le nom accessible de l'article : repère, nom, commande, orientation, position approximative dans la caisse (tiers de la longueur et de la largeur, d'après son centre), appui et étape. Par exemple « A07, Botte de planches de pin, commande C3 SCI Martin, à plat, au milieu à gauche, sur A06, étape 7 ». `aria-pressed` dit s'il est sélectionné ; une silhouette ajoute « pas encore chargé ». Un bouton HTML plutôt qu'un groupe SVG : le focus, le clavier et le double anneau fonctionnent comme partout ailleurs, à taille fixe quel que soit le zoom.
- **Alternative textuelle** : un tableau des placements est synchronisé avec les vues 2D. On peut y modifier une position par formulaire.
- **Messages** : blocages, alertes et résultats de revérification sont annoncés dans une zone `aria-live`.
- **Focus** : il est toujours visible, sous la forme d'un double anneau décalé distinct de l'étape en cours (5.14). Il est replacé de façon logique après une action, par exemple sur l'article déplacé ou sur le message.
- **Cibles tactiles** : au moins 24 px partout, le minimum fixé par les WCAG 2.2, et nettement plus en mode quai.
- **Exception pour les blocs du plan (WCAG 2.5.8)** : un bloc a la taille de son article à l'échelle de la vue. Une poutre de 200 mm de large fait ainsi une vingtaine de pixels en vue de dessus. L'agrandir fausserait le plan, qui sert justement à juger des tailles et des écarts : cette présentation est essentielle, une exception prévue par le critère. La même sélection reste possible depuis le tableau des placements et l'ordre de chargement, avec des boutons à la taille minimale. Dans les tests, axe-core désactive la règle « target-size » pour les seuls blocs du plan ; elle s'applique partout ailleurs.
- **Couleurs** : les couleurs de commande et du thème sont choisies en contrôlant le contraste, et les six couleurs de commandes sont vérifiées en simulation de deutéranopie et de protanopie. Un test unitaire relit le fichier de jetons et vérifie les contrastes minimaux : 4,5:1 pour les textes, 3:1 pour les contours de commandes et de contrôles.
- **Mode quai** : échelle typographique dédiée (`quai-*`, 18 px pour le texte courant) et boutons principaux de 56 px.
- **Langue** : l'attribut `lang="fr"` est déclaré sur la page.
- **Contrôle automatique** : axe-core est intégré aux tests Playwright et vérifie chaque page à chaque exécution de l'intégration continue.
- **Contrôle manuel** : à la fin de chaque prototype, un parcours complet est fait au clavier seul, et un autre avec un lecteur d'écran (NVDA ou VoiceOver).

### 6.1 Formulaires (RG-21)

- **Règles** : un module `domaine/validation.ts`, en fonctions pures, une par objet métier. Comme le validateur de placement, il ne dépend ni de Vue ni de Supabase, et il est développé en TDD avec un test par règle du tableau RG-21.

  ```ts
  interface Probleme { champ: string; code: string; message: string }
  interface ResultatValidation { erreurs: Probleme[]; avertissements: Probleme[] }
  function validerArticle(saisie: SaisieArticle, contexte: { catalogue: Article[]; camions: Camion[] }): ResultatValidation
  function validerCamion(saisie: SaisieCamion): ResultatValidation
  function validerSuppressionCamion(camion: Camion, tournees: Tournee[]): ResultatValidation // vaut aussi avant l'archivage
  function validerCommande(saisie: SaisieCommande, contexte: { commandesDeLaTournee: Commande[]; catalogue?: Article[]; camion?: Camion }): ResultatValidation
  function validerTournee(saisie: SaisieTournee, contexte: { nombreCommandes: number; lancement: boolean }): ResultatValidation
  function validerSignalement(saisie: SaisieSignalement, prevu: Unite): ResultatValidation
  ```

  Chaque problème porte un `code` stable (`obligatoire`, `entierPositif`, `tailleIncomplete`, `doublon`…). Le message vient d'un fichier de textes, pour rester cohérent d'un formulaire à l'autre. Les articles et camions archivés sont ignorés par les contrôles de doublon et de taille. Le catalogue et le camion de `validerCommande` servent à l'avertissement « ne rentre pas dans le camion » (RG-10).
- **Saisie des nombres** : champs texte avec `inputmode="numeric"` pour les millimètres et `inputmode="decimal"` pour les kilogrammes. Les espaces sont acceptées (« 1 250 »), ainsi que la virgule décimale pour le poids. La valeur est convertie en millimètres entiers ou en kilogrammes avant validation.
- **Moment de la vérification** : à la sortie du champ (`blur`), puis à l'enregistrement. Une erreur affichée est revérifiée à chaque frappe, pour disparaître dès que la valeur est juste. Le bouton d'enregistrement n'est jamais désactivé.
- **Affichage** :
  - le champ en erreur reçoit `aria-invalid="true"` et `aria-describedby` vers son message ;
  - à l'enregistrement, un résumé `role="alert"` reçoit le focus, avec un lien vers chaque champ en erreur ;
  - les champs obligatoires portent `aria-required="true"` et la mention « (obligatoire) » dans leur libellé ; la mention garde la hauteur de ligne du libellé ;
  - le texte d'aide d'un champ est placé sous le champ, avant les messages d'erreur et d'avertissement, et relié par `aria-describedby`. Le libellé tient ainsi sur une ligne, et les champs d'une même rangée restent alignés, qu'ils aient une aide ou non.
- **Seconde barrière dans la base** : contraintes SQL dans les migrations Supabase (`NOT NULL`, `CHECK` des valeurs supérieures à 0, `CHECK` taille nue complète ou vide, `UNIQUE (tournee_id, numero)` pour les commandes). Une erreur renvoyée par la base est traduite en message de champ, jamais affichée brute.
- **Modifications non enregistrées** : chaque formulaire suit un état « modifié », vrai tant que la saisie diffère de ce qui est enregistré. Un seul composant, `BoutonEnregistrer`, l'affiche dans tous les formulaires : la mention « Modifications non enregistrées », avec une icône, dans une zone `role="status"` présente dès l'affichage, et le bouton d'enregistrement en style principal tant que l'état est vrai, secondaire sinon, toujours actif. Quitter la page, par la navigation (`onBeforeRouteLeave` de Vue Router) ou en fermant l'onglet (`beforeunload`), déclenche la confirmation de RG-22.
- **Alignement des nombres** : dans un champ de saisie, les nombres sont alignés à gauche, comme tout texte saisi, en IBM Plex Mono. Dans un tableau, ils sont alignés à droite, pour se comparer d'une ligne à l'autre.

### 6.2 Fenêtres de confirmation (RG-22)

- **Élément** : la balise HTML native `<dialog>`, ouverte par `showModal()`. Le navigateur gère alors le focus piégé dans la fenêtre, la touche Échap et l'inertie du reste de la page.
- **Focus** : il va d'abord sur « Annuler ». À la fermeture, il revient sur le bouton qui a ouvert la fenêtre.
- **Accessibilité** : le titre est relié par `aria-labelledby` et la conséquence par `aria-describedby`.
- **Rendu** : voile `voile` derrière la fenêtre, carte `surface` aux coins `rayon-carte` avec `ombre-flottant`, bouton de suppression sur fond `erreur`.
- **Un seul composant** `ConfirmationDialog`, avec un titre, un texte de conséquence, le libellé de l'action et un ton (`danger` ou `neutre`). Il est utilisé par tous les cas listés en RG-22.

### 6.3 Tableaux triables

- **Un seul composant** `TableauTriable`, générique : il reçoit les colonnes (libellé, valeur de tri facultative, alignement) et les lignes ; chaque cellule est remplie par un emplacement nommé.
- **En-tête** : une colonne triable contient un vrai `<button>`, qui se déclenche à la souris, à Entrée et à Espace. Clics successifs sur un même en-tête : ordre croissant, ordre décroissant, puis retour au tri de départ. Une flèche montre le sens (jamais la couleur seule).
- **Lignes qui ouvrent une fiche** : même comportement dans tous les tableaux. Le nom de l'élément (en-tête de ligne, `<th scope="row">`) est un lien vers sa fiche, en `action`, souligné au survol et au focus. Ce lien est « étiré » sur la ligne : un pseudo-élément en position absolue la couvre, la ligne servant de repère (`position: relative`). Toute la ligne est donc cliquable, avec un survol `surface-survol`, mais il n'y a qu'un lien par ligne pour le clavier et les lecteurs d'écran. Un chevron « › » termine la ligne ; son icône est décorative (`aria-hidden`), et l'en-tête de sa colonne n'est lu que par les lecteurs d'écran. Les autres boutons et liens de la ligne passent au-dessus du lien étiré (`z-index`) et restent cliquables seuls. Pas de bouton « Ouvrir » séparé.
- **Accessibilité** : la colonne triée porte `aria-sort` (`ascending` ou `descending`), les autres n'en portent pas ; la légende du tableau, lue par les lecteurs d'écran, rappelle le tri en cours.
- **Comparaison** : fonctions pures (`composants/tri.ts`), testées sans interface. Textes comparés à la française, sans tenir compte de la casse ni des accents, nombres contenus comparés comme des nombres (« Porteur 8,5 m » avant « Porteur 12 m ») ; dimensions comparées longueur, puis largeur, puis hauteur. Le tri est stable : sans tri choisi ou entre deux lignes égales, l'ordre reçu est gardé.
- **Tri par défaut** : choisi par la page. Le catalogue garde l'ordre des familles ; les modèles de camions sont triés par nom.

## 7. Données, hébergement et hors connexion

### 7.1 Couche d'accès aux données

L'application ne parle jamais directement à Supabase : elle passe par des **dépôts**, un par objet métier. Par exemple `ArticleRepository` ou `TourneeRepository`, avec des méthodes comme `lister`, `obtenir`, `enregistrer` et `supprimer`. Les dépôts des articles et des modèles de camions ajoutent `archiver`. Leur `lister` ne rend que les éléments actifs, sauf avec l'option `{ avecArchives: true }`, et `obtenir` rend aussi un élément archivé, pour les commandes et les plans qui le citent. `supprimer` rejette un élément déjà utilisé (`utilise`) : l'interface propose alors l'archivage.

Les commandes, les plans et la liste d'attente ont leurs propres opérations :

- **`CommandeRepository.enregistrer(commande, lignes)`** enregistre la commande et ses lignes en une seule opération « tout ou rien » : la fonction SQL `enregistrer_commande`, appelée par `client.rpc`, s'exécute dans une transaction. Une ligne qui porte son identifiant est modifiée en place ; une ligne sans identifiant est ajoutée ; une ligne absente de la liste est supprimée ; l'ordre de la liste devient l'ordre des lignes. Seule une ligne vraiment changée (article, quantité, livraison nue, dimensions ou poids, règle `ligneModifiee` du domaine) perd ses placements ; changer le numéro, le client ou la ville ne touche pas au plan. Le résultat donne les lignes ajoutées ou changées (`lignesChangees`), à replacer.
- **`CommandeRepository.reordonner(tournee, ids)`** fixe le nouvel ordre de livraison (RG-07), fonction SQL `reordonner_commandes` ; la liste doit contenir toutes les commandes de la tournée, et elles seules.
- **`PlanRepository.marquerARecalculer(plan)`** pose la marque « à recalculer » sur une version (RG-22).
- **`ElementAttenteRepository.affecter(element, tournee)`** fait rejoindre une tournée en préparation à un élément en attente, livré en dernier (RG-11), fonction SQL `affecter_element_attente`. Une commande entière entre dans la tournée ; des articles reportés rejoignent la commande de même numéro dans la tournée, créée au besoin, et quittent le plan de leur tournée d'origine. **`supprimer`** retire l'élément ; pour une commande entière, la commande est supprimée avec lui.

Les fonctions SQL s'exécutent avec les droits de l'appelant (`SECURITY INVOKER`) : les politiques de sécurité au niveau des lignes s'appliquent comme pour une requête ordinaire, et chaque fonction n'utilise que les droits déjà accordés au rôle `anon`.

En V1, une implémentation Supabase de ces dépôts est fournie. Plus tard, une implémentation qui appelle votre API la remplacera sans que les pages ni l'algorithme changent. Pour les tests, une implémentation en mémoire évite de dépendre du réseau.

### 7.2 Supabase

- Le schéma est versionné sous forme de fichiers de migration SQL dans le dépôt GitHub. Votre future API pourra s'appuyer sur la même base.
- Les données d'exemple (RG-01) sont fournies par un script de remplissage, rejouable à volonté.
- Contraintes de l'offre gratuite, relevées en novembre 2026 :
  - deux projets ;
  - une base de 500 Mo ;
  - une **mise en pause après 7 jours d'inactivité**, avec réactivation manuelle depuis le tableau de bord, sans perte de données.

  C'est acceptable pour des prototypes.

### 7.3 Hébergement

- **Application** : site statique produit par Vite, publié par GitHub Actions sur un hébergeur statique gratuit. Le choix précis de l'hébergeur est à faire au moment du premier déploiement.
- **Future API** : un service Node/TypeScript sur une offre gratuite reste possible, avec des contraintes. Par exemple, un service web gratuit chez Render se met en veille après 15 minutes sans trafic et met environ une minute à redémarrer. La base de données resterait chez Supabase : les bases gratuites de Render expirent au bout de 30 jours.

### 7.4 Hors connexion (souhaitable, reportable en V2)

- L'application devient installable (PWA), et ses fichiers sont mis en cache par un service worker.
- Au passage en mode quai, la tournée et son plan sont copiés dans le stockage local du navigateur (IndexedDB). Le chargement peut alors continuer sans réseau, puisque l'algorithme tourne déjà dans le navigateur.
- Les validations d'étapes et les signalements faits hors connexion sont mis en file d'attente, puis envoyés au retour du réseau.
- La gestion des conflits reste simple, car une seule tablette suit une tournée à la fois *(hypothèse)*.

## 8. Tests et qualité

Le développement suit une démarche **TDD** : écrire un test qui échoue, écrire le code minimal qui le fait passer, puis remanier. Chaque règle de gestion du cahier fonctionnel a au moins un test qui porte son numéro.

| Niveau | Outil | Ce qui est testé |
| --- | --- | --- |
| Unitaire | Vitest | Validateur (un test par règle RG-04 à RG-09 et RG-19), diagnostic de calage, mesure de l'équilibre (RG-20), choix du meilleur plan, placeur, tri, revérification, dimensions et poids effectifs (RG-02, RG-03), dessus non porteur (RG-18), validation des saisies (RG-21) |
| Composants | Vitest + Vue Test Utils | Formulaires, plan 2D, messages, déplacement au clavier |
| Bout en bout | Playwright | Parcours complets : préparation d'une tournée, puis chargement en mode quai avec un signalement ; enregistrement d'un formulaire incomplet, puis corrigé ; suppression confirmée puis annulée |
| Non-régression | Playwright | Toute la suite rejouée à chaque modification ; chaque bug corrigé ajoute un test |
| Visuel | Playwright, avec captures d'écran comparées | Écarts avec les captures de référence, validées par rapport aux maquettes Figma |
| Accessibilité | axe-core dans Playwright | Erreurs détectables automatiquement sur chaque page |

**Jeux d'essai** : des tournées de test fixes, avec commandes, dimensions et ordre connus, servent aux tests unitaires et de bout en bout. Le critère d'acceptation du prototype 1 se vérifie automatiquement : aucun chevauchement, règles respectées.

**Jeu d'essai « couloirs »** (tournée T-2026-118). Il vient de la maquette Claude Design, corrigée à la main par le porteur, et a été vérifié par calcul contre toutes les règles de placement. Les valeurs sont plausibles mais fictives (RG-01).

- **Caisse** : 7 200 × 2 400 × 2 500 mm.
- **Repère** (section 3) : x du fond vers les portes, y depuis la paroi gauche, z depuis le plancher. La position est celle du coin de l'unité le plus proche de l'origine.

| Commande | Client | Rang de livraison |
| --- | --- | --- |
| C1 | Menuiserie Dubois | 1 |
| C2 | Chantier Les Ormeaux | 2 |
| C3 | SCI Martin | 3 |
| C4 | Maçonnerie Pereira | 4 |

| Unité | Article | Cde | L × l × h (mm) | Poids | Orientation | x | y | z | Rang |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A01 | Palette de parpaings 20 cm | C4 | 1 200 × 1 000 × 1 050 | 1 225 kg | à plat | 0 | 0 | 0 | 1 |
| A02 | Palette de sacs de ciment | C4 | 1 200 × 1 000 × 1 100 | 1 425 kg | à plat | 0 | 1 400 | 0 | 2 |
| A03 | Palette de parpaings 20 cm | C4 | 1 200 × 1 000 × 1 050 | 1 225 kg | à plat | 1 200 | 0 | 0 | 3 |
| A04 | Paquet de plaques BA13 | C3 | 2 500 × 1 200 × 250 | 500 kg | à plat | 1 200 | 1 000 | 0 | 4 |
| A05 | Paquet de plaques BA13 | C3 | 2 500 × 1 200 × 250 | 500 kg | à plat | 1 200 | 1 000 | 250 | 5 |
| A06 | Botte de planches de pin | C3 | 4 000 × 1 000 × 400 | 800 kg | à plat | 2 400 | 0 | 0 | 6 |
| A07 | Botte de planches de pin | C3 | 4 000 × 1 000 × 400 | 800 kg | à plat | 2 400 | 0 | 400 | 7 |
| A08 | Poutre lamellé-collé | C1 | 6 000 × 200 × 400 | 219,8 kg | à plat | 1 200 | 2 200 | 0 | 8 |
| A09 | Poutre lamellé-collé | C1 | 6 000 × 200 × 400 | 219,8 kg | à plat | 1 200 | 2 200 | 400 | 9 |
| A10 | Fenêtre PVC 2 vantaux, emballée, fragile | C2 | 1 500 × 180 × 1 350 | 45 kg | debout | 3 700 | 2 020 | 0 | 10 |
| A11 | Fenêtre PVC 2 vantaux, emballée, fragile | C2 | 1 500 × 180 × 1 350 | 45 kg | debout | 3 700 | 1 840 | 0 | 11 |
| A12 | Carton de quincaillerie | C2 | 600 × 600 × 600 | 30 kg | à plat | 3 700 | 1 240 | 0 | 12 |

**Ce qu'il illustre**

- **Le couloir (RG-07)** : les poutres de C1, livrées en premier, partent à 1,2 m du fond le long de la paroi droite et sortent sans rien déplacer.
- **Le calage (RG-19)** : la fenêtre A10 s'appuie contre les deux poutres de C1, qui couvrent 59 % de sa face (800 mm sur 1 350 mm de haut). A11 s'appuie contre A10. Le carton A12 touche A05 côté fond et A11 en largeur.
- **L'équilibre (RG-20)** : le centre de gravité est à environ 2,22 m du fond et à 12 cm à gauche de l'axe, soit 55 / 45 au départ. La charge passe à 59 / 41 après la livraison de C1 et de C2, puis à 58 / 42 après C3 : statut « À surveiller ».

**Variante « fenêtres isolées »** : c'est la disposition d'origine de la maquette. Seules trois unités changent : A10 en (4 000 ; 1 860 ; 0), A11 en (4 000 ; 1 610 ; 0) et A12 en (6 600 ; 0 ; 0).

**Tests qui en découlent**

- Le validateur **accepte** le jeu « couloirs » : aucune règle enfreinte, aucun article mal calé.
- Sur la variante, le validateur **refuse** A10 et A11, car ce sont des articles debout sans calage (RG-19). `diagnostiquerCalage` signale en plus A12, qui ne touche rien côté fond.
- Deux fenêtres debout face à face, seules au milieu de la caisse, sont **refusées** : leur groupe ne s'appuie sur rien.
- Deux paquets de BA13 contre une paroi, l'un sur l'autre, sont **refusés** (règle 9). Une palette de 1 225 kg posée sur une autre, sa base à 1 050 mm du plancher, est **refusée** (règle 10). Un carton de C2 posé sur une palette au fond, derrière des bottes de C3 plus basses que lui, est **refusé** (règle 7).
- Le placeur, à partir des mêmes commandes, trouve une solution sans article en trop, acceptée par le validateur. Le nombre d'articles mal calés est mesuré et suivi d'une version à l'autre.
- `mesurerEquilibre` donne, pour le jeu « couloirs », 55 / 45 au départ et 59 / 41 après C1, donc le statut « À surveiller ». `optimiser`, à partir des mêmes commandes, trouve un plan dont le pire moment est au moins aussi équilibré. Sur ce jeu, `optimiser` obtient 58 / 42 au pire moment.

**Intégration continue** : GitHub Actions lance la vérification des types, le contrôle du style, puis les tests Vitest et Playwright, à chaque envoi de code et à chaque demande de fusion. Le déploiement n'a lieu que si tout passe.

**Analyse de qualité** : SonarQube Cloud analyse le code à chaque envoi et signale les bugs, failles, duplications et le taux de couverture des tests. Son offre gratuite couvre jusqu'à 50 000 lignes de code pour un dépôt privé, sans limite pour un dépôt public, ce qui suffit largement pour la V1. L'analyse des demandes de fusion peut être limitée selon l'offre, la branche principale est toujours analysée.

## 9. Méthode de travail et organisation du code

### 9.1 Développement piloté par les spécifications

Les quatre documents de projet et la charte graphique sont exportés en Markdown dans le dossier `docs/` du dépôt ; le fichier de jetons est placé dans `src/styles/`. Un fichier `CLAUDE.md`, à la racine, résume pour Claude Code :

- les commandes utiles ;
- les conventions de code ;
- la règle TDD ;
- la numérotation RG ;
- les exigences d'accessibilité ;
- les règles de la charte : jetons uniquement, pas d'ombre décorative.

Chaque prototype suit le même cycle :

1. **Maquettes** : les pages du prototype sont maquettées dans Figma, à partir du cahier fonctionnel.
2. **Spécification du prototype** : une courte fiche liste les RG concernées et les critères d'acceptation.
3. **Tests d'abord** : les tests unitaires et de bout en bout sont écrits avant le code.
4. **Implémentation** avec Claude Code, jusqu'à ce que tous les tests passent.
5. **Contrôles visuel et accessibilité** : captures de référence, axe-core, puis un parcours au clavier.
6. **Revue par le porteur** : vous relisez et vous savez expliquer le code produit, en particulier l'algorithme. C'est un critère de réussite.
7. **Fusion et déploiement** automatique.

Chaque fonctionnalité est développée sur sa propre branche et fusionnée par une demande de fusion (pull request), même en travaillant seul : l'intégration continue s'y exécute.

### 9.2 Organisation du dépôt

```text
chargement-camion/
├── CLAUDE.md               consignes pour Claude Code
├── docs/                   brief, note de cadrage, cahiers des charges, charte
├── src/
│   ├── domaine/            types, validateur, placeur (TypeScript pur)
│   ├── donnees/            dépôts : interfaces, Supabase, mémoire
│   ├── stores/             état Pinia
│   ├── pages/              une page par entrée de l'arborescence
│   ├── composants/         plan 2D, formulaires, messages
│   ├── styles/             jetons de design et variables CSS
│   └── router/
├── tests/
│   ├── unitaires/
│   ├── e2e/                Playwright
│   └── jeux-essai/         tournées de test
├── supabase/
│   ├── migrations/         schéma SQL versionné
│   └── seed.sql            données d'exemple (RG-01)
└── .github/workflows/      intégration continue
```

Le dossier `domaine/` n'importe rien de Vue ni de Supabase. Cette règle peut être vérifiée automatiquement par le contrôle du style.

## 10. Risques techniques et points ouverts

| Risque | Parade |
| --- | --- |
| Algorithme plus difficile que prévu | Validateur séparé, TDD règle par règle, jeux d'essai fixes ; viser une bonne solution d'abord |
| Lenteur du placeur si les points candidats se multiplient | Mesurer sur les jeux d'essai ; éliminer les points devenus inutiles ou en double ; limiter le nombre de variantes et d'échanges essayés |
| Données accessibles sans compte en V1 | Données fictives uniquement ; adresse non diffusée ; sécurité au niveau des lignes activée avec les comptes |
| Mise en pause de Supabase après 7 jours d'inactivité | Réactivation manuelle ; acceptable pour des prototypes |
| Code généré mal compris | Revue systématique et explication de l'algorithme par le porteur, comme critère de réussite |
| Choix de Vue non définitivement acté | Le dossier `domaine/` et les dépôts ne dépendent pas de Vue, et resteraient réutilisables avec un autre framework |

**Points ouverts**

- [ ] **Seuil d'appui** : quelle part minimale de sa base un article doit-il avoir en appui ? 60 % à titre provisoire, à confirmer avec un professionnel.
- [ ] **Pas de déplacement au clavier** : valeur à fixer lors des maquettes.
- [ ] **Hébergeur statique** : à choisir au premier déploiement.
- [ ] **Hypothèse** : une seule tablette suit une tournée à la fois.
- [ ] **Seuils de calage** : `SEUIL_CALAGE` (0,5), `TOLERANCE_CONTACT` (20 mm) et l'écart de compacité du placeur (100 mm), provisoires, à confirmer avec un professionnel.
- [ ] **Seuils d'équilibre et variantes** : `SEUILS_EQUILIBRE` (55 % et 60 %), nombre de variantes du placeur (16), poids proches (`ECART_POIDS_PROCHE` : la plus légère pèse au moins 90 % de la plus lourde) et nombre maximal d'essais d'échange (`MAX_ESSAIS_ECHANGES`, 500), provisoires.
- [ ] **Lourds en hauteur** : `POIDS_LOURD` (500 kg) et `HAUTEUR_MAX_LOURD` (1 000 mm), provisoires, à confirmer avec un professionnel.
- [ ] **Unité d'affichage et de saisie (V2)** : la V1 affiche et saisit toutes les dimensions en millimètres. Faut-il permettre de choisir l'unité (mm, cm ou m), pour l'affichage et pour la saisie ? Les données restent en millimètres entiers ; seule la conversion à l'écran changerait. À décider pour la V2.
- [ ] **Passage pour un article long** : quelle est la largeur minimale d'un passage pour glisser un article long au plancher ? À valider avec un professionnel. Sur « couloirs », `optimiser` glisse les poutres de C1 (6 m) dans un passage de 400 mm entre deux palettes ; aucune règle ne l'interdit aujourd'hui.
- [ ] **Report d'une commande entière et recalcul** (étape 10b, RG-11) : en V1, « Reporter toute la commande » relance le calcul complet du plan, après confirmation. Au prototype 2, la confirmation devra prévenir que les ajustements manuels seront perdus. Au prototype 3, si des articles sont déjà chargés, le recalcul les garde fixes, comme la nouvelle simulation (RG-15).
- [ ] **Codes des commandes figés au chargement** (étape 10b) : quand une commande entière quitte la tournée, les rangs des suivantes se resserrent (C1, C3, C4 deviennent C1, C2, C3). À partir du statut « en chargement » (prototype 3), les codes sont figés et ne sont plus resserrés.

## 11. État du projet

- **Étape atteinte** : Cahier des charges technique V3.9 du 15 novembre 2026 (tableau triable, indication des modifications non enregistrées, alignement des nombres, lignes de cote en composant), ajoutée pendant le développement du prototype 1 (étape 8b). V3.8 du 4 novembre 2026 (formulaires et confirmations, seuil d'appui provisoire, arrondi du statut d'équilibre, boîte englobante, poids par commande, dimensions mesurées, calage, équilibre, jeu d'essai « couloirs » chiffré). La V3.2 était validée le 2 novembre 2026. Le brief V4, la note de cadrage V5.3, le cahier fonctionnel V5.9 et la charte graphique V2.4 sont rédigés.
- **Direction artistique** : piste retenue (charte graphique V2 et fichier de jetons) ; ligne directrice pour le maquettiste.
- **Prochaine étape** : suite du développement du prototype 1 avec Claude Code (étape 10, plan de chargement). La V3.10 du 16 novembre 2026 ajoute les fonctions SQL des commandes et de la liste d'attente, le plan « à recalculer » et la place du texte d'aide (étape 9). La V3.11 précise les gestes de zoom et l'exception de taille de cible des blocs du plan (étape 10a).
- **Profil du client** : technique (développeur), sans connaissance du métier.
- **Décisions prises** :
  - Vue 3 + TypeScript + Vite, choix pressenti ;
  - Pinia et Vue Router ;
  - plan 2D en SVG avec cinq vues au choix (dessus, gauche, droite, avant, arrière), repères fond / portes, deux cadres de vue sans doublon, vue par étape, signalement des articles cachés et filtre de profondeur, zoom, mise en évidence d'une commande, glisser-déposer et rotation (touche R par défaut) ;
  - aimantation activée par défaut et désactivable ;
  - raccourcis personnalisables ;
  - zone « Articles à placer » ;
  - alternatives au clavier et au clic ;
  - pas de simulation physique en V1 ;
  - algorithme maison dans le navigateur ;
  - Supabase derrière une couche de dépôts, avec une API maison possible plus tard ;
  - hébergement gratuit ;
  - TDD avec Vitest, Playwright et axe-core ;
  - ESLint, Prettier et SonarQube Cloud ;
  - GitHub et GitHub Actions ;
  - Claude Code et maquettes Figma ;
  - hors connexion souhaitable, reportable en V2 ;
  - IBM Plex Sans et Mono auto-hébergées, Lucide en option ;
  - jetons de design convertis en variables CSS, aucune valeur en dur ;
  - ombres réservées aux éléments flottants, coins francs ;
  - lignes de cote et calque de libellés à taille fixe ;
  - boîte englobante pour tout article et champ dessus porteur (RG-18) ;
  - poids effectif d'une ligne de commande, estimé au prorata si besoin ;
  - dimensions mesurées enregistrées avec le signalement ;
  - calage : règle 8 du validateur, diagnostic `diagnostiquerCalage`, critère de calage dans le score du placeur ;
  - jeu d'essai « couloirs » chiffré, avec sa variante « fenêtres isolées » ;
  - choix du meilleur plan par variantes et échanges (`optimiser`), équilibre mesuré au pire moment de la tournée (`mesurerEquilibre`) et son indicateur ;
  - zone « Articles à placer » à côté des vues, glisser-déposer comme moyen principal ;
  - validation des saisies en fonctions pures dans `domaine/`, contraintes SQL en seconde barrière ;
  - fenêtres de confirmation en `<dialog>` natif, un seul composant ;
  - tableaux triables par un seul composant (`TableauTriable`), avec `aria-sort`, retour au tri de départ au troisième clic, et lignes cliquables vers la fiche par un lien étiré ;
  - indication des modifications non enregistrées par un seul composant (`BoutonEnregistrer`) ;
  - nombres alignés à gauche dans les champs, à droite dans les tableaux.
- **Points à arbitrer** : aucun.
- **Informations à définir** :
  - seuil d'appui ;
  - pas de déplacement au clavier ;
  - hébergeur statique ;
  - unité d'affichage et de saisie des dimensions (V2) ;
  - nom et logo de l'application ;
  - seuils de calage ;
  - seuils d'équilibre et nombre de variantes ;
  - sanglage ;
  - valeurs réelles ;
  - validation métier.
