// Données de démarrage (RG-01) : supabase/seed.sql est relu ici, sans base de
// données, pour vérifier qu'il reste cohérent avec le domaine et avec le jeu
// d'essai « couloirs ».
import { describe, expect, it } from 'vitest'
import { FAMILLES, type FicheArticle } from '@/domaine/modele'
import type { CommandeAPlacer, Dimensions, Orientation } from '@/domaine/types'
import { preparerUnites } from '@/domaine/unites'
import { validerArticle } from '@/domaine/validation'
import { chargerJeuEssai } from '../jeux-essai/charger'
// « ?raw » : Vite fournit le contenu du fichier sous forme de texte.
import sql from '../../supabase/seed.sql?raw'

const ORIENTATIONS: Record<string, Orientation> = {
  a_plat: 'aPlat',
  debout: 'debout',
  contre_paroi: 'contreParoi',
}

const nombreOuRien = (texte: string) => (texte === 'null' ? undefined : Number(texte))

/** Groupes capturés d'une correspondance, un texte vide pour un groupe absent. */
const groupes = (m: RegExpMatchArray): string[] => m.slice(1).map((g) => g ?? '')

/** Lit les lignes de l'insertion dans `article`. */
function lireArticles(): FicheArticle[] {
  const ligne =
    /\('(a0[0-9a-f-]+)', '([^']+)', '((?:[^']|'')+)', '([^']+)',\s*(\d+), (\d+), (\d+), (\w+), (\w+), (\w+), ([\d.]+), (true|false), array\[([^\]]+)\], '(\w+)', (true|false)\)/g
  return [...sql.matchAll(ligne)].map((m) => {
    const [
      id = '',
      reference = '',
      nom = '',
      famille = '',
      l = '',
      w = '',
      h = '',
      ln = '',
      wn = '',
      hn = '',
      poids = '',
      fragile = '',
      orientations = '',
      forme = '',
      porteur = '',
    ] = groupes(m)
    const longueurNue = nombreOuRien(ln)
    return {
      id,
      reference,
      nom: nom.replace(/''/g, "'"),
      famille: famille as FicheArticle['famille'],
      dimsEmballees: { l: Number(l), w: Number(w), h: Number(h) },
      dimsNues:
        longueurNue === undefined ? undefined : { l: longueurNue, w: Number(wn), h: Number(hn) },
      poids: Number(poids),
      fragile: fragile === 'true',
      orientations: orientations.split(',').map((o) => {
        const orientation = ORIENTATIONS[o.trim().replace(/'/g, '')]
        if (!orientation) throw new Error(`Orientation inconnue dans seed.sql : ${o}`)
        return orientation
      }),
      forme: forme as FicheArticle['forme'],
      porteur: porteur === 'true',
    }
  })
}

/** Lit les commandes de la tournée T-2026-118 et leurs lignes. */
function lireCommandes(): CommandeAPlacer[] {
  const commandes = [
    ...sql.matchAll(
      /\('(d0[0-9a-f-]+)', '(b0[0-9a-f-]+)',\s*'([^']+)', '([^']+)', (?:null|'[^']*'), (\d+)\)/g,
    ),
  ].map((m) => ({
    id: groupes(m)[0] ?? '',
    rangLivraison: Number(groupes(m)[4]),
    lignes: [] as CommandeAPlacer['lignes'],
  }))

  const lignes =
    /\('(e0[0-9a-f-]+)', '(d0[0-9a-f-]+)',\s*'(a0[0-9a-f-]+)', (\d+), (true|false), (\w+), (\w+), (\w+), (\w+), (true|false), (\d+)\)/g
  for (const m of sql.matchAll(lignes)) {
    const [id = '', commandeId, articleId = '', quantite, nu, l = '', w, h, poids = ''] = groupes(m)
    const longueur = nombreOuRien(l)
    const dimsPropres: Dimensions | undefined =
      longueur === undefined ? undefined : { l: longueur, w: Number(w), h: Number(h) }
    const commande = commandes.find((c) => c.id === commandeId)
    if (!commande) throw new Error(`Commande inconnue dans seed.sql : ${commandeId}`)
    commande.lignes.push({
      id,
      articleId,
      quantite: Number(quantite),
      nu: nu === 'true',
      dimsPropres,
      poidsPropre: nombreOuRien(poids),
    })
  }
  return commandes
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
  const articles = lireArticles()

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
    const unites = preparerUnites(lireCommandes(), articles)
    const attendues = chargerJeuEssai('couloirs').unites
    expect(unites.map(signature).sort()).toEqual(attendues.map(signature).sort())
  })
})
