# Conventions Git et GitHub

Claude Code crée les branches, fait les commits, pousse et ouvre les demandes de fusion. Le porteur relit et fusionne. Ces règles s'appliquent à chaque session.

## Branches

- `main` est protégée : on n'y commite jamais directement. Tout passe par une demande de fusion (pull request) dont l'intégration continue est verte.
- Une branche par tâche, courte (quelques heures à deux jours de travail), créée depuis `main` à jour.
- Nom : `type/pN-sujet-court`, en minuscules, mots séparés par des tirets, sans accents.
  - `type` : celui du commit principal (voir plus bas).
  - `pN` : le prototype concerné (`p1`, `p2`…).
  - Exemples : `chore/p1-socle-projet`, `feat/p1-validateur-appui`, `feat/p1-placeur-glouton`, `fix/p1-calage-groupe-debout`, `docs/p1-fiche-prototype`.
- La branche est supprimée après la fusion.

## Commits : Conventional Commits, en français

Format : `type(portée): description`

- **type** :
  - `feat` : nouvelle fonctionnalité ou nouvelle règle ;
  - `fix` : correction d'un défaut ;
  - `test` : ajout ou correction de tests seuls ;
  - `refactor` : remaniement sans changement de comportement ;
  - `docs` : documentation ;
  - `style` : mise en forme du code, sans effet ;
  - `chore` : outillage, dépendances, configuration ;
  - `ci` : intégration continue ;
  - `perf` : performance.
- **portée** : le module touché, par exemple `domaine`, `validateur`, `placeur`, `equilibre`, `plan2d`, `donnees`, `ui`, `formulaires`, `styles`, `ci`, `docs`.
- **description** : au présent, sans majuscule initiale ni point final, 72 caractères au plus, avec le numéro de règle quand il y en a un.
  - `feat(validateur): refuse un article qui dépasse de la caisse (RG-06)`
  - `test(placeur): ajoute le jeu d'essai couloirs`
  - `fix(equilibre): juge le statut sur les pourcentages arrondis`
- **corps** (facultatif, après une ligne vide) : pourquoi le changement, ce qu'il faut savoir. Pas de paraphrase du code.
- Un commit = un changement cohérent qui compile et dont les tests passent. En TDD, on commite à chaque étape verte : le test et le code minimal ensemble, puis le remaniement à part si besoin.

## Rythme

- Commit à chaque étape verte, et au moins toutes les heures de travail effectif.
- Push à la fin de chaque étape significative et toujours en fin de session : rien ne reste seulement sur le PC.
- Demande de fusion dès que la tâche de la branche est terminée, sans attendre d'en accumuler plusieurs.
- Avant chaque commit : `npm run typecheck`, `npm run lint`, `npm run test`. Avant la demande de fusion : `npm run test:e2e`.

## Demandes de fusion

- Ouvertes avec `gh pr create`.
- Titre au format des commits : il devient le message du commit sur `main` (fusion « squash and merge »).
- Description :
  - ce qui change et pourquoi ;
  - les RG couvertes et les tests correspondants ;
  - une capture pour tout changement d'interface ;
  - ce qui reste à faire ou les écarts avec la maquette ou le cahier ;
  - une courte explication du code, pour la relecture.
- Le porteur relit, pose ses questions, puis fusionne. Claude Code ne fusionne jamais lui-même.

## Versions

À la fin de chaque prototype, une étiquette sur `main` : `v0.1.0` pour le prototype 1, `v0.2.0` pour le 2, etc.

## Ce qui ne va jamais dans le dépôt

`.env.local`, clés secrètes Supabase (`sb_secret_…`), mot de passe de la base, jetons d'accès. `.env.example` sert de modèle, avec des valeurs factices.

## Réglage GitHub à faire une fois (par le porteur)

Dans le dépôt : Settings → Branches (ou Rules) → ajouter une règle pour `main` qui exige une demande de fusion et la réussite de l'intégration continue avant fusion.
