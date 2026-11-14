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
