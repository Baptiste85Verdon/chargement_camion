import { describe, expect, it } from 'vitest'
import { libellesTraverses, ordonneeLibre } from '@/composants/evitement'

// Article sélectionné de y = 0 à y = 1 000 ; la cote va du fond (x = 0) à
// sa face côté fond (x = 1 200). Le voisin A02 occupe la même bande : son
// libellé est au centre, de y = 400 à y = 600.
const A02 = { x: 500, y: 400, largeur: 200, hauteur: 200 }

describe('ordonneeLibre : hauteur d’une cote qui évite les libellés', () => {
  it('garde le milieu quand rien ne gêne', () => {
    expect(ordonneeLibre({ x0: 0, x1: 1200, haut: 0, bas: 1000 }, [], 50)).toBe(500)
  })

  it('ignore un libellé hors de la longueur de la cote', () => {
    const loin = { ...A02, x: 2000 }
    expect(ordonneeLibre({ x0: 0, x1: 1200, haut: 0, bas: 1000 }, [loin], 50)).toBe(500)
  })

  it('passe au-dessus ou au-dessous du libellé, au plus près du milieu', () => {
    // Interdit : 350 à 650 (libellé ± demi-épaisseur 50). Au plus près : 350.
    expect(ordonneeLibre({ x0: 0, x1: 1200, haut: 0, bas: 1000 }, [A02], 50)).toBe(350)
  })

  it('reste dans la hauteur de l’article', () => {
    const bas = { x: 500, y: 0, largeur: 200, hauteur: 300 }
    // Interdit : -50 à 350. Libre : 350 et plus, le milieu (500) l’est déjà.
    expect(ordonneeLibre({ x0: 0, x1: 1200, haut: 0, bas: 1000 }, [bas], 50)).toBe(500)
    const haut = { x: 500, y: 0, largeur: 200, hauteur: 1000 }
    // Interdit : -50 à 1 050 ; plage permise : 50 à 950. Aucune place.
    expect(ordonneeLibre({ x0: 0, x1: 1200, haut: 0, bas: 1000 }, [haut], 50)).toBeNull()
  })

  it('évite plusieurs libellés à la fois', () => {
    const autre = { x: 900, y: 250, largeur: 200, hauteur: 100 }
    // Interdits : 350-650 et 200-400. 350 tombe dans le second : 650 est libre.
    expect(ordonneeLibre({ x0: 0, x1: 1200, haut: 0, bas: 1000 }, [A02, autre], 50)).toBe(650)
  })
})

describe('libellesTraverses', () => {
  it('rend les libellés que la cote traverse, et eux seuls', () => {
    const libelles = [
      { id: 'A02', boite: A02 },
      { id: 'A09', boite: { ...A02, y: 800 } },
      { id: 'A10', boite: { ...A02, x: 3000 } },
    ]
    expect(libellesTraverses({ x0: 0, x1: 1200, y: 500 }, libelles, 50)).toEqual(['A02'])
  })
})
