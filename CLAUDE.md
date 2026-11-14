# Plan de chargement — consignes pour Claude Code

Application web qui calcule et affiche le plan de chargement d'un camion de livraison à caisse fermée (négoce de matériaux), puis guide l'opérateur étape par étape sur le quai. Projet personnel d'apprentissage : **le porteur doit comprendre et savoir expliquer tout le code**, en particulier l'algorithme de placement.

Réponds et écris en **français** : messages, commentaires, noms de commits, descriptions de demandes de fusion. Les identifiants de code suivent le vocabulaire métier des cahiers (`placer`, `valider`, `Unite`, `Placement`, `tournee`…).

## Les documents font référence

Lis-les avant de coder ; en cas de doute, ils l'emportent sur ta mémoire et sur la maquette.

| Fichier | Contenu |
| --- | --- |
| `docs/cahier-fonctionnel.md` | Ce que fait l'application : pages, règles de gestion RG-01 à RG-22, critères d'acceptation |
| `docs/cahier-technique.md` | Comment : architecture, modèle de données, algorithme, plan 2D, formulaires, tests, organisation du dépôt, jeu d'essai (section 8) |
| `docs/charte-graphique.md` | Direction artistique : couleurs, typographie, formes, états, formulaires, fenêtres |
| `docs/design-system.md` | Règles d'usage des jetons et des composants |
| `src/styles/plan-de-chargement.tokens.json` | Source unique des couleurs, typographies, espacements, rayons, épaisseurs, ombre |
| `docs/maquettes/` | Maquette validée : captures par écran (`captures/`, index dans `README.md`) et archive cliquable |
| `docs/prototypes/prototype-1.md` | Fiche du prototype en cours : périmètre, RG, étapes, critères |
| `docs/sessions-claude-code.md` | Découpage en sessions et étape en cours |
| `docs/conventions-git.md` | Branches, commits, demandes de fusion |
| `tests/jeux-essai/` | Jeux d'essai « couloirs » et « fenêtres isolées », avec résultats attendus |

Si un document et la maquette se contredisent, **le cahier l'emporte** : signale l'écart, ne tranche pas seul. Ne modifie jamais un document de `docs/` sans accord explicite ; propose la modification. Seule exception : cocher la case de l'étape terminée dans `docs/sessions-claude-code.md` et dans la fiche du prototype.

**Défauts connus de la maquette** : la section « Écarts connus à corriger dans le code » de `docs/maquettes/README.md` liste des défauts déjà repérés. Avant de coder un écran, relis-la : applique la correction décrite, ne reproduis jamais le défaut de la capture. Si tu en trouves un nouveau, signale-le et propose de l'ajouter à cette liste.

## Commandes

Node 22.12 ou plus récent. Après un `git clone` : `npm install` puis `npx playwright install chromium`.

```
npm run dev         # jetons -> CSS, puis serveur de développement (http://localhost:5173)
npm run build       # jetons -> CSS, vérification des types, construction dans dist/
npm run test        # Vitest (tests/unitaires/ et src/**/*.test.ts)
npm run test:watch  # Vitest en continu, pendant le TDD
npm run test:e2e    # Playwright + axe-core (construit puis sert l'application sur le port 4173)
npm run lint        # ESLint + Stylelint + vérification Prettier
npm run format      # Prettier : remet en forme tous les fichiers
npm run typecheck   # vue-tsc
npm run tokens      # jetons JSON -> src/styles/jetons.css (fichier généré, non versionné)
```

- `src/styles/jetons.css` est généré : ne le modifiez pas, modifiez `plan-de-chargement.tokens.json` puis relancez `npm run tokens`. Les variables portent le nom de la charte (`--encre`, `--cmd1-bord`, `--rayon-carte`) ; les typographies s'emploient avec `font: var(--typo-corps)` (plus `letter-spacing: var(--typo-titre-page-interlettrage)` quand il existe).
- Stylelint refuse les couleurs en dur, les rayons hors jetons `rayon-*` et toute ombre qui n'est pas `var(--ombre-flottant)` ou l'anneau de focus.
- ESLint refuse tout import de Vue, Pinia ou Supabase, et de toute autre couche, dans `src/domaine/`.
- Textes de l'interface : `src/textes/fr.ts`.

## Architecture (cahier technique, sections 1, 2 et 9.2)

- Vue 3 (Composition API, `<script setup lang="ts">`), TypeScript **strict**, Vite, Vue Router, Pinia.
- `src/domaine/` : types, validateur, placeur, `optimiser`, `mesurerEquilibre`, `diagnostiquerCalage`, `projeter`, `coter`, validations de saisie. **TypeScript pur** : n'importe rien de Vue ni de Supabase. Fonctions pures, sans effet de bord.
- `src/donnees/` : dépôts (`ArticleRepository`…), seul endroit qui connaît Supabase ; une implémentation en mémoire pour les tests.
- Dimensions en **millimètres entiers**, poids en **kilogrammes**. Repère : x du fond vers les portes, y depuis la paroi gauche, z depuis le plancher.
- Plan 2D en SVG, `viewBox` en millimètres ; contours et textes à taille fixe (`vector-effect: non-scaling-stroke`, calque de libellés).
- N'ajoute aucune dépendance sans me demander, en expliquant pourquoi et l'alternative sans dépendance.

## Supabase

- Le projet a été créé avec l'API de données activée, **l'exposition automatique des nouvelles tables désactivée** et **le RLS automatique activé**.
- Conséquence : chaque migration qui crée une table contient aussi ses `GRANT` explicites au rôle `anon` (seulement les opérations utiles) et ses politiques RLS. Sans eux, l'application ne voit pas la table.
- V1 sans compte (RG-17) : les politiques autorisent le rôle `anon`. Explique-le dans la migration en commentaire, en rappelant que c'est à durcir quand les comptes arriveront.
- Migrations versionnées dans `supabase/migrations/`, jamais de modification de schéma à la main dans le tableau de bord.

## Méthode : TDD, règle par règle

1. Écris le test qui échoue, puis le code minimal qui le fait passer, puis remanie.
2. Chaque règle de gestion a au moins un test dont le nom commence par son numéro : `it('RG-19 : refuse une fenêtre debout sans calage', …)`.
3. Les jeux d'essai de `tests/jeux-essai/` sont des tests de référence : leurs résultats attendus doivent passer tels quels.
4. Avant chaque commit : `npm run typecheck`, `npm run lint`, `npm run test`. Avant chaque demande de fusion : aussi `npm run test:e2e`.

## Interface : règles d'or (charte et design system)

- **Jetons uniquement** : jamais de couleur, rayon, ombre ou taille en dur ; utilise les variables CSS générées depuis le fichier de jetons.
- Thème clair seul. Une seule couleur d'interaction (`action`). Boutons principaux en `encre`, jamais en bleu.
- Coins francs : `rayon-carte` (8 px) au plus, sauf interrupteurs. **Aucune ombre** sauf `ombre-flottant` (menus, info-bulles, fenêtres de confirmation, article en cours de glisser).
- IBM Plex Sans pour l'interface, IBM Plex Mono pour toutes les données. Icônes au trait (Lucide en option, une seule famille).
- Couleur jamais seule : code de commande (C1, C2…) sur chaque article, icône et texte pour chaque état. Rouge `erreur` = à corriger ou perte de données ; ambre = avertissement.
- Erreurs de saisie sous le champ, jamais en fenêtre (RG-21). Fenêtre de confirmation seulement avant une action destructrice ou irréversible (RG-22), en `<dialog>` natif.
- Textes : vouvoiement, boutons en verbe à l'infinitif, messages courts qui disent ce qui se passe puis quoi faire, sans point d'exclamation. Tous les textes dans le fichier de textes, pas en dur dans les composants.
- Accessibilité WCAG 2.2 AA : focus visible (double anneau), tout au clavier, alternative au glisser-déposer, `aria-live` pour les messages, nom accessible pour chaque article du plan.
- À éviter : fonds crème, dégradés, verre dépoli, cartes très arrondies ou à bordure colorée sur un seul côté, émojis, Inter ou Roboto.

## Git (détail dans `docs/conventions-git.md`)

- Jamais de commit sur `main` : une branche par tâche, nommée `type/p1-sujet-court` (ex. `feat/p1-validateur-appui`).
- Commits au format Conventional Commits, en français : `feat(domaine): refuse un article posé sur un fragile (RG-04)`. Un commit = un changement cohérent, tests verts.
- Pousse la branche à la fin de chaque étape TDD significative et en fin de session. Ouvre la demande de fusion avec `gh pr create`, titre au même format.
- **Ne fusionne jamais toi-même** : le porteur relit et fusionne (squash and merge).
- Ne commite jamais `.env.local`, une clé ou un mot de passe. Seule la clé publique Supabase (`sb_publishable_…`) va dans le code client, via `import.meta.env`.

## Début de chaque session

Quand le porteur écrit « Étape suivante » (ou « Étape N ») :

1. `git checkout main` puis `git pull`.
2. Dans `docs/sessions-claude-code.md`, prends la première étape non cochée (ou l'étape N). Si l'étape précédente n'est pas cochée sur `main`, c'est que sa demande de fusion n'est pas encore fusionnée : arrête-toi et dis-le.
3. Lis les sections du cahier, les captures et les écarts connus cités pour l'étape, annonce en quelques lignes ce que tu vas faire, puis crée la branche indiquée et travaille.
4. Une étape à la fois : ne commence jamais l'étape suivante dans la même session.

Quand le porteur écrit « Reprends » : reprends l'étape en cours sur sa branche, là où elle s'est arrêtée.

## Fin de chaque session

Résume en français : ce qui a été fait, les RG couvertes et leurs tests, ce qui reste, et **une explication pédagogique du code écrit** (le porteur doit pouvoir l'expliquer). Coche la case de l'étape dans `docs/sessions-claude-code.md` (et dans la fiche du prototype si un critère est rempli) dans le dernier commit de la branche, pour qu'elle arrive sur `main` avec la fusion. Termine par : « Relisez et fusionnez la demande de fusion, puis tapez /clear et écrivez “Étape suivante”. »

## Demande-moi avant

Ajouter une dépendance ; modifier un document de `docs/` ; t'écarter de la maquette (hors écarts connus listés) ou du cahier ; changer la structure des dossiers ; toucher à la configuration Supabase ou à l'intégration continue en dehors de l'étape prévue.
