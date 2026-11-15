// Données de démarrage (RG-01) pour les dépôts en mémoire.
//
// `supabase/seed.sql` reste la seule source de la base d'exemple : ce module
// relit ses INSERT et les convertit avec les mêmes fonctions que les dépôts
// Supabase (`supabase-lignes.ts`). Les dépôts en mémoire démarrent ainsi avec
// exactement les données qu'aurait une base Supabase neuve. C'est ce
// qu'utilisent les tests de bout en bout, qui ne doivent jamais écrire dans
// la vraie base.
//
// Le lecteur ne comprend que le sous-ensemble de SQL qu'emploie seed.sql :
// `insert into public.<table> (<colonnes>) values (…), (…) on conflict …`,
// avec des textes entre apostrophes, des nombres, null, true, false et
// `array[…]`.
import type { ContenuInitial } from './memoire'
import {
  articleDepuisLigne,
  camionDepuisLigne,
  commandeDepuisLigne,
  elementAttenteDepuisLigne,
  ligneCommandeDepuisLigne,
  tourneeDepuisLigne,
  type LigneArticle,
  type LigneCamion,
  type LigneCommandeBase,
  type LigneElementAttente,
  type LigneLigneCommande,
  type LigneTournee,
} from './supabase-lignes'

/** Une valeur SQL lue : texte, nombre, booléen, null ou tableau. */
type ValeurSql = string | number | boolean | null | ValeurSql[]

/** Une ligne d'INSERT : colonne → valeur. */
type LigneSql = Record<string, ValeurSql>

/**
 * Lit les valeurs d'un bloc `values (…), (…)` : un tableau par n-uplet.
 * Lecture caractère par caractère, pour que les virgules et parenthèses
 * écrites dans un texte (« Bastaing sapin 63 × 175, 4 m ») ne comptent pas.
 */
function lireNUplets(texte: string): ValeurSql[][] {
  let i = 0
  const espaces = () => {
    while (i < texte.length && /\s/.test(texte.charAt(i))) i++
  }

  function lireValeur(): ValeurSql {
    espaces()
    if (texte.charAt(i) === "'") {
      // Texte : '' à l'intérieur vaut une apostrophe.
      let valeur = ''
      i++
      while (i < texte.length) {
        if (texte.charAt(i) === "'" && texte.charAt(i + 1) === "'") {
          valeur += "'"
          i += 2
        } else if (texte.charAt(i) === "'") {
          i++
          return valeur
        } else {
          valeur += texte.charAt(i++)
        }
      }
      throw new Error('seed.sql : texte non terminé')
    }
    if (texte.startsWith('array[', i)) {
      i += 'array['.length
      const valeurs: ValeurSql[] = []
      espaces()
      while (texte.charAt(i) !== ']') {
        valeurs.push(lireValeur())
        espaces()
        if (texte.charAt(i) === ',') i++
        espaces()
      }
      i++
      return valeurs
    }
    const mot = /^[\w.-]+/.exec(texte.slice(i))?.[0]
    if (!mot) throw new Error(`seed.sql : valeur illisible près de « ${texte.slice(i, i + 20)} »`)
    i += mot.length
    if (mot === 'null') return null
    if (mot === 'true' || mot === 'false') return mot === 'true'
    const nombre = Number(mot)
    if (Number.isNaN(nombre)) throw new Error(`seed.sql : valeur inconnue « ${mot} »`)
    return nombre
  }

  const nUplets: ValeurSql[][] = []
  espaces()
  while (texte.charAt(i) === '(') {
    i++
    const valeurs: ValeurSql[] = []
    for (;;) {
      valeurs.push(lireValeur())
      espaces()
      const separateur = texte.charAt(i++)
      if (separateur === ')') break
      if (separateur !== ',') throw new Error('seed.sql : virgule ou parenthèse attendue')
    }
    nUplets.push(valeurs)
    espaces()
    if (texte.charAt(i) === ',') i++
    espaces()
  }
  return nUplets
}

/** Toutes les lignes insérées, par table. */
export function lireInsertions(sql: string): Record<string, LigneSql[]> {
  // Les commentaires « -- … » peuvent contenir des parenthèses : on les retire.
  const sansCommentaires = sql.replace(/--[^\n]*/g, '')
  const tables: Record<string, LigneSql[]> = {}
  const insertion = /insert into public\.(\w+)\s*\(([^)]*)\)\s*values([\s\S]*?)on conflict/g
  for (const [, table = '', colonnes = '', valeurs = ''] of sansCommentaires.matchAll(insertion)) {
    const noms = colonnes.split(',').map((c) => c.trim())
    const lignes = lireNUplets(valeurs).map((nUplet) => {
      if (nUplet.length !== noms.length) {
        throw new Error(`seed.sql : ${nUplet.length} valeurs pour ${noms.length} colonnes`)
      }
      return Object.fromEntries(noms.map((nom, k) => [nom, nUplet[k] ?? null]))
    })
    tables[table] = [...(tables[table] ?? []), ...lignes]
  }
  return tables
}

/**
 * Le contenu de seed.sql, converti en objets métier. Les colonnes que le
 * script laisse à leur valeur par défaut (`archive_le`) valent null.
 */
export function lireDonneesDemarrage(sql: string): Required<ContenuInitial> {
  const tables = lireInsertions(sql)
  // Les lignes lues ont les noms de colonnes de la base : on les présente
  // aux conversions comme des lignes renvoyées par Supabase.
  const lignes = <L>(table: string) =>
    (tables[table] ?? []).map((ligne) => ({ archive_le: null, ...ligne }) as L)
  return {
    camions: lignes<LigneCamion>('modele_camion').map(camionDepuisLigne),
    articles: lignes<LigneArticle>('article').map(articleDepuisLigne),
    tournees: lignes<LigneTournee>('tournee').map(tourneeDepuisLigne),
    commandes: lignes<LigneCommandeBase>('commande').map(commandeDepuisLigne),
    lignes: lignes<LigneLigneCommande>('ligne_commande').map(ligneCommandeDepuisLigne),
    attente: lignes<LigneElementAttente>('element_attente').map(elementAttenteDepuisLigne),
  }
}
