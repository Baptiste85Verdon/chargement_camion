// « Lancer le calcul » et « Relancer le calcul » (cahier technique 4.4, 5.7) :
// la préparation de la tournée et la page du plan font la même chose, ici.
//
// Ce n'est pas un store Pinia : une simple fonction asynchrone, qui relit ce
// dont le calcul a besoin (commandes, catalogue, liste d'attente), appelle le
// domaine, puis enregistre une nouvelle version du plan. Relire juste avant
// de calculer évite de travailler sur des commandes périmées.
import type { ModeleCamion, PlanChargement } from '@/domaine/modele'
import { calculerPlan, lignesReportees } from '@/domaine/tournee'
import type { Depots } from '@/donnees/depots'
import { textes } from '@/textes/fr'

export interface ResultatCalcul {
  plan: PlanChargement
  /** Message à annoncer : version, articles placés, et ceux en trop (RG-10). */
  annonce: string
}

export async function calculerEtEnregistrer(
  depots: Depots,
  tourneeId: string,
  camion: ModeleCamion,
): Promise<ResultatCalcul> {
  const [commandes, articles, attente] = await Promise.all([
    depots.commandes.listerParTournee(tourneeId),
    // Avec les archivés : une commande garde ses articles archivés (RG-21).
    depots.articles.lister({ avecArchives: true }),
    depots.attente.lister(),
  ])
  // Les lignes reportées en liste d'attente restent dans leur commande, mais
  // ne sont plus à charger (RG-11).
  const { placements, enTrop } = calculerPlan(commandes, articles, camion, lignesReportees(attente))
  const { plan } = await depots.plans.enregistrerVersion(tourneeId, placements)

  const rangs = new Map(commandes.map((c) => [c.commande.id, c.commande.rangLivraison]))
  const codes = [...new Set(enTrop.map((u) => rangs.get(u.commandeId) ?? 0))]
    .sort((a, b) => a - b)
    .map((rang) => `C${rang}`)
    .join(', ')
  const t = textes.preparation
  const annonce = [
    t.planCalcule(plan.version, placements.length),
    enTrop.length > 0 ? t.planEnTrop(enTrop.length, codes) : '',
  ]
    .filter(Boolean)
    .join(' ')
  return { plan, annonce }
}
