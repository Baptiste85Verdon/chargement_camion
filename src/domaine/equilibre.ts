// Mesure de l'équilibre de la charge (RG-20, cahier technique 4.5).
// Le centre de gravité se calcule à partir du poids et du centre de chaque
// unité ; la part portée par chaque côté s'en déduit.
import { SEUILS_EQUILIBRE } from './constantes'
import { boiteDe, trouverUnite } from './geometrie'
import type { Camion, Placement, Unite } from './types'

export type StatutEquilibre = 'equilibre' | 'aSurveiller' | 'desequilibre'

/** L'équilibre à un moment de la tournée. */
export interface EtapeEquilibre {
  /** Rang de la dernière commande livrée ; `null` au départ. */
  apres: number | null
  /** Part du poids portée par le côté gauche, entre 0 et 1. */
  partGauche: number
  /** Centre de gravité : distance au fond (x) et à la paroi gauche (y), en mm. */
  cgX: number
  cgY: number
}

export interface MesureEquilibre {
  etapes: EtapeEquilibre[]
  statut: StatutEquilibre
}

/** Une unité réduite à ce qui compte pour l'équilibre. */
interface Masse {
  rang: number
  poids: number
  centreX: number
  centreY: number
}

/**
 * Parts gauche et droite telles qu'elles sont affichées : en pourcentages
 * entiers dont la somme fait 100. Le statut se juge sur ces valeurs.
 */
export function pourcentagesAffiches(partGauche: number): [number, number] {
  const gauche = Math.round(partGauche * 100)
  return [gauche, 100 - gauche]
}

/** Statut d'une étape, d'après le côté le plus chargé une fois arrondi. */
function statutDe(partGauche: number): StatutEquilibre {
  const plusFort = Math.max(...pourcentagesAffiches(partGauche))
  if (plusFort <= SEUILS_EQUILIBRE.equilibre) return 'equilibre'
  if (plusFort <= SEUILS_EQUILIBRE.aSurveiller) return 'aSurveiller'
  return 'desequilibre'
}

const GRAVITE: Record<StatutEquilibre, number> = { equilibre: 0, aSurveiller: 1, desequilibre: 2 }

/** Centre de gravité d'un ensemble de masses non vide. */
function etape(apres: number | null, masses: Masse[], camion: Camion): EtapeEquilibre {
  const total = masses.reduce((s, m) => s + m.poids, 0)
  const cgX = masses.reduce((s, m) => s + m.poids * m.centreX, 0) / total
  const cgY = masses.reduce((s, m) => s + m.poids * m.centreY, 0) / total
  // y part de la paroi gauche : plus le centre est près de 0, plus la gauche porte.
  return { apres, partGauche: (camion.largeur - cgY) / camion.largeur, cgX, cgY }
}

/**
 * Mesure l'équilibre au départ, puis après chaque livraison, en retirant les
 * unités des commandes déjà livrées. Une étape sans aucun poids (après la
 * dernière livraison) n'est pas mesurée. Le statut est celui du pire moment.
 */
export function mesurerEquilibre(
  plan: Placement[],
  unites: Unite[],
  camion: Camion,
): MesureEquilibre {
  const masses: Masse[] = plan.map((p) => {
    const unite = trouverUnite(p.uniteId, unites)
    const b = boiteDe(p, unite)
    return {
      rang: unite.commandeRang,
      poids: unite.poids,
      centreX: (b.x0 + b.x1) / 2,
      centreY: (b.y0 + b.y1) / 2,
    }
  })

  const rangs = [...new Set(masses.map((m) => m.rang))].sort((a, b) => a - b)
  const etapes: EtapeEquilibre[] = []
  for (const apres of [null, ...rangs]) {
    const restantes = masses.filter((m) => apres === null || m.rang > apres)
    if (restantes.some((m) => m.poids > 0)) etapes.push(etape(apres, restantes, camion))
  }

  const statut = etapes
    .map((e) => statutDe(e.partGauche))
    .reduce<StatutEquilibre>((pire, s) => (GRAVITE[s] > GRAVITE[pire] ? s : pire), 'equilibre')
  return { etapes, statut }
}
