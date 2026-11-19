// Préférences de l'appareil (cahier technique 5.2 et 5.6) : l'aimantation et
// les raccourcis clavier du plan. Elles sont propres à l'appareil, pas à la
// tournée : elles vivent dans le stockage local du navigateur, pas dans la
// base.
//
// Le stockage local peut manquer ou refuser l'accès (navigation privée,
// cookies bloqués, quota dépassé) : chaque lecture et chaque écriture est
// protégée par try/catch. Si rien n'est lu, ou si ce qui est lu n'a pas de
// sens, la valeur par défaut s'applique ; une écriture refusée ne vaut alors
// que pour la visite de la page.
import {
  ACTIONS_RACCOURCIS,
  RACCOURCIS_PAR_DEFAUT,
  validerRaccourcis,
  type Raccourcis,
} from '@/domaine/validation'

/** Ce dont les préférences ont besoin du stockage : `localStorage` en a plus. */
export type Stockage = Pick<Storage, 'getItem' | 'setItem'>

export const CLE_AIMANTATION = 'plan-de-chargement.aimantation'
export const CLE_RACCOURCIS = 'plan-de-chargement.raccourcis'

/**
 * Le stockage local du navigateur. Le simple accès à `localStorage` peut
 * lever une erreur : il se fait donc au moment de lire ou d'écrire, dans le
 * try/catch, jamais au chargement du module.
 */
const stockageLocal = (): Stockage => localStorage

function lire(cle: string, stockage?: Stockage): string | null {
  try {
    return (stockage ?? stockageLocal()).getItem(cle)
  } catch {
    return null
  }
}

function ecrire(cle: string, valeur: string, stockage?: Stockage): void {
  try {
    ;(stockage ?? stockageLocal()).setItem(cle, valeur)
  } catch {
    // Stockage indisponible : le choix ne vaut que pour la visite de la page.
  }
}

// --- Aimantation (5.2) ----------------------------------------------------------------

/** Activée par défaut ; seul un « non » enregistré la désactive. */
export function lireAimantation(stockage?: Stockage): boolean {
  return lire(CLE_AIMANTATION, stockage) !== 'non'
}

export function enregistrerAimantation(active: boolean, stockage?: Stockage): void {
  ecrire(CLE_AIMANTATION, active ? 'oui' : 'non', stockage)
}

// --- Raccourcis clavier (5.6, RG-21) -------------------------------------------------

/**
 * Les raccourcis enregistrés, complétés par ceux par défaut :
 * - une action absente ou à la valeur illisible reprend sa touche par défaut ;
 * - une action inconnue (d'une ancienne version de l'application) est ignorée ;
 * - si une touche sert à deux actions (RG-21), tous les raccourcis reviennent
 *   à ceux par défaut, plutôt que de laisser une touche déclencher deux choses.
 */
export function lireRaccourcis(stockage?: Stockage): Raccourcis {
  const parDefaut = (): Raccourcis => ({ ...RACCOURCIS_PAR_DEFAUT })
  const texte = lire(CLE_RACCOURCIS, stockage)
  if (texte === null) return parDefaut()

  let enregistres: unknown
  try {
    enregistres = JSON.parse(texte)
  } catch {
    return parDefaut()
  }
  if (typeof enregistres !== 'object' || enregistres === null || Array.isArray(enregistres)) {
    return parDefaut()
  }

  const lus = parDefaut()
  for (const action of ACTIONS_RACCOURCIS) {
    const valeur: unknown = (enregistres as Record<string, unknown>)[action]
    // Une touche est un texte non vide ; null veut dire « désactivé ».
    if (valeur === null || (typeof valeur === 'string' && valeur !== '')) lus[action] = valeur
  }
  return validerRaccourcis(lus).erreurs.length === 0 ? lus : parDefaut()
}

export function enregistrerRaccourcis(raccourcis: Raccourcis, stockage?: Stockage): void {
  ecrire(CLE_RACCOURCIS, JSON.stringify(raccourcis), stockage)
}
