// Préférences de l'appareil (cahier technique 5.2 et 5.6) : lues et écrites
// dans le stockage local, avec une valeur par défaut si rien n'est lu.
import { describe, expect, it } from 'vitest'
import { RACCOURCIS_PAR_DEFAUT } from '@/domaine/validation'
import {
  CLE_AIMANTATION,
  CLE_RACCOURCIS,
  enregistrerAimantation,
  enregistrerRaccourcis,
  lireAimantation,
  lireRaccourcis,
  type Stockage,
} from './preferences'

/** Un stockage en mémoire, comme `localStorage`. */
function stockage(
  initial: Record<string, string> = {},
): Stockage & { contenu: Map<string, string> } {
  const contenu = new Map(Object.entries(initial))
  return {
    contenu,
    getItem: (cle) => contenu.get(cle) ?? null,
    setItem: (cle, valeur) => void contenu.set(cle, valeur),
  }
}

/** Un stockage refusé, comme en navigation privée ou avec les cookies bloqués. */
const indisponible: Stockage = {
  getItem: () => {
    throw new DOMException('Accès refusé', 'SecurityError')
  },
  setItem: () => {
    throw new DOMException('Quota dépassé', 'QuotaExceededError')
  },
}

describe('aimantation', () => {
  it('est activée par défaut, quand rien n’est enregistré', () => {
    expect(lireAimantation(stockage())).toBe(true)
  })

  it('survit au rechargement : le choix enregistré est relu', () => {
    const s = stockage()
    enregistrerAimantation(false, s)
    expect(s.contenu.get(CLE_AIMANTATION)).toBe('non')
    expect(lireAimantation(s)).toBe(false)
    enregistrerAimantation(true, s)
    expect(lireAimantation(s)).toBe(true)
  })

  it('reste activée si le stockage est indisponible, sans lever d’erreur', () => {
    expect(lireAimantation(indisponible)).toBe(true)
    expect(() => enregistrerAimantation(false, indisponible)).not.toThrow()
  })
})

describe('raccourcis', () => {
  it('sont ceux par défaut quand rien n’est enregistré', () => {
    expect(lireRaccourcis(stockage())).toEqual(RACCOURCIS_PAR_DEFAUT)
  })

  it('survivent au rechargement, y compris un raccourci désactivé', () => {
    const s = stockage()
    const choisis = { ...RACCOURCIS_PAR_DEFAUT, changerOrientation: 'o', aimantation: null }
    enregistrerRaccourcis(choisis, s)
    expect(lireRaccourcis(s)).toEqual(choisis)
  })

  it('complètent une action absente par sa touche par défaut et ignorent une action inconnue', () => {
    const s = stockage({
      [CLE_RACCOURCIS]: JSON.stringify({ retirer: 'Backspace', tournerDe90: 't' }),
    })
    expect(lireRaccourcis(s)).toEqual({ ...RACCOURCIS_PAR_DEFAUT, retirer: 'Backspace' })
  })

  it('remplacent une valeur illisible par la touche par défaut', () => {
    const s = stockage({ [CLE_RACCOURCIS]: JSON.stringify({ retirer: 46, aimantation: '' }) })
    expect(lireRaccourcis(s)).toEqual(RACCOURCIS_PAR_DEFAUT)
  })

  it('reviennent aux raccourcis par défaut si le contenu n’est pas du JSON', () => {
    expect(lireRaccourcis(stockage({ [CLE_RACCOURCIS]: '{pas du json' }))).toEqual(
      RACCOURCIS_PAR_DEFAUT,
    )
    expect(lireRaccourcis(stockage({ [CLE_RACCOURCIS]: '["r"]' }))).toEqual(RACCOURCIS_PAR_DEFAUT)
  })

  it('RG-21 : reviennent aux raccourcis par défaut si une touche relue sert à deux actions', () => {
    const s = stockage({ [CLE_RACCOURCIS]: JSON.stringify({ aimantation: 'r' }) })
    expect(lireRaccourcis(s)).toEqual(RACCOURCIS_PAR_DEFAUT)
  })

  it('RG-21 : reviennent aux raccourcis par défaut si une touche relue sert à naviguer', () => {
    const s = stockage({ [CLE_RACCOURCIS]: JSON.stringify({ retirer: 'Escape' }) })
    expect(lireRaccourcis(s)).toEqual(RACCOURCIS_PAR_DEFAUT)
  })

  it('sont ceux par défaut si le stockage est indisponible, sans lever d’erreur', () => {
    expect(lireRaccourcis(indisponible)).toEqual(RACCOURCIS_PAR_DEFAUT)
    expect(() => enregistrerRaccourcis(RACCOURCIS_PAR_DEFAUT, indisponible)).not.toThrow()
  })

  it('rendent une copie : la modifier ne change pas les raccourcis par défaut', () => {
    const lus = lireRaccourcis(stockage())
    lus.retirer = 'x'
    expect(RACCOURCIS_PAR_DEFAUT.retirer).toBe('Delete')
  })
})

describe('stockage par défaut', () => {
  it('utilise le stockage local du navigateur quand aucun n’est donné', () => {
    localStorage.clear()
    enregistrerAimantation(false)
    expect(localStorage.getItem(CLE_AIMANTATION)).toBe('non')
    expect(lireAimantation()).toBe(false)
    localStorage.clear()
  })
})
