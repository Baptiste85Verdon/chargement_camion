// Message d'un ajustement refusé (RG-08, RG-09 ; capture 04f ; cahier
// technique 5.2, étape 5, et 5.7).
//
// Le domaine dit quelles règles le changement enfreindrait (`RegleEnfreinte`) ;
// ici, on en fait le bandeau que lit l'opérateur :
// - un titre court : « Déplacement refusé : article fragile » ;
// - les règles citées, venues du domaine (`reglesCitees`) : « RG-04 · RG-08 » ;
// - une explication qui nomme les articles : « « Carton de quincaillerie »
//   (A12, C2) reposerait sur « Fenêtre PVC 2 vantaux » (A11, C2)… » ;
// - pour un retrait, les articles qui perdraient leur appui ou leur calage.
//
// Seule la première règle enfreinte est expliquée : le domaine la met en tête
// (celles de l'article changé d'abord). Un message court se lit mieux qu'une
// liste, et l'opérateur verra la suivante s'il corrige la première.
import { reglesCitees } from '@/domaine/ajustement'
import type { RegleEnfreinte } from '@/domaine/types'
import { textes } from '@/textes/fr'

/** Ce qu'il faut d'un article pour le citer : « « Nom » (A12, C2) ». */
export interface ArticleCite {
  nom: string
  repere: string
  /** Numéro de la commande : 2 pour C2. */
  code: number
}

/** Le changement refusé : il donne le titre et la fin du message. */
export type GenreAjustement = 'deplacement' | 'orientation' | 'remise' | 'retrait'

export interface MessageRefus {
  titre: string
  /** « RG-04 · RG-08 » */
  regles: string
  texte: string
}

const t = textes.plan.ajustement

/**
 * Le message d'un ajustement refusé. `citer` donne de quoi nommer chaque
 * article ; un article inconnu est cité par son identifiant, pour ne jamais
 * rendre un message vide.
 */
export function messageRefus(
  enfreintes: readonly RegleEnfreinte[],
  genre: GenreAjustement,
  citer: (uniteId: string) => ArticleCite | undefined,
): MessageRefus {
  const premiere = enfreintes[0]
  if (!premiere) throw new Error('Un refus cite au moins une règle')
  const nommer = (uniteId: string | undefined) => {
    if (uniteId === undefined) return ''
    const a = citer(uniteId)
    return a ? t.citer(a.nom, a.repere, `C${a.code}`) : uniteId
  }
  const refus = t.refus[premiere.motif]
  const titres: Record<GenreAjustement, (raison: string) => string> = {
    deplacement: t.titreDeplacement,
    orientation: t.titreOrientation,
    remise: t.titreRemise,
    retrait: t.titreRetrait,
  }

  let texte: string
  if (genre === 'retrait' && premiere.autreUniteId !== undefined) {
    // L'article en cause est `uniteId` ; l'article retiré, `autreUniteId`.
    const retire = nommer(premiere.autreUniteId)
    const article = nommer(premiere.uniteId)
    texte =
      premiere.motif === 'deboutNonCale'
        ? t.retrait.deboutNonCale(retire, article)
        : t.retrait.appuiInsuffisant(retire, article)
  } else {
    texte = refus.explication(nommer(premiere.uniteId), nommer(premiere.autreUniteId))
    // L'article déplacé ou tourné revient à sa place (RG-08) ; un article de
    // la zone y reste.
    if (genre === 'deplacement' || genre === 'orientation') texte += ` ${t.reprendSaPlace}`
  }

  return {
    titre: titres[genre](refus.raison),
    regles: reglesCitees(premiere).join(' · '),
    texte,
  }
}
