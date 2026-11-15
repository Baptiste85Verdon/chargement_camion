# Prototype 1 — Catalogue, commandes et calcul 2D

Fiche de spécification du prototype 1 (cahier technique, section 9.1). Elle dit **quoi** livrer ; le **comment** est dans `docs/cahier-technique.md`, le découpage en sessions dans `docs/sessions-claude-code.md`.

## Objectif

À partir de commandes saisies, l'application calcule un plan de chargement réalisable, l'affiche dans les cinq vues 2D et la vue par étape, signale un dépassement et permet de reporter ce qui ne rentre pas.

## Périmètre

**Inclus** (cahier fonctionnel, section 2) :

- catalogue d'articles et fiches, modèles de camions et fiches, avec la base d'exemple ;
- saisie express des commandes, dimensions et poids propres à une commande ;
- préparation d'une tournée : camion, commandes, ordre de livraison ;
- calcul automatique : validateur, placeur, choix du meilleur plan (`optimiser`), calage, équilibre ;
- plan de chargement en lecture :
  - deux cadres de vue avec cinq vues au choix ;
  - repères Fond / Portes et lignes de cote ;
  - articles cachés, filtre de profondeur, zoom ;
  - mise en évidence d'une commande ;
  - vue par étape avec silhouettes ;
  - tableau des placements ;
  - ordre de chargement ;
  - indicateur d'équilibre et bandeau de calage ;
- dépassement, zone « Articles à placer » avec les articles en trop, report vers la liste d'attente, liste d'attente ;
- vérification des saisies et fenêtres de confirmation sur tous ces écrans.

**Exclu** (prototypes suivants) :

- **Prototype 2** : ajustement manuel, c'est-à-dire glisser-déposer, rotation, aimantation, placement sans glisser, raccourcis personnalisables, retrait et remise d'un article (RG-08, RG-09).
- **Prototype 3** : mode quai.
- **Prototype 4** : signalement, revérification et nouvelle simulation (RG-12 à RG-16).

**Hors V1** : 3D, sanglage, charge utile et charge par essieu, comptes.

## Règles de gestion couvertes

| RG | Sujet | Où |
| --- | --- | --- |
| RG-01 | Base d'exemple au premier lancement | Données de démarrage |
| RG-02 | Taille maximale par défaut, tailles nue et emballée | Domaine, fiche article |
| RG-03 | Dimensions et poids propres à une commande, poids estimé au prorata | Domaine, saisie express |
| RG-04 | Règles de placement (orientations, fragiles, lourds en bas, équilibre) | Validateur |
| RG-05 | Poids utilisé pour le placement seulement | Placeur |
| RG-06 | Aucun chevauchement, rien hors de la caisse | Validateur |
| RG-07 | Ordre de déchargement garanti par l'accès | Validateur |
| RG-10 | Dépassement signalé | Placeur, plan |
| RG-11 | Report de la commande entière ou des articles en trop | Plan, liste d'attente |
| RG-17 | Pas de compte en V1 | Architecture |
| RG-18 | Boîte englobante, forme, dessus porteur | Domaine, fiche article, plan |
| RG-19 | Calage | Validateur, `diagnostiquerCalage`, plan |
| RG-20 | Équilibre de la charge | `mesurerEquilibre`, `optimiser`, plan |
| RG-21 | Vérification des saisies | `domaine/validation.ts`, formulaires |
| RG-22 | Fenêtres de confirmation | Composant `ConfirmationDialog` |

## Écrans et maquette de référence

Les captures sont dans `docs/maquettes/captures/` :

| Écran | Captures |
| --- | --- |
| Accueil · tournées | 01 |
| Préparation d'une tournée | 02, 02e |
| Saisie express | 03, 03b, 03e |
| Plan de chargement | 04, 04a, 04b, 04c, 04d, 04e |
| Catalogue | 07 |
| Fiche article | 08, 08e |
| Modèles de camions et fiche camion | 09, 09b, 09e |
| Liste d'attente | 10 |

Les captures 04f à 04i (ajustement manuel, raccourcis) servent au prototype 2 ; les captures 05 et 06 aux prototypes 3 et 4.

## Critères d'acceptation

Le prototype 1 est accepté quand :

- [x] Pour le jeu d'essai « couloirs », le validateur n'enfreint aucune règle et ne signale aucun article mal calé. L'équilibre vaut 55 / 45 au départ et 59 / 41 après C1, statut « À surveiller ».
- [x] Pour la variante « fenêtres isolées », A10 et A11 sont refusés (RG-19) et le bandeau signale A10, A11 et A12.
- [x] Deux fenêtres debout face à face, seules au milieu de la caisse, sont refusées.
- [ ] À partir des commandes du jeu « couloirs », `optimiser` trouve un plan sans article en trop, sans règle enfreinte, et au moins aussi équilibré au pire moment de la tournée.
- [ ] Pour une tournée d'essai de plusieurs commandes saisies dans l'application, le plan ne présente aucun chevauchement et respecte les règles de placement et l'ordre de livraison.
- [ ] Un dépassement est signalé, et le report de la commande entière ou des seuls articles en trop vers la liste d'attente fonctionne.
- [x] Les cinq vues et la vue par étape montrent le plan, avec le fond et les portes toujours indiqués.
- [ ] Chaque formulaire applique RG-21, et chaque suppression passe par une confirmation (RG-22).
- [ ] axe-core ne trouve aucune erreur sur les pages du prototype, et un parcours complet est possible au clavier seul.
- [ ] Chaque RG du tableau ci-dessus a au moins un test qui porte son numéro.
- [ ] Le porteur sait expliquer le validateur, le placeur et `optimiser`.

## Avancement

Le suivi détaillé, étape par étape, est dans `docs/sessions-claude-code.md`. Quand tous les critères sont cochés : étiquette `v0.1.0` sur `main`.
