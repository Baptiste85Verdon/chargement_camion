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

Les écarts de la maquette propres à ce prototype (pas de 100 mm, « Relancer la simulation », article retiré grisé dans l'ordre, Ctrl + Z absent du panneau, « Tourner de 90° », nombre de places proposées) sont listés dans cette section du README.

## Décisions sur les points ouverts

Les cahiers ne tranchaient pas ces questions. Le porteur les a tranchées le 19 novembre 2026, en suivant les recommandations de la préparation avec quelques précisions ; elles sont reportées dans les cahiers. L'étape concernée est indiquée.

1. **Rotation** (étape P2-2). La maquette propose « Tourner de 90° », un quart de tour à plat qui échangerait longueur et largeur ; le modèle ne le permet pas, la longueur restant toujours selon x (cahier technique 4.7). **Décision** : au prototype 2, la rotation passe à l'orientation autorisée suivante (à plat, debout, contre une paroi), par le bouton « Changer d'orientation » et la touche R. Le quart de tour à plat est un **point ouvert important** (une palette ne peut pas être posée en travers aujourd'hui) : à reprendre après la V1, ou plus tôt si un jeu d'essai le montre.
2. **Hauteur d'un article déplacé** (étapes P2-2 et P2-6). **Décision** : en vue de dessus, l'article se pose au plus bas, sur le dessus le plus haut de ce qui se trouve sous son emprise, par un simple calcul, sans simulation physique. Dans les vues de côté, avant et arrière, la coordonnée qui n'est pas montrée est gardée.
3. **Départage de l'ordre de chargement** (étape P2-1). **Décision** : garder l'ordre précédent autant que possible (tri topologique qui suit l'ancien rang), pour qu'un petit déplacement change peu l'ordre affiché. Un article remis depuis la zone prend la place que lui donne sa position, du fond vers les portes, puis du bas vers le haut.
4. **Annulation** (étape P2-5). **Décision** : plusieurs niveaux, gardés en mémoire pendant la visite de la page ; la pile est vidée au rechargement et à chaque nouvelle version. Elle couvre déplacement, rotation, retrait, remise et placement automatique. Chaque annulation est enregistrée aussitôt, comme un déplacement. Pas de « Rétablir » au prototype 2. Ctrl + Z est un raccourci fixe (combinaison standard, pas une touche seule) : il figure dans le panneau des raccourcis avec la mention « Fixe », comme les flèches.
5. **Confirmation de relance** (étape P2-5). **Décision** : la confirmation ne s'ouvre que si la version actuelle est ajustée à la main ; sinon le calcul se relance sans fenêtre, puisque rien n'est perdu. Le bouton est de ton neutre (« Relancer le calcul ») : la version ajustée reste consultable, aucune donnée n'est supprimée. Le texte le dit, par exemple : « Le nouveau calcul ne reprendra pas vos ajustements. La version 3, ajustée à la main, restera consultable. » La même confirmation précède le report d'une commande entière, qui relance le calcul.
6. **Anciennes versions** (étape P2-7). **Décision** : un sélecteur de version sur la page du plan. Une ancienne version s'affiche en lecture seule (pas d'ajustement, pas de passage en mode quai), avec un bandeau « Version 2 du 18 novembre, lecture seule » et un bouton « Revenir à la version actuelle ». Pas de restauration d'une ancienne version au prototype 2.
7. **Distance d'aimantation** (étape P2-3). **Décision** : un seuil en pixels écran, 10 px à titre provisoire, converti en millimètres selon le zoom par l'interface ; la fonction du domaine reçoit le seuil en millimètres.
8. **Plans ajustables** (étape P2-5). **Décision** : seule la version actuelle d'une tournée « en préparation » s'ajuste, et pas quand le plan est « à recalculer » (il a été calculé pour une autre caisse). Sinon les commandes d'ajustement sont absentes, et un texte dit pourquoi.
9. **Placement automatique depuis la zone** (« Placer », « Tout placer » ; étape P2-3). **Décision** (révisée le 19 novembre 2026, à la relecture de l'étape P2-3) : chaque article est posé sur la première des places proposées par « Choisir une place » (décision 10), pour que ce qu'on voit en tête soit ce que fait « Placer » ; rien d'autre ne bouge. « Tout placer » prend les articles de la zone dans l'ordre du placeur. Un article de la zone reprend l'orientation qu'il avait avant son retrait, sinon la première autorisée ; on peut la changer dans la zone (bouton « Changer d'orientation » et touche R) avant de le placer. Un article qui ne trouve pas de place reste dans la zone « Articles à placer », avec un message. La première décision, `placer` avec les placements actuels comme fixes, est abandonnée : `placer` n'essaie pas le point contre la paroi opposée, si bien que « Placer » pouvait poser l'article ailleurs que sur la première place proposée. Reporté au cahier technique (5.7, V3.18).
10. **Places proposées par « Choisir une place »** (capture 04h ; étape P2-3). **Décision** : les points candidats du placeur (coins des articles posés et des parois), dans l'orientation actuelle de l'article, gardés seulement si le validateur les accepte et si un ordre de chargement existe. Au plus les **5 meilleures places** sont proposées, classées par le score du placeur (cahier technique 4.3, étape 4).
11. **Modifier une position dans le tableau des placements** (cahier technique, section 6). **Décision** : reporté après le prototype 2, noté en point ouvert. Le clavier et le clic sur une place proposée suffisent comme alternative au glisser-déposer.
12. **Retrait d'un article qui en porte ou en cale d'autres** (étapes P2-2 et P2-5, décision du 19 novembre 2026). **Décision** : le retrait est contrôlé comme un déplacement. S'il laisse un article sans appui ou un article debout sans calage, il est refusé (RG-08), avec un message qui nomme les articles en cause et la raison, par exemple « A04 porte A05 : retirez d'abord A05 » ou « Sans A10, la fenêtre A11 n'est plus calée ». Le message propose un bouton « Retirer aussi A05 » (ou la liste des articles concernés), qui retire ces articles avec l'article demandé, en une seule action annulable par Ctrl + Z. Reporté au cahier technique (5.7, V3.17).

## Critères d'acceptation

Le prototype 2 est accepté quand :

- [ ] Un article peut être déplacé à la main dans les vues, à la souris, au doigt et au clavier, ainsi que d'un clic sur une des 5 meilleures places proposées (cahier fonctionnel, section 8). En vue de dessus, l'article déplacé se pose au plus bas.
- [ ] Tout déplacement interdit est bloqué : l'article reprend sa place et un message clair, annoncé aux lecteurs d'écran, cite la règle enfreinte (RG-08, RG-09). Sur « couloirs », sont refusés au moins : A12 posé sur A11 (fragile, capture 04f), un chevauchement, une sortie de la caisse, une fenêtre debout sans calage (RG-19), un article de C1 placé derrière un article de C3 dans sa bande (RG-07).
- [ ] Un déplacement qui ne laisse aucun ordre de chargement possible est refusé avec un message (RG-08).
- [ ] « Changer d'orientation » (bouton et touche R) ne passe que par les orientations autorisées, et une orientation qui enfreint une règle est refusée avec un message.
- [ ] Un article retiré rejoint la zone « Articles à placer » ; il peut être remis à la main, ou par « Placer » et « Tout placer », sans que les autres articles bougent. Un article sans place reste dans la zone, avec un message. Un retrait qui laisserait un article sans appui ou sans calage est refusé, avec un message qui nomme les articles en cause et propose de les retirer aussi, en une seule action annulable.
- [ ] L'aimantation est activée par défaut, se désactive et se réactive, et le choix survit au rechargement de la page. Au clavier, avec l'aimantation active, l'article s'arrête au contact.
- [ ] Au clavier, le pas est de 50 mm, et de 500 mm avec Maj.
- [ ] Un déplacement accepté est enregistré aussitôt : il est encore là après rechargement de la page, et la version est marquée « ajustée à la main ».
- [ ] « Annuler le dernier déplacement » fonctionne par le bouton et par Ctrl + Z, sur plusieurs niveaux pendant la visite de la page, et chaque annulation est enregistrée.
- [ ] Seule la version actuelle d'une tournée en préparation, non « à recalculer », s'ajuste ; sinon la page dit pourquoi.
- [ ] Après chaque déplacement, l'ordre de chargement est recalculé : ce qui porte est chargé avant ce qui est posé dessus, et RG-07 est respectée. Sur « couloirs », l'ordre de référence est reconnu comme réalisable.
- [ ] Le bandeau de calage et l'indicateur d'équilibre se mettent à jour à chaque déplacement (RG-19, RG-20).
- [ ] « Relancer le calcul » crée une nouvelle version ; sur un plan ajusté, et seulement dans ce cas, une confirmation de ton neutre prévient que les ajustements seront perdus (RG-22) ; l'ancienne version reste consultable en lecture seule depuis le sélecteur de version.
- [ ] Les raccourcis se modifient dans le panneau, une touche déjà prise est refusée tout de suite avec un message sous le raccourci (RG-21, capture 04i), et le choix survit au rechargement. Les flèches et Ctrl + Z y figurent avec la mention « Fixe ».
- [ ] axe-core ne trouve aucune erreur sur la page du plan en cours d'ajustement, et tout l'ajustement est possible au clavier seul.
- [ ] Chaque RG du tableau ci-dessus a au moins un test qui porte son numéro.
- [ ] Le porteur sait expliquer `ordonnerChargement` et le contrôle d'un déplacement, du geste jusqu'à l'enregistrement.

## Avancement

Le suivi détaillé, étape par étape, est dans `docs/sessions-claude-code.md` (étapes P2-1 à P2-8). Quand tous les critères sont cochés : étiquette `v0.2.0` sur `main`.
