// Ce que montre une vue du plan (cahier technique, 5.8 à 5.10) : filtre de
// profondeur, vue par étape et silhouettes, articles cachés, description
// d'une étape. Jeu d'essai « couloirs » : les articles A01 à A12 sont
// chargés dans l'ordre de leur numéro.
import { describe, expect, it } from 'vitest'
import { chargerJeuEssai } from '../../tests/jeux-essai/charger'
import {
  composerVue,
  dansTranche,
  decrireEtape,
  profondeurVue,
  recouvrants,
  repereArticle,
} from './contenu-vue'

const jeu = chargerJeuEssai('couloirs')
const { camion, placements: plan, unites } = jeu

const ids = (liste: { uniteId: string }[]) => liste.map((b) => b.uniteId).sort()

describe('repereArticle', () => {
  it('numérote un article par son rang de chargement, sur deux chiffres au moins', () => {
    expect(repereArticle(7)).toBe('A07')
    expect(repereArticle(12)).toBe('A12')
    expect(repereArticle(123)).toBe('A123')
  })
})

describe('profondeurVue', () => {
  it('mesure la caisse dans l’axe du regard de chaque vue', () => {
    expect(profondeurVue(camion, 'dessus')).toBe(2500)
    expect(profondeurVue(camion, 'gauche')).toBe(2400)
    expect(profondeurVue(camion, 'droite')).toBe(2400)
    expect(profondeurVue(camion, 'avant')).toBe(7200)
    expect(profondeurVue(camion, 'arriere')).toBe(7200)
  })
})

describe('dansTranche', () => {
  it('garde un article dont une partie au moins est dans la tranche', () => {
    expect(dansTranche({ proche: 900, loin: 1900 }, { debut: 0, fin: 1000 })).toBe(true)
    expect(dansTranche({ proche: 0, loin: 2400 }, { debut: 1000, fin: 1200 })).toBe(true)
  })

  it('écarte un article qui ne fait que toucher la tranche', () => {
    expect(dansTranche({ proche: 1000, loin: 2200 }, { debut: 0, fin: 1000 })).toBe(false)
    expect(dansTranche({ proche: 0, loin: 1000 }, { debut: 1000, fin: 2400 })).toBe(false)
  })
})

describe('composerVue : plan complet', () => {
  it('dessine tous les articles, et signale ceux qui sont entièrement cachés', () => {
    const vue = composerVue(plan, unites, camion, 'gauche')
    expect(vue.blocs).toHaveLength(12)
    expect(vue.blocs.every((b) => b.etat === 'normal')).toBe(true)
    // Écart connu de la capture 04 : A02 dépasse de A01, il reste visible.
    expect(vue.caches).toEqual(['A04', 'A05', 'A10', 'A12'])
    expect(vue.masquesParFiltre).toBe(0)
  })

  it('rend les cachés dans l’ordre de chargement', () => {
    expect(composerVue(plan, unites, camion, 'droite').caches).toEqual([
      'A01',
      'A04',
      'A05',
      'A06',
      'A07',
      'A11',
      'A12',
    ])
  })
})

describe('composerVue : filtre de profondeur (5.10)', () => {
  it('ne montre que les articles de la tranche, et compte les autres', () => {
    // Côté gauche, premier mètre depuis la paroi gauche.
    const vue = composerVue(plan, unites, camion, 'gauche', { tranche: { debut: 0, fin: 1000 } })
    expect(ids(vue.blocs)).toEqual(['A01', 'A03', 'A06', 'A07'])
    expect(vue.masquesParFiltre).toBe(8)
  })

  it('ne compte pas comme cachés les articles masqués par le filtre', () => {
    const vue = composerVue(plan, unites, camion, 'gauche', {
      tranche: { debut: 1000, fin: 2400 },
    })
    // A04, A05 et A12 ne sont plus derrière A03, A06 et A07, masqués par le
    // filtre. A10 reste derrière A11, fenêtre de même taille, dans la tranche.
    expect(vue.caches).toEqual(['A10'])
  })
})

describe('composerVue : vue par étape (5.9)', () => {
  it('montre les articles chargés et celui de l’étape, sans les suivants', () => {
    const vue = composerVue(plan, unites, camion, 'gauche', { etape: 7 })
    expect(ids(vue.blocs)).toEqual(['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07'])
    expect(vue.blocs.find((b) => b.uniteId === 'A07')?.etat).toBe('enCours')
    expect(vue.blocs.find((b) => b.uniteId === 'A06')?.etat).toBe('normal')
    expect(vue.caches).toEqual(['A04', 'A05'])
  })

  it('montre les étapes suivantes en silhouette, dessinées en premier', () => {
    const vue = composerVue(plan, unites, camion, 'dessus', { etape: 7, silhouettes: true })
    expect(vue.blocs).toHaveLength(12)
    const silhouettes = vue.blocs.filter((b) => b.etat === 'silhouette')
    expect(ids(silhouettes)).toEqual(['A08', 'A09', 'A10', 'A11', 'A12'])
    expect(vue.blocs.slice(0, 5).every((b) => b.etat === 'silhouette')).toBe(true)
  })

  it('ne compte jamais une silhouette comme cachée, et elle ne cache rien', () => {
    // Plan complet, vue de dessus : A04, A06 et A08 sont cachés.
    const vue = composerVue(plan, unites, camion, 'dessus', { etape: 7, silhouettes: true })
    expect(vue.caches).toEqual(['A04', 'A06'])
  })

  it('à l’étape 0, le camion est vide', () => {
    expect(composerVue(plan, unites, camion, 'dessus', { etape: 0 }).blocs).toEqual([])
  })

  it('le filtre de profondeur masque aussi les silhouettes hors tranche', () => {
    const vue = composerVue(plan, unites, camion, 'gauche', {
      etape: 7,
      silhouettes: true,
      tranche: { debut: 0, fin: 1000 },
    })
    expect(ids(vue.blocs)).toEqual(['A01', 'A03', 'A06', 'A07'])
    expect(vue.masquesParFiltre).toBe(8)
  })
})

describe('recouvrants (5.10, survol)', () => {
  it('liste les articles dessinés devant un article et qui le recouvrent en partie', () => {
    const { blocs } = composerVue(plan, unites, camion, 'gauche')
    expect(recouvrants('A02', blocs)).toEqual(['A01'])
    expect(recouvrants('A01', blocs)).toEqual([])
  })

  it('ignore les silhouettes', () => {
    const { blocs } = composerVue(plan, unites, camion, 'dessus', { etape: 7, silhouettes: true })
    // A09, posée sur A08, est devant lui en vue de dessus ; mais toutes deux
    // sont des silhouettes à l'étape 7.
    expect(recouvrants('A08', blocs)).toEqual([])
    expect(recouvrants('A04', blocs)).toEqual(['A05'])
  })
})

describe('decrireEtape (5.9, description en texte)', () => {
  const etape = (id: string) => {
    const p = plan.find((x) => x.uniteId === id)
    if (!p) throw new Error(id)
    return decrireEtape(p, plan, unites, camion)
  }

  it('dit la pose, la distance au fond, la paroi et l’article porteur', () => {
    expect(etape('A07')).toEqual({
      orientation: 'aPlat',
      distanceFond: 2400,
      paroi: 'gauche',
      poseSur: ['A06'],
    })
  })

  it('un article posé au plancher, loin des parois', () => {
    expect(etape('A10')).toEqual({
      orientation: 'debout',
      distanceFond: 3700,
      paroi: null,
      poseSur: [],
    })
  })

  it('un article contre la paroi droite', () => {
    expect(etape('A08').paroi).toBe('droite')
  })
})
