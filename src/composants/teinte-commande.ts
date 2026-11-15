/**
 * Teinte d'une commande (charte graphique, « Commandes »).
 *
 * Six teintes pleines pour C1 à C6, les mêmes avec un fond hachuré pour C7 à C12,
 * puis on recommence. Comme on avance d'une teinte à chaque commande, deux
 * commandes qui se suivent n'ont jamais la même teinte.
 */
export interface TeinteCommande {
  /** Numéro de la teinte, de 1 à 6 : variables --cmdN-fond et --cmdN-bord. */
  teinte: number
  /** Vrai pour la deuxième série de six (C7 à C12, C19 à C24…). */
  hachure: boolean
}

export const NOMBRE_TEINTES = 6

export function teinteCommande(numero: number): TeinteCommande {
  if (!Number.isInteger(numero) || numero < 1) {
    throw new RangeError(`Numéro de commande invalide : ${numero}`)
  }
  const rang = numero - 1 // 0 pour C1
  return {
    teinte: (rang % NOMBRE_TEINTES) + 1,
    hachure: Math.floor(rang / NOMBRE_TEINTES) % 2 === 1,
  }
}
