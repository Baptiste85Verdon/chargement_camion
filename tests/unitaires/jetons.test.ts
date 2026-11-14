import { describe, expect, it } from 'vitest'
import {
  aplatirJetons,
  genererCss,
  ratioContraste,
  type GroupeJetons,
} from '../../scripts/jetons.ts'
import fichierJetons from '../../src/styles/plan-de-chargement.tokens.json'

const jetons = fichierJetons as GroupeJetons

/** Valeur hexadécimale d'une couleur du fichier de jetons, par son nom. */
function couleur(nom: string): string {
  const jeton = aplatirJetons(jetons).find((j) => j.nom === nom)
  if (!jeton || jeton.type !== 'color') throw new Error(`Couleur inconnue : ${nom}`)
  return String(jeton.valeur)
}

describe('conversion des jetons en variables CSS', () => {
  it('produit une variable par couleur, au nom de la charte', () => {
    const css = genererCss(jetons)
    expect(css).toContain('--encre: #1B1F24;')
    expect(css).toContain('--cmd1-bord: #B03A64;')
  })

  it('produit les dimensions telles quelles', () => {
    const css = genererCss(jetons)
    expect(css).toContain('--rayon-carte: 8px;')
    expect(css).toContain('--espace-4: 16px;')
  })

  it('produit une propriété font raccourcie par typographie, avec repli', () => {
    const css = genererCss(jetons)
    expect(css).toContain('--typo-titre-page: 700 24px/1.2 "IBM Plex Sans", system-ui, sans-serif;')
    expect(css).toContain('--typo-titre-page-interlettrage: -0.01em;')
    expect(css).toContain('--typo-donnees: 400 13px/1.45 "IBM Plex Mono", ui-monospace, monospace;')
  })

  it("produit l'ombre unique au format box-shadow", () => {
    expect(genererCss(jetons)).toContain('--ombre-flottant: 0px 4px 12px 0px #1B1F2429;')
  })

  it('refuse deux jetons du même nom', () => {
    const doublon: GroupeJetons = {
      a: { x: { $type: 'color', $value: '#000000' } },
      b: { x: { $type: 'color', $value: '#FFFFFF' } },
    }
    expect(() => aplatirJetons(doublon)).toThrow('Jeton en double')
  })
})

describe('calcul du contraste', () => {
  it('donne 21:1 entre le noir et le blanc', () => {
    expect(ratioContraste('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
  })

  it('donne 1:1 entre deux couleurs identiques', () => {
    expect(ratioContraste('#7A828C', '#7A828C')).toBe(1)
  })
})

/*
 * WCAG 2.2 AA : 4,5:1 pour le texte (1.4.3), 3:1 pour un contour ou une icône
 * utile à la compréhension (1.4.11). Chaque paire vient de la description du
 * jeton dans le fichier, ou de la charte graphique.
 */
const TEXTE = 4.5
const CONTOUR = 3

const pairesTexte: [texte: string, fond: string][] = [
  ['encre', 'surface'],
  ['encre', 'fond-page'],
  ['texte-fort', 'surface'],
  ['texte-doux', 'surface'],
  ['texte-doux', 'fond-page'],
  ['texte-doux', 'attenue-fond'],
  ['cote', 'camion-fond'],
  ['action', 'surface'],
  ['action-fonce', 'info-fond'],
  ['surface', 'encre'],
  ['surface', 'encre-survol'],
  ['surface', 'encre-appui'],
  ['surface', 'erreur'],
  ['encre', 'statut-fond'],
  ['alerte-texte', 'surface'],
  ['erreur-texte', 'surface'],
  ['encre', 'cmd1-fond'],
  ['encre', 'cmd2-fond'],
  ['encre', 'cmd3-fond'],
  ['encre', 'cmd4-fond'],
  ['encre', 'cmd5-fond'],
  ['encre', 'cmd6-fond'],
]

const pairesContour: [contour: string, fond: string][] = [
  ['bordure-forte', 'surface'],
  ['camion-contour', 'camion-fond'],
  ['action', 'surface'],
  ['erreur', 'surface'],
  ['alerte-bordure', 'surface'],
  ['alerte-icone', 'surface'],
  ['attenue-bord', 'camion-fond'],
  ['cmd1-bord', 'surface'],
  ['cmd2-bord', 'surface'],
  ['cmd3-bord', 'surface'],
  ['cmd4-bord', 'surface'],
  ['cmd5-bord', 'surface'],
  ['cmd5-bord', 'camion-fond'],
  ['cmd6-bord', 'surface'],
]

describe('contrastes minimaux de la charte (WCAG 2.2 AA)', () => {
  it.each(pairesTexte)('texte %s sur %s : au moins 4,5:1', (texte, fond) => {
    expect(ratioContraste(couleur(texte), couleur(fond))).toBeGreaterThanOrEqual(TEXTE)
  })

  it.each(pairesContour)('contour %s sur %s : au moins 3:1', (contour, fond) => {
    expect(ratioContraste(couleur(contour), couleur(fond))).toBeGreaterThanOrEqual(CONTOUR)
  })
})
