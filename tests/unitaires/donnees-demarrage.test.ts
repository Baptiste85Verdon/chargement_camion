// Données de démarrage (RG-01) : supabase/seed.sql est relu ici, sans base de
// données, pour vérifier qu'il reste cohérent avec le domaine et avec le jeu
// d'essai « couloirs ».
import { describe, expect, it } from 'vitest'
import { FAMILLES } from '@/domaine/modele'
import type { CommandeAPlacer, Dimensions, Orientation } from '@/domaine/types'
import { preparerUnites } from '@/domaine/unites'
import { validerArticle } from '@/domaine/validation'
import { lireDonneesDemarrage, lireInsertions } from '@/donnees/demarrage'
import { chargerJeuEssai } from '../jeux-essai/charger'
// « ?raw » : Vite fournit le contenu du fichier sous forme de texte.
import sql from '../../supabase/seed.sql?raw'

const demarrage = lireDonneesDemarrage(sql)

/** Les commandes de la tournée T-2026-118 et leurs lignes, prêtes à placer. */
function commandesAPlacer(): CommandeAPlacer[] {
  const t118 = demarrage.tournees.find((t) => t.reference === 'T-2026-118')
  return demarrage.commandes
    .filter((commande) => commande.tourneeId === t118?.id)
    .map((commande) => ({
      id: commande.id,
      rangLivraison: commande.rangLivraison ?? 0,
      lignes: demarrage.lignes.filter((l) => l.commandeId === commande.id),
    }))
}

/** Signature d'une unité, pour comparer sans tenir compte des identifiants. */
const signature = (u: {
  commandeRang: number
  dims: Dimensions
  poids: number
  fragile: boolean
  orientations: Orientation[]
}) =>
  `C${u.commandeRang} ${u.dims.l}×${u.dims.w}×${u.dims.h} ${u.poids} kg ${u.fragile ? 'fragile' : ''} ${[...u.orientations].sort().join('/')}`

describe('données de démarrage (RG-01)', () => {
  const articles = demarrage.articles

  it('RG-01 : le catalogue compte 24 articles dans les 9 familles', () => {
    expect(articles).toHaveLength(24)
    expect(new Set(articles.map((a) => a.famille))).toEqual(new Set(FAMILLES))
  })

  it('RG-01 : chaque article de démarrage passe la vérification de saisie sans erreur', () => {
    const camions = [
      { longueur: 7200, largeur: 2400, hauteur: 2500 },
      { longueur: 6200, largeur: 2450, hauteur: 2400 },
      { longueur: 8500, largeur: 2450, hauteur: 2600 },
      { longueur: 4400, largeur: 2050, hauteur: 2200 },
    ]
    for (const article of articles) {
      const texte = (d?: Dimensions) => ({
        l: d ? String(d.l) : '',
        w: d ? String(d.w) : '',
        h: d ? String(d.h) : '',
      })
      const { erreurs, avertissements } = validerArticle(
        {
          id: article.id,
          reference: article.reference,
          nom: article.nom,
          famille: article.famille,
          dimsEmballees: texte(article.dimsEmballees),
          poids: String(article.poids).replace('.', ','),
          livrableNu: article.dimsNues !== undefined,
          dimsNues: texte(article.dimsNues),
          orientations: article.orientations,
        },
        { catalogue: articles, camions },
      )
      expect({ article: article.reference, erreurs, avertissements }).toEqual({
        article: article.reference,
        erreurs: [],
        avertissements: [],
      })
    }
  })

  it('RG-01 : la tournée T-2026-118 donne exactement les unités du jeu « couloirs »', () => {
    const unites = preparerUnites(commandesAPlacer(), articles)
    const attendues = chargerJeuEssai('couloirs').unites
    expect(unites.map(signature).sort()).toEqual(attendues.map(signature).sort())
  })
})

describe('lecture de seed.sql pour les dépôts en mémoire', () => {
  it('lit les 4 camions, la tournée T-2026-118, ses 4 commandes et leurs 7 lignes', () => {
    expect(demarrage.camions.map((c) => c.nom)).toEqual([
      'Porteur 7,2 m',
      'Porteur 6,2 m',
      'Porteur 8,5 m',
      'Fourgon 20 m³',
    ])
    expect(demarrage.tournees).toEqual([
      expect.objectContaining({
        reference: 'T-2026-118',
        date: '2026-11-05',
        statut: 'enPreparation',
      }),
      expect.objectContaining({ reference: 'T-2026-117', statut: 'chargee' }),
    ])
    const t118 = demarrage.tournees[0]?.id
    const siennes = demarrage.commandes.filter((c) => c.tourneeId === t118)
    expect(siennes.map((c) => c.rangLivraison)).toEqual([1, 2, 3, 4])
    const ids = new Set(siennes.map((c) => c.id))
    expect(demarrage.lignes.filter((l) => ids.has(l.commandeId))).toHaveLength(7)
  })

  it('garde virgules et apostrophes dans les textes', () => {
    const noms = demarrage.articles.map((a) => a.nom)
    expect(noms).toContain('Bastaing sapin 63 × 175, 4 m')
    expect(noms).toContain("Raccord d'étanchéité Velux 78 × 98")
  })

  it('lit les tableaux, null et les booléens', () => {
    const lignes = lireInsertions(`
      insert into public.t (a, b, c, d) values
        -- un commentaire (avec parenthèses)
        ('x, y', null, true, array['a_plat', 'debout']),
        ('l''eau', 12.5, false, array['debout'])
      on conflict (a) do nothing;`)
    expect(lignes.t).toEqual([
      { a: 'x, y', b: null, c: true, d: ['a_plat', 'debout'] },
      { a: "l'eau", b: 12.5, c: false, d: ['debout'] },
    ])
  })

  it('refuse un n-uplet qui n’a pas autant de valeurs que de colonnes', () => {
    expect(() =>
      lireInsertions(`insert into public.t (a, b) values ('x') on conflict do nothing;`),
    ).toThrow(/1 valeurs pour 2 colonnes/)
  })
})

describe('données de démarrage : liste d’attente (RG-11)', () => {
  it('RG-11 : une commande entière de T-2026-117 attend, reportée pour dépassement', () => {
    const [element] = demarrage.attente
    expect(demarrage.attente).toHaveLength(1)
    const commande = demarrage.commandes.find((c) => c.id === element?.commandeId)
    const origine = demarrage.tournees.find((t) => t.id === element?.tourneeOrigineId)
    expect(commande).toMatchObject({ destination: 'Couverture Bernard', tourneeId: null })
    expect(origine?.reference).toBe('T-2026-117')
    expect(element).toMatchObject({ ligneCommandeId: null, rangOrigine: 5, motif: 'depassement' })
  })
})
