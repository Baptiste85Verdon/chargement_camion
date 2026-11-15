// Formulaire de la fiche camion (captures 09b et 09e) : passage entre le
// modèle enregistré et ce que l'utilisateur tape, comme `saisie-article.ts`.
import type { ModeleCamion, Tournee } from './modele'
import { lireMillimetres, type SaisieCamion } from './validation'

/** Un modèle à enregistrer : sans `id` pour une création. */
export type CamionAEnregistrer = Omit<ModeleCamion, 'id'> & { id?: string }

export function formulaireVideCamion(): SaisieCamion {
  return { nom: '', longueur: '', largeur: '', hauteur: '' }
}

export function formulaireDepuisCamion(camion: ModeleCamion): SaisieCamion {
  return {
    nom: camion.nom,
    longueur: String(camion.longueur),
    largeur: String(camion.largeur),
    hauteur: String(camion.hauteur),
  }
}

function millimetres(texte: string): number {
  const valeur = lireMillimetres(texte)
  if (valeur === null) throw new Error(`Dimension non vérifiée : « ${texte} »`)
  return valeur
}

/**
 * Le modèle à enregistrer, à partir d'un formulaire sans erreur
 * (`validerCamion`). `origine` garde l'identifiant et la date d'archivage.
 */
export function camionDepuisFormulaire(
  f: SaisieCamion,
  origine?: ModeleCamion,
): CamionAEnregistrer {
  return {
    ...(origine ? { id: origine.id } : {}),
    nom: f.nom.trim(),
    longueur: millimetres(f.longueur),
    largeur: millimetres(f.largeur),
    hauteur: millimetres(f.hauteur),
    ...(origine?.archiveLe === undefined ? {} : { archiveLe: origine.archiveLe }),
  }
}

/**
 * Les tournées qui utilisent un modèle, séparées en deux (RG-21) : celles en
 * cours (en préparation, prêtes ou en chargement) empêchent de le supprimer
 * ou de l'archiver ; les tournées chargées empêchent seulement de le
 * supprimer.
 */
export function tourneesDuCamion(camionId: string, tournees: Tournee[]) {
  const siennes = tournees.filter((t) => t.modeleCamionId === camionId)
  return {
    enCours: siennes.filter((t) => t.statut !== 'chargee'),
    chargees: siennes.filter((t) => t.statut === 'chargee'),
  }
}
