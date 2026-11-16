// Ce que l'interface affiche d'un article du plan, en plus de sa position :
// la page du plan le prépare une fois pour toutes les vues, le tableau et
// l'ordre de chargement.
import type { Forme } from '@/domaine/modele'

export interface InfoArticle {
  /** « A07 » : le repère de l'article, d'après son rang de chargement. */
  repere: string
  nom: string
  /** Numéro de la commande : 3 pour C3, son rang de livraison. */
  code: number
  /** Client ou destination de la commande. */
  destination: string
  forme: Forme
  fragile: boolean
  /** Rang de chargement : l'étape où l'article est chargé. */
  etape: number
  /** Signalé par `diagnostiquerCalage` (RG-19, 5.16) : triangle sur le bloc. */
  malCale: boolean
}
