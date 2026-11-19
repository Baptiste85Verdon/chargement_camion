# Sessions Claude Code — prototypes 1 et 2

Une session = une étape = une branche = une demande de fusion. Le déroulé est décrit dans `CLAUDE.md` (« Début de chaque session »), il suffit donc de très peu de mots :

| Vous écrivez | Claude Code |
| --- | --- |
| Le message de l'étape 0 (ci-dessous), une seule fois | Prépare le poste et le dépôt |
| `Étape suivante` | Prend la première étape non cochée, crée la branche, code en TDD, pousse, ouvre la demande de fusion, explique le code |
| `Reprends` | Reprend l'étape en cours si la session s'est arrêtée |

Entre deux étapes : relisez la demande de fusion sur GitHub, fusionnez-la (« Squash and merge »), tapez `/clear` dans Claude Code pour repartir d'un contexte propre, puis `Étape suivante`. Claude Code refuse de démarrer une étape si la précédente n'est pas fusionnée.

---

## Étape 0 · Poste de travail et dépôt

- [x] Fait

Pas de branche : c'est la mise en route. Message à coller une seule fois, au tout début :

```
Étape 0 de docs/sessions-claude-code.md : prépare mon poste et le dépôt.
1. Vérifie les versions de node, npm, git et gh. Pour ce qui manque,
   propose-moi la commande winget (Node.js LTS : OpenJS.NodeJS.LTS,
   Git : Git.Git, GitHub CLI : GitHub.cli), lance-la après mon accord,
   puis dis-moi s'il faut redémarrer le terminal.
2. Vérifie git config user.name et user.email ; s'ils manquent,
   demande-moi les valeurs.
3. Vérifie que gh est connecté (gh auth status) ; sinon, arrête-toi et
   dis-moi de lancer gh auth login dans une fenêtre PowerShell à part
   (docs/installation.md, point 3), puis attends que je te dise « c'est fait ».
4. Initialise le dépôt Git dans ce dossier, branche main, avec le
   .gitignore présent, relie-le au dépôt GitHub dont je te donne
   l'adresse, fais le premier commit « docs: ajoute le dossier de projet
   et le kit de démarrage » et pousse.
5. Vérifie que .env.local n'est pas suivi par Git.
```

## Étape 1 · Socle du projet

- [x] Fait — branche `chore/p1-socle-projet`
- Cahier technique : sections 2, 5.15, 8 (outils), 9.2.
- Créer le projet Vite + Vue 3 + TypeScript strict à la racine sans écraser `docs/`, `src/styles/`, `tests/`, `CLAUDE.md`, `README.md`, `.gitignore` (à compléter) et `.env.example`. Ajouter Vue Router, Pinia, ESLint, Prettier, Stylelint (couleurs en dur et ombres interdites hors jetons), Vitest, Playwright avec axe-core.
- Script `npm run tokens` : convertit `plan-de-chargement.tokens.json` en variables CSS, avec un test qui vérifie les contrastes minimaux.
- Polices IBM Plex auto-hébergées (Fontsource). Arborescence `src/domaine`, `src/donnees`, `src/stores`, `src/pages`, `src/composants`, `src/router`.
- GitHub Actions : typecheck, lint, tests Vitest et Playwright à chaque push et demande de fusion.
- Une page d'accueil vide qui affiche le titre avec les bonnes polices et couleurs, et un test de bout en bout qui la vérifie.
- Compléter la section « Commandes » de `CLAUDE.md`.

## Étape 2 · Domaine : types et premières règles du validateur

- [x] Fait — branche `feat/p1-validateur-base`
- Cahier technique : sections 3, 4.1, 4.2 (règles 1 à 3), 4.7.
- Types `Unite`, `Placement`, `Camion`, `Orientation`, `RegleEnfreinte`. Chargement des jeux d'essai JSON dans les tests.
- Validateur : dans la caisse et sans chevauchement (RG-06), orientation autorisée (RG-04). Il renvoie la liste des règles enfreintes.

## Étape 3 · Validateur complet et calage

- [x] Fait — branche `feat/p1-validateur-complet`
- Cahier technique : section 4.2 (règles 4 à 8), section 8 (jeu d'essai).
- Appui (`SEUIL_APPUI` 0,6), fragiles et dessus non porteurs (RG-04, RG-18), lourds en bas, accès au déchargement (RG-07), calage des articles debout avec la règle du groupe (RG-19).
- `diagnostiquerCalage`.
- Tests de référence : le jeu « couloirs » est accepté ; la variante « fenêtres isolées » refuse A10 et A11 et signale A12 ; deux fenêtres face à face isolées sont refusées.

## Étape 4 · Placeur, équilibre et choix du meilleur plan

- [x] Fait — branche `feat/p1-placeur-optimiser`
- Cahier technique : sections 4.3, 4.4, 4.5.
- Dimensions et poids effectifs (RG-02, RG-03), placeur glouton avec score compacité, calage puis équilibre, articles en trop (RG-10).
- `mesurerEquilibre` : 55 / 45 au départ et 59 / 41 après C1 pour « couloirs », statut sur pourcentages arrondis.
- `optimiser` : variantes, comparaison, échanges. Test : sur les commandes de « couloirs », aucun article en trop, aucune règle enfreinte, équilibre au moins aussi bon.
- Mesurer le temps de calcul sur le jeu d'essai et le noter dans la demande de fusion.

## Étape 5 · Projections et cotes

- [x] Fait — branche `feat/p1-projections`
- Cahier technique : sections 5.8 et 5.13.
- `projeter(placement, unite, camion, vue)` pour les cinq vues, avec la profondeur et l'ordre de dessin ; détection des articles cachés ; `coter(placement, unite, camion, vue)`. En TDD sur le jeu « couloirs ».

## Étape 4b · Équilibre du placeur

- [x] Fait — branche `feat/p1-equilibre-placeur`
- Cahier technique : sections 4.3, 4.4 et 4.5 ; demande de fusion de l'étape 4, « Écart connu : équilibre d'`optimiser` sur « couloirs » ».
- Constat de départ : sur « couloirs », `optimiser` donne un plan complet et valide, mais à 66 / 34 au pire moment (après C3), contre 59 / 41 pour la référence. Le placeur ne crée de points qu'au bord des unités posées depuis le coin gauche et n'atteint pas la paroi droite.
- **Piste retenue : points projetés contre la paroi opposée.** Après chaque unité posée, le placeur ajoute un quatrième point candidat, celui « à côté », poussé jusqu'à la paroi d'en face. Les 8 variantes sont lancées avec et sans ce point, soit 16, et la comparaison de 4.4 garde la meilleure.
- **Complément, seulement si la piste 1 ne suffit pas** : des déplacements en plus des échanges à l'étape 3 de 4.4. On retire une unité sans rien dessus, ou toute une commande, pour la replacer ailleurs ; le coup est gardé aux mêmes conditions qu'un échange (validateur, calage, équilibre).
- Proposer les modifications du cahier qui en découlent (4.3 étape 5, 4.4 étapes 1 et 3, seuils provisoires de la section 10) avant de les faire.
- **Critère de réussite** : sur « couloirs », `optimiser` obtient 59 / 41 ou mieux au pire moment, sans article en trop ni article mal calé. Le test marqué `it.fails` dans `optimiser.test.ts` passe pour de vrai, en `it`.
- Mesurer le temps de calcul de `placer` et d'`optimiser` sur « couloirs » avant et après, et noter les deux dans la demande de fusion.

## Étape 4c · Règles de stabilité

- [x] Fait — branche `feat/p1-regles-stabilite`
- Cahier fonctionnel : RG-04, RG-07. Cahier technique : sections 4.2 (règles 7, 9 et 10), 8 et 10 ; demande de fusion de l'étape 4b, « Constats métier » et « Proposition : étape 4c ».
- Constat de départ : sur « couloirs », le plan d'`optimiser` respecte toutes les règles, mais il empile deux paquets de BA13 sur chant, pose une palette de 1 225 kg sur une autre, et met les fenêtres de C2 en hauteur, au fond, derrière des bottes de C3 plus basses.
- Validateur, en TDD, un test par règle :
  - **règle 9** : un article debout ou contre une paroi est posé au plancher et rien n'est posé dessus, contrôlé dans les deux sens (RG-04) ;
  - **règle 10** : un article de plus de `POIDS_LOURD` (500 kg) n'a pas sa base à plus de `HAUTEUR_MAX_LOURD` (1 000 mm) du plancher (RG-04) ;
  - **règle 7 élargie** : est gênant tout article situé entre A et les portes qui chevauche A en largeur et occupe une hauteur entre le plancher et le dessus de A, c'est-à-dire dont le bas est plus bas que le dessus de A (RG-07).
- Appliquer aux cahiers les textes validés dans la demande de fusion de l'étape 4b. Pour RG-07, l'exemple devient « une plaque à plat posée sur le dessus du chargement, côté portes, quand rien de ce qui est livré plus tard ne se trouve entre elle et les portes ». Ajouter aux points ouverts de la section 10 `POIDS_LOURD` (500 kg) et `HAUTEUR_MAX_LOURD` (1 000 mm), provisoires.
- Mesure préalable, faite avec un prototype non conservé : le jeu « couloirs » reste accepté ; `optimiser` donne 58 / 42 au pire moment (après C3), sans article en trop ni mal calé, sans aucune des trois dispositions du constat.
- **Critère de réussite** : le jeu « couloirs » reste accepté par le validateur. Sur « couloirs », `optimiser` ne laisse aucun article en trop ni mal calé, et obtient 59 / 41 ou mieux au pire moment. Minimum : jamais au-delà de 60 % d'un côté. Si le minimum n'est pas tenu, s'arrêter et l'expliquer avant de chercher une correction.

## Étape 6 · Données et validations de saisie

- [x] Fait — branche `feat/p1-donnees`
- Cahier technique : sections 3, 6.1, 7.1, 7.2.
- Vérifier que `.env.local` existe avec l'URL et la clé publique. Le porteur relie la CLI Supabase au projet lui-même si un mot de passe est demandé.
- Migrations SQL (tables, contraintes `NOT NULL`, `CHECK`, `UNIQUE`, `GRANT` au rôle `anon` et politiques RLS : voir la section Supabase de `CLAUDE.md`), données de démarrage (RG-01, avec la tournée T-2026-118 du jeu « couloirs »).
- Dépôts : interfaces, implémentation Supabase, implémentation en mémoire.
- `domaine/validation.ts` (RG-21) en TDD, un test par ligne du tableau.

## Étape 7 · Composants de base

- [x] Fait — branche `feat/p1-composants-base`
- Charte graphique et `docs/design-system.md`.
- Composants Vue :
  - `Bouton`, `Selecteur`, `Interrupteur`, `Bandeau`, `CodeCommande`, `Carte`, `Badge`, `Touche` ;
  - `Champ`, avec ses états et le résumé des erreurs ;
  - `ConfirmationDialog`, en `<dialog>` natif (RG-22).
- Une vitrine de ces composants avec leurs états, et un test axe-core sur la vitrine.
- Fichier de textes en français.

## Étape 8 · Référentiels

- [x] Fait — branche `feat/p1-referentiels`
- Captures 07, 08, 08e, 09, 09b, 09e. Cahier fonctionnel : sections 4.6 et 4.7, RG-18, RG-21, RG-22.
- Catalogue avec recherche et filtre, fiche article (case « Peut être livré nu », orientations par défaut selon la famille, forme, dessus porteur), modèles de camions et fiche camion.
- Archivage (décision de l'étape 6, RG-21 et RG-22) : bouton « Archiver » dans la fiche article et la fiche camion ; suppression d'un élément utilisé remplacée par la proposition d'archiver ; mention « archivé » dans les anciennes commandes et les anciens plans ; articles archivés absents du catalogue et de la saisie express, camions archivés absents du choix du camion. Les dépôts (`archiver`, `lister({ avecArchives })`) sont prêts.
- Réactivation : bouton « Réactiver » dans la liste des éléments archivés, et méthode `reactiver` à ajouter aux dépôts. Un article ne peut pas être réactivé si un article actif a repris sa référence (l'index unique le refuse déjà) : le message le dit.
- Dimensions : le catalogue et la fiche article affichent les dimensions à plat, avec la mention « à plat » visible (écart connu des captures 07 et 08).

## Étape 8b · Finitions des référentiels

- [x] Fait — branche `feat/p1-finitions-referentiels`
- Cahier fonctionnel V5.9 : sections 4.6, 4.7 et 7, RG-21, RG-22. Cahier technique V3.9 : sections 5.13, 6.1 et 6.3. Écarts validés dans `docs/maquettes/README.md`.
- Lignes de cote avec flèches aux extrémités (cahier technique 5.13), dans la fiche camion et la fiche article.
- Champs de saisie numériques alignés à gauche ; les nombres restent alignés à droite dans les tableaux.
- Indication « Modifications non enregistrées » près du bouton Enregistrer, mis en avant tant que c'est le cas, dans un composant réutilisé par tous les formulaires.
- Composant de tableau triable réutilisable (clic sur l'en-tête, `aria-sort`, en-tête utilisable au clavier), appliqué au catalogue et aux modèles de camions ; camions triés par nom par défaut.
- Aperçu de l'article dans la fiche : sélecteur Dessus / Face / Côté, avec les cotes, comme pour la fiche camion.
- Tri : un troisième clic sur un en-tête rétablit le tri de départ.
- Même comportement dans tous les tableaux : le nom de l'élément est un lien vers sa fiche (couleur `action`, souligné au survol et au focus), sans bouton « Ouvrir » séparé ; toute la ligne est cliquable avec un survol visible (lien étiré, un seul lien par ligne pour le clavier) ; chevron « › » décoratif en fin de ligne ; les autres boutons d'une ligne restent cliquables seuls. Bouton « Ouvrir la fiche » des modèles de camions supprimé.

## Étape 9 · Tournées, commandes et liste d'attente

- [x] Fait — branche `feat/p1-tournees-commandes`
- Captures 01, 02, 02e, 03, 03b, 03e, 10. Cahier fonctionnel : sections 4.1 à 4.3 et 4.8, RG-03, RG-11.
- Accueil, préparation d'une tournée (ordre de livraison), saisie express (poids estimé), liste d'attente, lancement du calcul.
- Enregistrement d'une commande en une seule opération « tout ou rien » (fonction SQL appelée par le dépôt), au lieu des trois requêtes de l'étape 6.
- Modifier une commande ne vide pas tout son placement : changer le numéro, le client ou la ville ne touche pas au plan ; seules les lignes vraiment changées (article, quantité, dimensions, poids) perdent leur placement et passent dans la zone « Articles à placer », avec un message. Le dépôt de l'étape 6 remplace encore toutes les lignes : son test de contrat « remplace toutes les lignes » est à revoir.

## Étape 10a · Plan de chargement : les vues

- [x] Fait — branche `feat/p1-plan-vues`
- Captures 04, 04c, 04d, 04e. Cahier technique : sections 5.1, 5.8 à 5.12 et 5.14.
- Utilisable seule une fois fusionnée : la page du plan affiche le dernier plan calculé d'une tournée, sans les fonctions de l'étape 10b.
- Ce qui est à construire :
  - la page du plan, ouverte depuis la préparation de la tournée ;
  - deux cadres de vue avec leurs sélecteurs ;
  - repères Fond / Portes, cotes, zoom, articles cachés et filtre de profondeur ;
  - mise en évidence d'une commande, vue par étape avec silhouettes ;
  - tableau des placements, ordre de chargement, sélection d'un article.

## Étape 10b · Plan de chargement : équilibre, calage et dépassement

- [x] Fait — branche `feat/p1-plan-chargement`
- Captures 04, 04a, 04b. Cahier technique : sections 5.7, 5.16 et 5.17. RG-10, RG-11, RG-19, RG-20.
- Ce qui est à construire :
  - carte d'équilibre avec le centre de gravité, bandeau de calage ;
  - dépassement et report dans la zone « Articles à placer » ;
  - report d'une partie seulement d'une ligne (1 unité sur 2, par exemple) : la ligne est scindée en deux, la partie reportée devient une ligne à part, citée par l'élément en attente ;
  - recalcul de la tournée d'origine : une ligne reportée, qui reste dans sa commande d'origine, est ignorée par le calcul.
- Le plan peut être marqué « à recalculer » (camion changé, étape 9) : la page le dit et propose de relancer le calcul.

## Étape 10c · Placeur après report

- [x] Fait — branche `fix/p1-placeur-apres-report`
- Cahier technique : sections 4.2 (règles 4, 5 et 7), 4.3 et 4.4 ; demande de fusion de l'analyse (branche `test/p1-placeur-apres-report`).
- Constat de départ : sur « couloirs », quand on reporte toute la commande C4, le recalcul laisse les deux poutres de 6 m de C1 (A08, A09) sans place, alors qu'il y a plus de place qu'avant. Le test `it.fails` « RG-10 : place encore les deux poutres de 6 m de C1 » de `optimiser.test.ts` le reproduit.
- Cause : le placeur est glouton et pose C1 en dernier. Sans les palettes de C4, C3 est posé au fond sur toute la largeur ; ses paquets de BA13 enjambent le seul couloir libre au plancher (appui de 83 %, permis). Une poutre de 6 m doit commencer à moins de 1 200 mm du fond : sous les BA13, elle est refusée (règle 5 : 500 kg sur 220 kg ; règle 7 : C3 posé sur C1) ; sur les BA13, elle n'a que 2 500 mm d'appui sur 6 000, sous les 60 % (règle 4). Les seize variantes ne changent ni l'ordre des commandes ni ce choix : toutes échouent. Avec C4, les palettes repoussaient C3 à 1 200 mm et le couloir entre elles restait ouvert, par chance.
- Pistes, de la plus simple à la plus complexe, mesurées avec un prototype non conservé (parts à gauche : départ, après C1, après C2) :
  1. **Ordre « longs d'abord »** : seize variantes de plus, où les unités plus longues que la moitié de la caisse passent en tête, dans l'ordre des rangs. Sans C4 : tout est placé, 39 / 44 / 42, soit 61 / 39 au pire moment (« Déséquilibré »). « Couloirs » complet : 58 / 42, inchangé. Deux fois plus de passages du placeur, ou seulement quand il reste des articles en trop.
  2. **Appui complet d'abord** : dans le choix du placeur (4.3, étape 4), entre deux places de même compacité, préférer celle où l'unité est au plancher ou repose sur toute sa base, avant le calage. Les BA13 s'empilent au lieu d'enjamber le couloir. Sans C4 : tout est placé, 56 / 60 / 60, soit 60 / 40 au pire moment (« À surveiller »). « Couloirs » complet : 58 / 42, inchangé.
  3. **Retour arrière** : quand des unités restent en trop, retirer ce qui leur bloque la place puis le replacer après elles. Retirer une seule unité ne suffit pas (mesuré) : il faut retirer A04, A05 et A12, donc revenir sur une commande entière, en gardant un ordre de chargement réalisable. Effet sur l'équilibre non mesuré.
  - Écartée : reprendre les articles en trop en premier. Les poutres passent, mais les fenêtres de C2 (A10, A11) ne trouvent plus de calage et restent en trop.
- **Piste retenue : piste 2, appui complet d'abord**, choisie par le porteur dans la demande de fusion de l'analyse. Modification du cahier qui en découle : critère d'appui complet en 4.3 ; retour arrière (piste 3) et limite de 60 % tenue tout juste en points ouverts (section 10).
- **Critère de réussite** : le test `it.fails` passe pour de vrai, en `it`. Sur « couloirs » sans C4, aucun article en trop ni mal calé, jamais au-delà de 60 % d'un côté. Sur « couloirs » complet, les tests de l'étape 4c restent verts (58 / 42 au pire moment).
- Mesurer le temps de calcul d'`optimiser` sur « couloirs » avant et après, et le noter dans la demande de fusion.

## Étape 11 · Recette du prototype 1

- [x] Fait — branche `test/p1-recette`
- Vérifier chaque critère d'acceptation de `docs/prototypes/prototype-1.md`, compléter les tests manquants, vérifier que chaque RG du prototype a un test portant son numéro.
- Parcours clavier complet et passage axe-core ; captures des écrans comparées aux maquettes, avec la liste des écarts.
- Après la fusion : étiquette `v0.1.0`.

---

## Prototype 2 · Ajustement manuel

Fiche : `docs/prototypes/prototype-2.md`. Les questions ouvertes du prototype ont été tranchées le 19 novembre 2026 : section « Décisions sur les points ouverts » de la fiche ; chaque étape rappelle celles qui la concernent. Une question nouvelle, que ni la fiche ni les cahiers ne tranchent : s'arrêter et la poser, sans décider seul.

L'ordre suit la règle du projet : le domaine d'abord, en TDD, puis les données, puis l'interface, et une recette pour finir. Chaque étape peut être fusionnée seule : à sa fusion, l'application reste utilisable et sans régression.

## Étape P2-1 · Domaine : ordre de chargement

- [x] Fait — branche `feat/p2-ordre-chargement`
- Cahier technique : sections 4.2 (règle 7), 4.7 et 4.8. Cahier fonctionnel : RG-07, RG-08. Décision de la fiche : 3 (départage).
- `ordonnerChargement(plan, unites, camion)`, en TDD : contraintes d'appui (ce qui porte est chargé avant), contraintes d'accès (un article gênant au sens de la règle 7 est chargé après), tri topologique, départage, `null` en cas de cycle.
- Réutiliser la géométrie de la règle 7 du validateur plutôt que la recopier (remaniement à part si besoin).
- Tests de référence : sur « couloirs », l'ordre rendu est réalisable et respecte les deux contraintes ; une palette posée à la main sur une autre est chargée après elle ; une disposition sans ordre possible rend `null` (test « RG-08 : … »).
- Rien ne change dans l'interface.

## Étape P2-2 · Domaine : déplacement et rotation

- [x] Fait — branche `feat/p2-deplacement`
- Cahier technique : sections 4.2, 5.2 (étape 5), 5.5 et 5.7. Cahier fonctionnel : RG-04, RG-06 à RG-09, RG-19. Décisions de la fiche : 1 (rotation), 2 (hauteur d'un article déplacé).
- Fonctions pures, en TDD, un test par règle :
  - déplacer une unité vers une position : RG-06 et RG-09 d'abord (chevauchement, hors caisse), puis les autres règles du validateur (RG-04, RG-07, RG-19), puis `ordonnerChargement` ; le résultat est soit le nouveau plan avec ses rangs, soit un refus avec les règles enfreintes ;
  - changer d'orientation, parmi les orientations autorisées, contrôlé comme un déplacement ;
  - retirer une unité vers la zone « Articles à placer », et l'y remettre.
- Messages de refus : un texte par règle, en langage courant, avec le numéro de RG (capture 04f) ; textes dans `src/textes/fr.ts`. Vérifier que chaque message cite la bonne RG (écarts connus de la maquette).
- Tests de référence sur « couloirs » : A12 posé sur A11 refusé (fragile, RG-04, RG-08) ; chevauchement et sortie de la caisse refusés (RG-09) ; fenêtre debout déplacée sans calage refusée (RG-19) ; article de C1 placé derrière C3 dans sa bande refusé (RG-07) ; un déplacement permis rend un plan accepté par le validateur, avec un ordre recalculé.

## Étape P2-3 · Domaine : aimantation, pas au clavier et places proposées

- [x] Fait — branche `feat/p2-aimantation`
- Cahier technique : sections 4.3, 5.2 (étape 4), 5.3 et 5.7. Décisions de la fiche : 7 (distance d'aimantation), 9 (placement automatique), 10 (places proposées).
- Fonctions pures, en TDD :
  - aimantation : une position proche d'une paroi ou du bord d'un article, à moins du seuil, s'y colle ;
  - pas au clavier : `PAS_CLAVIER` (50 mm) et `PAS_CLAVIER_GRAND` (500 mm) dans `constantes.ts` ; avec l'aimantation, un pas qui entrerait dans une paroi ou un article est raccourci jusqu'au contact ; sans elle, le pas est entier ;
  - places proposées pour « Choisir une place » (capture 04h) : positions permises pour une unité, dans son orientation actuelle ;
  - placement automatique d'un ou de tous les articles de la zone (« Placer », « Tout placer »), sans déplacer les autres.
- Mesurer le temps de calcul des places proposées sur « couloirs » et le noter dans la demande de fusion.

## Étape P2-4 · Données : version ajustée à la main

- [ ] Fait — branche `feat/p2-donnees-ajustement`
- Cahier technique : sections 3, 6.1 et 7.1. Cahier fonctionnel : RG-21 (raccourcis), RG-22.
- Migration : colonne « ajustée à la main » de `plan_chargement` ; fonction SQL qui enregistre en une seule opération la disposition ajustée de la dernière version (placements modifiés, supprimés et ajoutés, rangs, marque), avec ses `GRANT` au rôle `anon` et un commentaire sur les politiques à durcir avec les comptes (`CLAUDE.md`, section Supabase).
- Dépôts : `PlanRepository.ajuster`, et l'obtention d'une version donnée pour la consulter ; implémentations Supabase et en mémoire, tests de contrat. Refus d'ajuster une version qui n'est pas la dernière.
- Préférences de l'appareil (aimantation, raccourcis) : lecture et écriture dans le stockage local, protégées par `try/catch`, avec une valeur par défaut si rien n'est lu.
- `validerRaccourcis` dans `domaine/validation.ts`, en TDD : une touche ne sert qu'à une action, message « La touche R sert déjà à … » (RG-21, capture 04i).
- Rien ne change encore dans l'interface.

## Étape P2-5 · Plan : ajuster au clavier et sans glisser

- [ ] Fait — branche `feat/p2-ajustement-clavier`
- Captures 04f, 04h. Cahier technique : sections 5.3, 5.5, 5.7, 5.18 et 6. Cahier fonctionnel : 4.4, RG-08, RG-09, RG-22. Décisions de la fiche : 4 (annulation), 5 (confirmation de relance), 8 (plans ajustables).
- Le chemin accessible d'abord, sans glisser-déposer :
  - carte de l'article sélectionné : changer d'orientation, « Choisir une place », « Retirer du plan » ;
  - au clavier : flèches et Maj + flèches, Entrée valide, Échap annule ; arrêt au contact avec l'aimantation ; R et Suppr, aux valeurs par défaut, n'agissent que quand l'article a le focus, ce qui reste conforme aux WCAG (critère 2.1.4) tant qu'ils ne sont pas personnalisables (étape P2-7) ;
  - « Choisir une place » : marques « + » dans les vues, un clic ou un toucher place l'article ;
  - zone « Articles à placer » : « Placer », « Tout placer » ;
  - interrupteur d'aimantation, choix mémorisé ;
  - message de refus dans un bandeau annoncé par `aria-live`, l'article reprend sa place ; focus replacé sur l'article.
- Enregistrement immédiat de chaque changement accepté, mention « ajustée à la main » ; « Annuler le dernier déplacement » par un bouton et Ctrl + Z.
- « Relancer le calcul » et « Reporter toute la commande » sur un plan ajusté : confirmation qui prévient que les ajustements seront perdus (RG-22).
- Ordre de chargement, bandeau de calage et indicateur d'équilibre mis à jour à chaque changement.
- Tests de composants et de bout en bout : déplacement permis puis refusé, annulation, rechargement de la page ; axe-core sur la page en cours d'ajustement.

## Étape P2-6 · Plan : glisser-déposer

- [ ] Fait — branche `feat/p2-glisser-deposer`
- Captures 04, 04f. Cahier technique : sections 5.1, 5.2, 5.4 et 5.7. Décision de la fiche : 2 (hauteur d'un article déplacé).
- Pointer Events : souris, doigt et stylet avec le même code. Dans chaque vue, l'article suit le pointeur sur les deux axes montrés.
- Validation continue pendant le geste : contour, icône et court texte, jamais la couleur seule ; `ombre-flottant` sur l'article saisi, seule ombre du plan ; aimantation.
- Dépôt dans le camion ou dans la zone « Articles à placer », sortie de la zone vers le camion ; animation d'emboîtement, désactivée avec `prefers-reduced-motion`.
- Mêmes fonctions du domaine et même enregistrement qu'à l'étape P2-5 : le glisser n'est qu'une autre façon de proposer une position.
- Tests de bout en bout du glisser-déposer avec Playwright (souris et toucher).

## Étape P2-7 · Plan : raccourcis personnalisables et anciennes versions

- [ ] Fait — branche `feat/p2-raccourcis-versions`
- Captures 04g, 04i. Cahier technique : sections 5.6 et 5.18. Cahier fonctionnel : RG-21. Décision de la fiche : 6 (anciennes versions).
- Panneau « Raccourcis clavier », ouvert par le bouton et par la touche « ? » : modifier un raccourci, refus immédiat d'une touche déjà prise, sous le raccourci et dans le résumé (RG-21), Échap annule la modification, « Rétablir les raccourcis par défaut » ; choix mémorisé sur l'appareil. Les flèches et Ctrl + Z y figurent avec la mention « Fixe ».
- Tous les raccourcis du plan passent par ce réglage, y compris ceux de l'étape P2-5.
- Consultation des anciennes versions du plan, en lecture seule.
- Tests de composants du panneau ; axe-core avec le panneau ouvert.

## Étape P2-8 · Recette du prototype 2

- [ ] Fait — branche `test/p2-recette`
- Vérifier chaque critère d'acceptation de `docs/prototypes/prototype-2.md`, compléter les tests manquants, vérifier que chaque RG du prototype a un test portant son numéro.
- Parcours clavier complet de l'ajustement et passage axe-core ; parcours au toucher ; captures des écrans comparées aux maquettes 04f à 04i, avec la liste des écarts.
- Après la fusion : étiquette `v0.2.0`.
