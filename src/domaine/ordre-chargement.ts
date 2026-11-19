// Ordre de chargement après un ajustement manuel (cahier technique, 4.8).
// Après un déplacement à la main, l'ordre produit par le placeur peut ne plus
// être réalisable : on le recalcule à partir des seules positions.
//
// Trois temps :
// 1. contraintes : pour chaque paire d'articles, l'un doit-il précéder l'autre ?
// 2. tri topologique : on charge, tour à tour, un article dont tous les
//    prédécesseurs sont déjà chargés, en départageant par l'ancien ordre ;
// 3. impossible : si aucun article n'est libre alors qu'il en reste, les
//    contraintes forment un cycle et aucun ordre n'existe (RG-08).
import { SANS_RANG } from './constantes'
import { type Boite, boiteDe, estPoseSur, gene, trouverUnite } from './geometrie'
import type { Camion, Placement, Unite } from './types'

/** Le placement a-t-il un ancien rang ? Un article remis depuis la zone n'en a pas. */
export function aUnRang(p: Placement): boolean {
  return p.rang > SANS_RANG
}

/**
 * `a` doit-il être chargé avant `b` ?
 * - appui : si `b` repose sur `a`, ce qui porte est chargé avant ;
 * - accès (RG-07) : si `b` gênerait `a` au sens de la règle 7 du validateur,
 *   `a` doit être à sa place avant que `b` ne lui barre le passage.
 * La règle 7 compte déjà « posé sur » comme une gêne : l'appui est écrit à
 * part pour suivre le cahier, il ne change pas le résultat.
 */
function doitPreceder(a: Boite, b: Boite): boolean {
  return estPoseSur(b, a) || gene(b, a)
}

/**
 * Départage des articles libres (cahier technique 4.8, décision 3 du
 * prototype 2) : on garde l'ordre précédent autant que possible. Les articles
 * qui ont un ancien rang passent d'abord, par rang croissant ; ceux remis
 * depuis la zone ensuite, du fond vers les portes (x), puis du bas vers le
 * haut (z). L'identifiant ne sert qu'à rendre le résultat toujours le même.
 * Rend un nombre négatif si `a` passe avant `b`.
 */
function comparerLibres(a: Placement, b: Placement): number {
  if (aUnRang(a) !== aUnRang(b)) return aUnRang(a) ? -1 : 1
  if (aUnRang(a) && a.rang !== b.rang) return a.rang - b.rang
  if (a.x !== b.x) return a.x - b.x
  if (a.z !== b.z) return a.z - b.z
  return a.uniteId < b.uniteId ? -1 : a.uniteId > b.uniteId ? 1 : 0
}

/** Un article du graphe des contraintes « A avant B ». */
interface Noeud {
  placement: Placement
  boite: Boite
  /** Les articles qui doivent attendre celui-ci. */
  suivants: Noeud[]
  /** Combien d'articles doivent encore être chargés avant celui-ci. */
  enAttente: number
}

/**
 * Recalcule les rangs de chargement du `plan` à partir des seules positions.
 * Rend les placements dans l'ordre de chargement, rangs renumérotés 1, 2…,
 * ou `null` si aucun ordre n'est possible (RG-08). Le plan reçu n'est pas
 * modifié. `camion` n'est pas utilisé : il fait partie de la signature
 * commune des fonctions du domaine (cahier technique 4.7).
 */
export function ordonnerChargement(
  plan: Placement[],
  unites: Unite[],
  // Signature du cahier technique (4.7), gardée pour les appelants.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _camion: Camion,
): Placement[] | null {
  const noeuds: Noeud[] = plan.map((placement) => ({
    placement,
    boite: boiteDe(placement, trouverUnite(placement.uniteId, unites)),
    suivants: [],
    enAttente: 0,
  }))

  // 1. Contraintes : chaque paire d'articles, dans les deux sens.
  for (const a of noeuds) {
    for (const b of noeuds) {
      if (a !== b && doitPreceder(a.boite, b.boite)) {
        a.suivants.push(b)
        b.enAttente++
      }
    }
  }

  // 2. Tri topologique (algorithme de Kahn) : à chaque tour, on charge,
  //    parmi les articles libres, celui que le départage met en tête ; ceux
  //    qui l'attendaient perdent une attente, et sont libres à zéro.
  const libres = noeuds.filter((n) => n.enAttente === 0)
  const ordre: Placement[] = []
  let suivant = extraireLePremier(libres)
  while (suivant) {
    ordre.push({ ...suivant.placement, rang: ordre.length + 1 })
    for (const n of suivant.suivants) {
      n.enAttente--
      if (n.enAttente === 0) libres.push(n)
    }
    suivant = extraireLePremier(libres)
  }

  // 3. Des articles restent bloqués : ils s'attendent les uns les autres.
  return ordre.length === plan.length ? ordre : null
}

/** Retire de `libres` et rend l'article que le départage met en tête. */
function extraireLePremier(libres: Noeud[]): Noeud | undefined {
  libres.sort((a, b) => comparerLibres(a.placement, b.placement))
  return libres.shift()
}
