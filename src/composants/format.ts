// Mise en forme des nombres affichés : à la française, avec une espace fine
// insécable entre les milliers (« 1 500 ») et la virgule décimale (« 22,5 »).
// `Intl.NumberFormat` fait ce travail selon la langue ; on crée chaque
// formateur une seule fois, car sa création coûte plus que son usage.
import type { Camion, Dimensions } from '@/domaine/types'

const entier = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })
const uneDecimale = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/** « 1 500 » : des millimètres, sans unité. */
export const formaterMillimetres = (mm: number) => entier.format(mm)

/** « 1 500 × 1 350 × 180 » : longueur × largeur × hauteur, sans unité. */
export const formaterDimensions = (d: Dimensions) =>
  [d.l, d.w, d.h].map(formaterMillimetres).join(' × ')

/** « 22,5 kg » */
export const formaterPoids = (kg: number) => `${decimal.format(kg)} kg`

const jour = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' })

/** « 15/11/2026 », depuis une date ISO (date d'archivage). */
export const formaterDate = (iso: string) => jour.format(new Date(iso))

/** Volume utile d'une caisse : « 43,2 m³ ». 1 m³ = 10⁹ mm³. */
export const formaterVolume = (c: Camion) =>
  `${uneDecimale.format((c.longueur * c.largeur * c.hauteur) / 1e9)} m³`

const jourLong = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  // Une date AAAA-MM-JJ est lue à minuit UTC : on l'affiche en UTC, sinon
  // un fuseau à l'ouest de Greenwich afficherait la veille.
  timeZone: 'UTC',
})

/** « Jeudi 5 novembre 2026 », depuis une date AAAA-MM-JJ (date de livraison). */
export function formaterJour(date: string) {
  const texte = jourLong.format(new Date(`${date}T00:00:00Z`))
  return texte.charAt(0).toLocaleUpperCase('fr') + texte.slice(1)
}

/** Un volume en mètres cubes : « 10,4 m³ ». */
export const formaterMetresCubes = (m3: number) => `${uneDecimale.format(m3)} m³`

const pourcentage = new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 0 })

/** Une part : « 24 % », depuis 0,24. */
export const formaterPourcentage = (part: number) => pourcentage.format(part)

/** « En préparation », depuis « en préparation » : un libellé en début de case. */
export const premiereMajuscule = (texte: string) =>
  texte.charAt(0).toLocaleUpperCase('fr') + texte.slice(1)
