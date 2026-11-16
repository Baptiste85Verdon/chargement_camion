// Lecture des jeux d'essai JSON et conversion vers les types du domaine.
import { encombrement } from '@/domaine/encombrement'
import type { Camion, Dimensions, Orientation, Placement, Unite } from '@/domaine/types'
import couloirs from './couloirs.json'
import couloirsSansC4 from './couloirs-sans-c4.json'
import fenetresIsolees from './fenetres-isolees.json'

/** Résultats attendus d'un jeu d'essai (cahier technique, section 8). */
export interface AttenduJeuEssai {
  /** Placements refusés par le validateur : unité, numéro de règle, motif en clair. */
  reglesEnfreintes: { unite: string; regle: string; motif: string }[]
  /** Unités signalées par `diagnostiquerCalage`. */
  malCales: string[]
  /** Autres attendus (équilibre, bandeau…), lus par les étapes suivantes. */
  [cle: string]: unknown
}

/** Forme d'un fichier de jeu d'essai, telle qu'écrite dans le JSON. */
interface JeuEssaiJson {
  nom: string
  camion: { longueur: number; largeur: number; hauteur: number }
  commandes: { code: string; rangLivraison: number }[]
  unites: {
    id: string
    commande: string
    /** Encombrement de l'unité telle qu'elle est posée dans la caisse. */
    dims: Dimensions
    poids: number
    fragile: boolean
    porteur: boolean
    orientationsAutorisees: string[]
    orientation: string
    position: { x: number; y: number; z: number }
    rangChargement: number
  }[]
  attendu: AttenduJeuEssai
}

export interface JeuEssai {
  nom: string
  camion: Camion
  unites: Unite[]
  placements: Placement[]
  /** Code de commande (C1, C2…) de chaque unité, pour les messages. */
  commandeDe: Record<string, string>
  attendu: AttenduJeuEssai
}

const jeux = {
  couloirs: couloirs as JeuEssaiJson,
  'couloirs-sans-c4': couloirsSansC4 as JeuEssaiJson,
  'fenetres-isolees': fenetresIsolees as JeuEssaiJson,
}

export type NomJeuEssai = keyof typeof jeux

function enOrientation(texte: string): Orientation {
  if (texte === 'aPlat' || texte === 'debout' || texte === 'contreParoi') return texte
  throw new Error(`Orientation inconnue dans un jeu d'essai : ${texte}`)
}

export function chargerJeuEssai(nom: NomJeuEssai): JeuEssai {
  const json = jeux[nom]
  const rangDe = new Map(json.commandes.map((c) => [c.code, c.rangLivraison]))

  const unites: Unite[] = json.unites.map((u) => {
    const rang = rangDe.get(u.commande)
    if (rang === undefined) throw new Error(`Commande inconnue : ${u.commande}`)
    return {
      id: u.id,
      commandeRang: rang,
      // Le JSON donne l'encombrement posé ; le domaine attend la pose à plat.
      // Le quart de tour « debout » est son propre inverse : on l'applique
      // une seconde fois pour revenir aux dimensions du catalogue.
      dims: encombrement(u.dims, enOrientation(u.orientation)),
      poids: u.poids,
      fragile: u.fragile,
      porteur: u.porteur,
      orientations: u.orientationsAutorisees.map(enOrientation),
    }
  })

  const placements: Placement[] = json.unites.map((u) => ({
    uniteId: u.id,
    x: u.position.x,
    y: u.position.y,
    z: u.position.z,
    orientation: enOrientation(u.orientation),
    rang: u.rangChargement,
  }))

  return {
    nom: json.nom,
    camion: {
      longueur: json.camion.longueur,
      largeur: json.camion.largeur,
      hauteur: json.camion.hauteur,
    },
    unites,
    placements,
    commandeDe: Object.fromEntries(json.unites.map((u) => [u.id, u.commande])),
    attendu: json.attendu,
  }
}
