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
 * Part maximale d'un côté, en pourcentage arrondi, pour chaque statut
 * d'équilibre (RG-20, cahier technique 4.5) : « Équilibré » jusqu'à 55 %,
 * « À surveiller » jusqu'à 60 %, « Déséquilibré » au-delà.
 */
export const SEUILS_EQUILIBRE = { equilibre: 55, aSurveiller: 60 } as const
