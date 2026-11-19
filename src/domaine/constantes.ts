// Seuils de l'algorithme de placement (cahier technique, 4.2 et section 10).
// Valeurs provisoires, à confirmer avec un professionnel.

/**
 * Écart maximal, en millimètres, entre deux faces pour les considérer
 * en contact (contact avec une paroi, calage).
 */
export const TOLERANCE_CONTACT = 20

/**
 * Part minimale de sa base qu'un article posé au-dessus du plancher doit
 * avoir en appui sur d'autres articles (règle 4 du validateur).
 */
export const SEUIL_APPUI = 0.6

/**
 * Règle 10 du validateur (RG-04) : un article de plus de `POIDS_LOURD` kg
 * n'a pas sa base à plus de `HAUTEUR_MAX_LOURD` mm du plancher. Une grosse
 * masse en hauteur déstabilise le camion. Valeurs provisoires (section 10).
 */
export const POIDS_LOURD = 500
export const HAUTEUR_MAX_LOURD = 1000

/**
 * Part minimale d'une grande face d'un article debout qui doit être couverte
 * par les articles contre lesquels il s'appuie (RG-19).
 */
export const SEUIL_CALAGE = 0.5

/**
 * Placeur (cahier technique, 4.3) : deux positions dont la compacité diffère
 * de moins de cet écart, en millimètres, sont départagées par le calage.
 */
export const ECART_COMPACITE = 100

/**
 * `optimiser` (cahier technique, 4.4) : deux unités de même rang sont de
 * « poids proche » quand la plus légère pèse au moins 90 % de la plus lourde.
 * Valeur provisoire (cahier technique, section 10).
 */
export const ECART_POIDS_PROCHE = 0.1

/**
 * `optimiser` (4.4) : deux unités sont de même encombrement quand chacune de
 * leurs dimensions, une fois posées, diffère d'au plus cet écart en mm.
 */
export const ECART_ENCOMBREMENT_ECHANGE = 20

/**
 * `optimiser` (4.4) : nombre maximal d'échanges essayés. Valeur provisoire
 * (cahier technique, section 10).
 */
export const MAX_ESSAIS_ECHANGES = 500

/**
 * Rang de chargement d'un article remis depuis la zone « Articles à placer » :
 * il n'a pas encore d'ancien rang (cahier technique, 4.8). Les vrais rangs
 * commencent à 1 ; `ordonnerChargement` ne rend jamais `SANS_RANG`, qui ne
 * doit être ni enregistré ni affiché. Tester avec `aUnRang`.
 */
export const SANS_RANG = 0

/**
 * Part maximale d'un côté, en pourcentage arrondi, pour chaque statut
 * d'équilibre (RG-20, cahier technique 4.5) : « Équilibré » jusqu'à 55 %,
 * « À surveiller » jusqu'à 60 %, « Déséquilibré » au-delà.
 */
export const SEUILS_EQUILIBRE = { equilibre: 55, aSurveiller: 60 } as const

/**
 * Pas d'un déplacement au clavier, en millimètres (cahier technique 5.3) :
 * `PAS_CLAVIER` avec une flèche, `PAS_CLAVIER_GRAND` avec Maj + flèche.
 * Valeurs provisoires, décidées le 19 novembre 2026 (section 10).
 */
export const PAS_CLAVIER = 50
export const PAS_CLAVIER_GRAND = 500

/**
 * Distance d'aimantation, en pixels à l'écran (cahier technique 5.2, étape 4).
 * L'interface la convertit en millimètres selon le zoom ; les fonctions du
 * domaine reçoivent le seuil en millimètres. Valeur provisoire (section 10).
 */
export const SEUIL_AIMANTATION_PX = 10

/**
 * Nombre maximal de places proposées par « Choisir une place » (cahier
 * technique 5.3 ; décision 10 du prototype 2).
 */
export const MAX_PLACES_PROPOSEES = 5
