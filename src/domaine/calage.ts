// Calage des articles (RG-19, cahier technique 4.2, règle 8).
// - Un article debout doit s'appuyer, sur une de ses grandes faces, contre une
//   paroi ou contre des articles qui couvrent au moins SEUIL_CALAGE de cette
//   face ; et son groupe d'articles debout doit être ancré (voir plus bas).
//   Sinon le placement est refusé.
// - Les autres articles doivent toucher quelque chose côté fond et d'au moins
//   un côté en largeur. Sinon ils sont seulement signalés « mal calés ».
import { SEUIL_CALAGE, TOLERANCE_CONTACT } from './constantes'
import { type Boite, boiteDe, surfaceCommuneXZ, surfaceCommuneYZ, trouverUnite } from './geometrie'
import type { Camion, Orientation, Placement, Unite } from './types'

/** Un article placé : son unité, sa pose et la boîte qu'il occupe. */
export interface Occupation {
  unite: Unite
  orientation: Orientation
  boite: Boite
}

export function occupationDe(p: Placement, unites: Unite[]): Occupation {
  const unite = trouverUnite(p.uniteId, unites)
  return { unite, orientation: p.orientation, boite: boiteDe(p, unite) }
}

/** « Debout » et « contre une paroi » sont deux poses debout (voir `encombrement`). */
export function estDebout(o: Occupation): boolean {
  return o.orientation !== 'aPlat'
}

/** Les deux côtés en largeur : la grande face d'un article debout est tournée vers eux. */
type Cote = 'gauche' | 'droite'
const COTES: Cote[] = ['gauche', 'droite']

function toucheLaParoi(b: Boite, cote: Cote, camion: Camion): boolean {
  return cote === 'gauche' ? b.y0 <= TOLERANCE_CONTACT : camion.largeur - b.y1 <= TOLERANCE_CONTACT
}

/**
 * Surface de la face `cote` de `b` couverte par `autre` : nulle si `autre`
 * n'est pas de ce côté à `TOLERANCE_CONTACT` près.
 */
function surfaceContreLaFace(b: Boite, cote: Cote, autre: Boite): number {
  const ecart = cote === 'gauche' ? b.y0 - autre.y1 : autre.y0 - b.y1
  if (ecart < 0 || ecart > TOLERANCE_CONTACT) return 0
  return surfaceCommuneXZ(b, autre)
}

/**
 * La face `cote` de `o` s'appuie contre la paroi, ou contre des articles de
 * `appuis` qui en couvrent au moins `SEUIL_CALAGE`.
 */
function faceAppuyee(o: Occupation, cote: Cote, appuis: Occupation[], camion: Camion): boolean {
  if (toucheLaParoi(o.boite, cote, camion)) return true
  const b = o.boite
  const face = (b.x1 - b.x0) * (b.z1 - b.z0)
  const couverte = appuis.reduce((s, a) => s + surfaceContreLaFace(b, cote, a.boite), 0)
  return couverte >= SEUIL_CALAGE * face
}

/** Deux articles debout se touchent par une grande face : ils sont du même groupe. */
function seTouchentEnLargeur(a: Occupation, b: Occupation): boolean {
  return COTES.some((cote) => surfaceContreLaFace(a.boite, cote, b.boite) > 0)
}

/**
 * Le groupe de `cible` : les articles debout en contact avec elle, de proche
 * en proche (parcours en largeur d'un graphe dont les arêtes sont les contacts).
 */
function groupeDe(cible: Occupation, toutes: Occupation[]): Occupation[] {
  const debout = toutes.filter(estDebout)
  const groupe = [cible]
  for (let i = 0; i < groupe.length; i++) {
    const courant = groupe[i] as Occupation
    for (const o of debout) {
      if (!groupe.includes(o) && seTouchentEnLargeur(courant, o)) groupe.push(o)
    }
  }
  return groupe
}

/**
 * RG-19 pour un article debout : il est appuyé sur une face (contre une paroi
 * ou n'importe quels articles), et au moins un article de son groupe est
 * appuyé contre une paroi ou contre des articles qui ne sont pas debout.
 * Deux fenêtres face à face s'appuient l'une sur l'autre, mais leur groupe
 * ne tient à rien : elles sont refusées.
 */
export function estDeboutCale(cible: Occupation, toutes: Occupation[], camion: Camion): boolean {
  const autres = toutes.filter((o) => o !== cible)
  const appuyee = COTES.some((cote) => faceAppuyee(cible, cote, autres, camion))
  if (!appuyee) return false

  const nonDebout = toutes.filter((o) => !estDebout(o))
  return groupeDe(cible, toutes).some((membre) =>
    COTES.some((cote) => faceAppuyee(membre, cote, nonDebout, camion)),
  )
}

/** Un article qui n'est pas debout touche une paroi ou un article côté fond. */
function toucheCoteFond(b: Boite, autres: Occupation[]): boolean {
  if (b.x0 <= TOLERANCE_CONTACT) return true
  return autres.some((a) => {
    const ecart = b.x0 - a.boite.x1
    return ecart >= 0 && ecart <= TOLERANCE_CONTACT && surfaceCommuneYZ(b, a.boite) > 0
  })
}

/** … et d'au moins un côté en largeur. Le côté portes peut rester libre. */
function toucheEnLargeur(b: Boite, autres: Occupation[], camion: Camion): boolean {
  return COTES.some(
    (cote) =>
      toucheLaParoi(b, cote, camion) ||
      autres.some((a) => surfaceContreLaFace(b, cote, a.boite) > 0),
  )
}

/**
 * Liste les unités mal calées du plan, dans l'ordre du plan : les articles
 * debout qui enfreignent RG-19 et les autres articles sans contact côté fond
 * ou sans contact en largeur. C'est un avertissement, jamais un refus.
 */
export function diagnostiquerCalage(plan: Placement[], unites: Unite[], camion: Camion): string[] {
  const toutes = plan.map((p) => occupationDe(p, unites))
  return toutes
    .filter((o) => {
      if (estDebout(o)) return !estDeboutCale(o, toutes, camion)
      const autres = toutes.filter((a) => a !== o)
      return !toucheCoteFond(o.boite, autres) || !toucheEnLargeur(o.boite, autres, camion)
    })
    .map((o) => o.unite.id)
}
