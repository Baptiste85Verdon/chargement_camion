# Prototype 2 — Ajustement manuel

Fiche de spécification du prototype 2 (cahier technique, section 9.1). Elle dit **quoi** livrer ; le **comment** est dans `docs/cahier-technique.md`, le découpage en sessions dans `docs/sessions-claude-code.md`.

## Objectif

Le préparateur corrige à la main le plan calculé : il déplace, fait pivoter, retire et remet des articles, à la souris, au doigt ou au clavier. Chaque déplacement passe par le validateur : un déplacement interdit est bloqué avec un message clair, un déplacement accepté est enregistré aussitôt, et l'ordre de chargement, le calage et l'équilibre se mettent à jour.

## Périmètre

**Inclus** :

- cahier fonctionnel, section 4.4, ajustement manuel :
  - déplacement par glisser-déposer dans les vues (cahier technique 5.2), avec validation continue et élévation de l'article saisi ;
  - aimantation activée par défaut, désactivable, choix mémorisé sur l'appareil (5.2) ;
  - déplacement sans glisser : au clavier, et d'un clic ou d'un toucher sur une destination proposée (5.3) ;
  - animation d'emboîtement au dépôt, désactivée avec `prefers-reduced-motion` (5.4) ;
  - rotation parmi les orientations autorisées, par un bouton et la touche R (5.5) ;
  - raccourcis clavier personnalisables, mémorisés sur l'appareil (5.6) ;
  - zone « Articles à placer » : retrait, remise à la main, boutons « Placer » et « Tout placer » (5.7) ;
- les décisions validées ci-dessous : enregistrement immédiat dans la version actuelle, annulation du dernier déplacement, ordre de chargement recalculé, pas au clavier ;
- calage et équilibre mis à jour à chaque déplacement (RG-19, RG-20) ;
- relance du calcul avec confirmation, et consultation des anciennes versions du plan.

**Exclu** (prototypes suivants) :

- **Prototype 3** : mode quai.
- **Prototype 4** : signalement, revérification et nouvelle simulation (RG-12 à RG-16).

**Hors V1** : 3D, sanglage, simulation physique (gravité, glissement), charge utile et charge par essieu, comptes.

## Décisions validées

Décisions du porteur du 19 novembre 2026, reportées dans les cahiers (cahier fonctionnel V5.11, cahier technique V3.15) :

- **Enregistrement et versions** : chaque déplacement accepté s'enregistre aussitôt dans la version actuelle du plan, qui est alors marquée « ajustée à la main ». « Relancer le calcul » crée une nouvelle version, après une confirmation qui prévient que les ajustements seront perdus (RG-22). L'ancienne version reste consultable.
- **Annulation** : « Annuler le dernier déplacement », par un bouton et par Ctrl + Z.
- **Ordre de chargement** : après un déplacement, il est recalculé par une fonction pure du domaine. Ce qui porte un article est chargé avant lui, et RG-07 est respectée. Si aucun ordre n'est possible, le déplacement est refusé (RG-08).
- **Pas au clavier** : 50 mm, et 500 mm avec Maj (valeurs provisoires). Avec l'aimantation active, l'article s'arrête au contact d'une paroi ou d'un autre article.

## Règles de gestion couvertes

| RG | Sujet | Où |
| --- | --- | --- |
| RG-08 | Déplacement qui enfreint une règle de placement bloqué, avec message ; aussi quand aucun ordre de chargement n'est possible | Domaine (déplacement, `ordonnerChargement`), plan |
| RG-09 | Chevauchement ou sortie de la caisse toujours bloqués, avec message | Domaine (déplacement), plan |
| RG-04 | Règles de placement : orientations, fragiles, debout au plancher, lourds en bas | Validateur, réutilisé |
| RG-06 | Aucun chevauchement, rien hors de la caisse | Validateur, réutilisé |
| RG-07 | Accès au déchargement ; ordre de chargement réalisable | Validateur, réutilisé ; `ordonnerChargement` |
| RG-19 | Article debout non calé refusé, autres mal calés signalés | Validateur et `diagnostiquerCalage`, réutilisés |
| RG-20 | Équilibre mis à jour à chaque déplacement | `mesurerEquilibre`, réutilisé |
| RG-21 | Raccourcis clavier : une touche ne sert qu'à une action, refus immédiat | `domaine/validation.ts`, panneau des raccourcis |
| RG-22 | Confirmation avant de relancer le calcul d'un plan ajusté à la main | `ConfirmationDialog`, réutilisé |

## Écrans et maquette de référence

Les captures sont dans `docs/maquettes/captures/` :

| Écran ou état | Capture | Référence |
| --- | --- | --- |
| Déplacement refusé | 04f | RG-08 |
| Panneau des raccourcis | 04g | CT 5.6 |
| Placement sans glisser | 04h | CT 5.3 |
| Raccourcis · erreurs | 04i | RG-21 |

Les captures 04 et 04b restent la référence pour la zone « Articles à placer » et la page du plan dans son ensemble. Relire avant chaque étape d'interface la section « Écarts connus à corriger dans le code » de `docs/maquettes/README.md`.

**Écarts relevés en préparant ce prototype**, à ajouter à cette liste si le porteur les valide :

- **04f et 04h, pas de déplacement** : la carte de l'article sélectionné et la barre d'outils annoncent un pas de 100 mm. Le pas décidé est de 50 mm, 500 mm avec Maj.
- **04f à 04i, bouton « Relancer la simulation »** : la page du plan dit déjà « Relancer le calcul ». La « nouvelle simulation » est réservée au mode quai (RG-15, RG-16) : garder « Relancer le calcul ».
- **04h, ordre de chargement** : l'article retiré (A12) y reste, grisé, à l'étape 12. Un article à placer n'a pas de position, donc pas de rang (cahier technique 5.7) : il sort de l'ordre de chargement et n'apparaît que dans la zone « Articles à placer ».
- **04g et 04i, panneau des raccourcis** : il ne contient pas « Annuler le dernier déplacement » (Ctrl + Z), décidé après la maquette.

## Points à trancher avant de coder

Les cahiers ne tranchent pas ces questions. Chacune porte une recommandation, à valider ou corriger par le porteur ; l'étape concernée est indiquée.

1. **Rotation « Tourner de 90° »** (04f, 04h ; étape P2-2). La maquette propose un quart de tour à plat, qui échangerait longueur et largeur. Le modèle ne le permet pas : la longueur reste toujours selon x (cahier technique 4.7), et la rotation de 5.5 choisit « parmi les orientations autorisées ». *Recommandation* : au prototype 2, la rotation passe à l'orientation autorisée suivante (à plat, debout, contre une paroi), bouton « Changer d'orientation » ; le quart de tour à plat devient un point ouvert, car il touche au modèle, au validateur et au placeur.
2. **Hauteur d'un article déplacé dans une vue** (étape P2-2). En vue de dessus, on change x et y ; si z est gardé, un article posé sur un autre et glissé vers un espace libre « flotte » et il est refusé (appui, RG-04). *Recommandation* : en vue de dessus, l'article se pose au plus bas, sur le dessus le plus haut de ce qui se trouve sous son emprise (simple calcul, sans simulation physique) ; dans les vues de côté, avant et arrière, la coordonnée qui n'est pas montrée est gardée.
3. **Départage de l'ordre de chargement** (étape P2-1). Plusieurs ordres respectent souvent les contraintes. *Recommandation* : garder l'ordre précédent autant que possible (tri topologique qui suit l'ancien rang), pour qu'un petit déplacement change peu l'ordre affiché ; un article remis depuis la zone prend la place que lui donne sa position, du fond vers les portes puis du bas vers le haut.
4. **Profondeur de l'annulation** (étape P2-5). « Le dernier déplacement » peut être un seul niveau ou une pile. *Recommandation* : plusieurs niveaux, en mémoire pendant la visite de la page (pile vidée au rechargement et à chaque nouvelle version) ; elle couvre déplacement, rotation, retrait, remise et placement automatique ; chaque annulation est enregistrée aussitôt, comme un déplacement. Pas de « Rétablir » au prototype 2. Ctrl + Z est un raccourci fixe (combinaison standard, pas une touche seule), affiché « Fixe » dans le panneau, comme les flèches.
5. **Confirmation de relance** (étape P2-5). *Recommandation* : la confirmation ne s'ouvre que si la version actuelle est ajustée à la main ; sinon le calcul se relance sans fenêtre, puisque rien n'est perdu. Bouton de ton neutre (« Relancer le calcul ») : la version ajustée reste consultable, aucune donnée n'est supprimée. Le texte le dit : « Le nouveau calcul ne reprendra pas vos ajustements. La version 3, ajustée à la main, restera consultable. » La même confirmation précède le report d'une commande entière, qui relance le calcul (cahier technique, section 10).
6. **Consultation des anciennes versions** (étape P2-7). *Recommandation* : un sélecteur de version sur la page du plan ; une ancienne version s'affiche en lecture seule (pas d'ajustement, pas de passage en mode quai), avec un bandeau « Version 2 du 18 novembre, lecture seule » et un bouton « Revenir à la version actuelle ». Pas de restauration d'une ancienne version au prototype 2.
7. **Distance d'aimantation** (étape P2-3). Le cahier dit « près d'une paroi ou du bord d'un autre article » sans chiffre. *Recommandation* : un seuil en pixels écran (10 px, provisoire), converti en millimètres selon le zoom par l'interface ; la fonction du domaine reçoit le seuil en millimètres.
8. **Quand l'ajustement est permis** (étape P2-5). *Recommandation* : seulement pour la version actuelle d'une tournée « en préparation », et pas quand le plan est « à recalculer » (il a été calculé pour une autre caisse). Sinon les commandes d'ajustement sont absentes, et un texte dit pourquoi.
9. **Placement automatique depuis la zone** (« Placer », « Tout placer » ; étape P2-3). *Recommandation* : `placer` avec les placements actuels comme fixes (sa signature le prévoit déjà) : rien d'autre ne bouge, le résultat est prévisible. Un article qui ne trouve pas de place reste dans la zone, avec un message.
10. **Positions proposées par « Choisir une place »** (04h ; étape P2-3). *Recommandation* : les points candidats du placeur (coins des articles posés et des parois), dans l'orientation actuelle de l'article, gardés seulement si le validateur les accepte et si un ordre de chargement existe.
11. **Modifier une position dans le tableau des placements** (cahier technique, section 6 : « On peut y modifier une position par formulaire »). *Recommandation* : reporter après le prototype 2 ; le clavier et le clic sur une destination suffisent comme alternative au glisser-déposer.

## Critères d'acceptation

Le prototype 2 est accepté quand :

- [ ] Un article peut être déplacé à la main dans les vues, à la souris, au doigt et au clavier, ainsi que d'un clic sur une destination proposée (cahier fonctionnel, section 8).
- [ ] Tout déplacement interdit est bloqué : l'article reprend sa place et un message clair, annoncé aux lecteurs d'écran, cite la règle enfreinte (RG-08, RG-09). Sur « couloirs », sont refusés au moins : A12 posé sur A11 (fragile, capture 04f), un chevauchement, une sortie de la caisse, une fenêtre debout sans calage (RG-19), un article de C1 placé derrière un article de C3 dans sa bande (RG-07).
- [ ] Un déplacement qui ne laisse aucun ordre de chargement possible est refusé avec un message (RG-08).
- [ ] La rotation ne propose que les orientations autorisées, et une orientation qui enfreint une règle est refusée avec un message.
- [ ] Un article retiré rejoint la zone « Articles à placer » ; il peut être remis à la main, ou par « Placer » et « Tout placer ».
- [ ] L'aimantation est activée par défaut, se désactive et se réactive, et le choix survit au rechargement de la page. Au clavier, avec l'aimantation active, l'article s'arrête au contact.
- [ ] Au clavier, le pas est de 50 mm, et de 500 mm avec Maj.
- [ ] Un déplacement accepté est enregistré aussitôt : il est encore là après rechargement de la page, et la version est marquée « ajustée à la main ».
- [ ] « Annuler le dernier déplacement » fonctionne par le bouton et par Ctrl + Z, et l'annulation est enregistrée.
- [ ] Après chaque déplacement, l'ordre de chargement est recalculé : ce qui porte est chargé avant ce qui est posé dessus, et RG-07 est respectée. Sur « couloirs », l'ordre de référence est reconnu comme réalisable.
- [ ] Le bandeau de calage et l'indicateur d'équilibre se mettent à jour à chaque déplacement (RG-19, RG-20).
- [ ] « Relancer le calcul » crée une nouvelle version ; sur un plan ajusté, une confirmation prévient que les ajustements seront perdus (RG-22) ; l'ancienne version reste consultable.
- [ ] Les raccourcis se modifient dans le panneau, une touche déjà prise est refusée tout de suite avec un message sous le raccourci (RG-21, capture 04i), et le choix survit au rechargement.
- [ ] axe-core ne trouve aucune erreur sur la page du plan en cours d'ajustement, et tout l'ajustement est possible au clavier seul.
- [ ] Chaque RG du tableau ci-dessus a au moins un test qui porte son numéro.
- [ ] Le porteur sait expliquer `ordonnerChargement` et le contrôle d'un déplacement, du geste jusqu'à l'enregistrement.

## Avancement

Le suivi détaillé, étape par étape, est dans `docs/sessions-claude-code.md` (étapes P2-1 à P2-8). Quand tous les critères sont cochés : étiquette `v0.2.0` sur `main`.
