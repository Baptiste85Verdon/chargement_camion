# Sessions Claude Code — prototype 1

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

- [ ] Fait — branche `feat/p1-equilibre-placeur`
- Cahier technique : sections 4.3, 4.4 et 4.5 ; demande de fusion de l'étape 4, « Écart connu : équilibre d'`optimiser` sur « couloirs » ».
- Constat de départ : sur « couloirs », `optimiser` donne un plan complet et valide, mais à 66 / 34 au pire moment (après C3), contre 59 / 41 pour la référence. Le placeur ne crée de points qu'au bord des unités posées depuis le coin gauche et n'atteint pas la paroi droite.
- **Piste retenue : points projetés contre la paroi opposée.** Après chaque unité posée, le placeur ajoute un quatrième point candidat, celui « à côté », poussé jusqu'à la paroi d'en face. Les 8 variantes sont lancées avec et sans ce point, soit 16, et la comparaison de 4.4 garde la meilleure.
- **Complément, seulement si la piste 1 ne suffit pas** : des déplacements en plus des échanges à l'étape 3 de 4.4. On retire une unité sans rien dessus, ou toute une commande, pour la replacer ailleurs ; le coup est gardé aux mêmes conditions qu'un échange (validateur, calage, équilibre).
- Proposer les modifications du cahier qui en découlent (4.3 étape 5, 4.4 étapes 1 et 3, seuils provisoires de la section 10) avant de les faire.
- **Critère de réussite** : sur « couloirs », `optimiser` obtient 59 / 41 ou mieux au pire moment, sans article en trop ni article mal calé. Le test marqué `it.fails` dans `optimiser.test.ts` passe pour de vrai, en `it`.
- Mesurer le temps de calcul de `placer` et d'`optimiser` sur « couloirs » avant et après, et noter les deux dans la demande de fusion.

## Étape 6 · Données et validations de saisie

- [ ] Fait — branche `feat/p1-donnees`
- Cahier technique : sections 3, 6.1, 7.1, 7.2.
- Vérifier que `.env.local` existe avec l'URL et la clé publique. Le porteur relie la CLI Supabase au projet lui-même si un mot de passe est demandé.
- Migrations SQL (tables, contraintes `NOT NULL`, `CHECK`, `UNIQUE`, `GRANT` au rôle `anon` et politiques RLS : voir la section Supabase de `CLAUDE.md`), données de démarrage (RG-01, avec la tournée T-2026-118 du jeu « couloirs »).
- Dépôts : interfaces, implémentation Supabase, implémentation en mémoire.
- `domaine/validation.ts` (RG-21) en TDD, un test par ligne du tableau.

## Étape 7 · Composants de base

- [ ] Fait — branche `feat/p1-composants-base`
- Charte graphique et `docs/design-system.md`.
- Composants Vue :
  - `Bouton`, `Selecteur`, `Interrupteur`, `Bandeau`, `CodeCommande`, `Carte`, `Badge`, `Touche` ;
  - `Champ`, avec ses états et le résumé des erreurs ;
  - `ConfirmationDialog`, en `<dialog>` natif (RG-22).
- Une vitrine de ces composants avec leurs états, et un test axe-core sur la vitrine.
- Fichier de textes en français.

## Étape 8 · Référentiels

- [ ] Fait — branche `feat/p1-referentiels`
- Captures 07, 08, 08e, 09, 09b, 09e. Cahier fonctionnel : sections 4.6 et 4.7, RG-18, RG-21, RG-22.
- Catalogue avec recherche et filtre, fiche article (case « Peut être livré nu », orientations par défaut selon la famille, forme, dessus porteur), modèles de camions et fiche camion.

## Étape 9 · Tournées, commandes et liste d'attente

- [ ] Fait — branche `feat/p1-tournees-commandes`
- Captures 01, 02, 02e, 03, 03b, 03e, 10. Cahier fonctionnel : sections 4.1 à 4.3 et 4.8, RG-03, RG-11.
- Accueil, préparation d'une tournée (ordre de livraison), saisie express (poids estimé), liste d'attente, lancement du calcul.

## Étape 10 · Plan de chargement

- [ ] Fait — branche `feat/p1-plan-chargement`
- Captures 04, 04a à 04e. Cahier technique : sections 5.1, 5.8 à 5.12, 5.14, 5.16 et 5.17.
- Ce qui est à construire :
  - deux cadres de vue avec leurs sélecteurs ;
  - repères Fond / Portes, cotes, zoom, articles cachés et filtre de profondeur ;
  - mise en évidence d'une commande, vue par étape avec silhouettes ;
  - tableau des placements, ordre de chargement ;
  - carte d'équilibre avec le centre de gravité, bandeau de calage ;
  - dépassement et report dans la zone « Articles à placer ».
- Peut être découpée en deux sessions si elle est trop longue : d'abord les vues, puis le reste.

## Étape 11 · Recette du prototype 1

- [ ] Fait — branche `test/p1-recette`
- Vérifier chaque critère d'acceptation de `docs/prototypes/prototype-1.md`, compléter les tests manquants, vérifier que chaque RG du prototype a un test portant son numéro.
- Parcours clavier complet et passage axe-core ; captures des écrans comparées aux maquettes, avec la liste des écarts.
- Après la fusion : étiquette `v0.1.0`.
