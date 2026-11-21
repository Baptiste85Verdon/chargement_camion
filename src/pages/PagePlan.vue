<script setup lang="ts">
/**
 * Plan de chargement d'une tournée (captures 04 à 04e ; cahier fonctionnel
 * 4.4 ; cahier technique 5).
 *
 * La page lit le dernier plan enregistré et le montre :
 * - une barre d'affichage : plan complet ou par étape (5.9), légende des
 *   commandes qui en met une en évidence (5.12) ;
 * - les bandeaux : articles mal calés (RG-19, 5.16), dépassement (RG-10) ;
 * - deux cadres de vue, Dessus et Gauche par défaut (5.8), le centre de
 *   gravité sur la vue de dessus (5.17) ;
 * - le tableau des placements, alternative textuelle des vues ;
 * - à droite : la zone « Articles à placer » (5.7), l'équilibre de la charge
 *   (RG-20, 5.17), l'article sélectionné et l'ordre de chargement.
 *
 * Tout se déduit des placements : le rang de chargement donne le repère
 * (A07), l'étape et l'ordre. La sélection, la commande mise en évidence et
 * l'étape valent pour toute la page.
 *
 * Les articles en trop, ou toute leur commande, se reportent en liste
 * d'attente (RG-11). « Relancer le calcul » enregistre une nouvelle version.
 *
 * Ajustement manuel (prototype 2 ; cahier technique 5.3, 5.5, 5.7 et 5.18) :
 * chaque changement proposé (flèches, orientation, retrait, place choisie,
 * « Placer ») passe par le domaine (`deplacer`, `changerOrientation`,
 * `retirer`, `remettre`, `placerDepuisZone`). Accepté, il est enregistré
 * aussitôt (`ajuster`) et empilé pour « Annuler le dernier déplacement » ;
 * refusé, un bandeau dit pourquoi et l'article reprend sa place (RG-08, RG-09).
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { avancer, flecheVersPas, pasClavier } from '@/domaine/aimantation'
import {
  changerOrientation,
  deplacer,
  orientationSuivante,
  type Pose,
  poserAuPlusBas,
  remettre,
  retirer,
} from '@/domaine/ajustement'
import { diagnostiquerCalage } from '@/domaine/calage'
import { decrireEtape, repereArticle } from '@/domaine/contenu-vue'
import { encombrement } from '@/domaine/encombrement'
import { mesurerEquilibre, type MesureEquilibre } from '@/domaine/equilibre'
import type { FicheArticle, ModeleCamion, PlanChargement, Tournee } from '@/domaine/modele'
import { placerDepuisZone, proposerPlaces } from '@/domaine/places'
import { type Vue, vuesOuVisible } from '@/domaine/projection'
import { dispositionAjustee, lignesReportees, lirePlan, regrouperParLigne } from '@/domaine/tournee'
import type { Orientation, Placement, RegleEnfreinte } from '@/domaine/types'
import type { CommandeAvecLignes, PlanAvecPlacements } from '@/donnees/depots'
import { ErreurDonnees } from '@/donnees/erreurs'
import { enregistrerAimantation, lireAimantation, lireRaccourcis } from '@/donnees/preferences'
import { useAnnonces } from '@/stores/annonces'
import { useAttente } from '@/stores/attente'
import { calculerEtEnregistrer } from '@/stores/calcul'
import { utiliserDepots } from '@/stores/depots'
import { useHistorique } from '@/stores/historique'
import { textes } from '@/textes/fr'
import Annonce from '@/composants/Annonce.vue'
import Badge from '@/composants/Badge.vue'
import Bandeau from '@/composants/Bandeau.vue'
import Bouton from '@/composants/Bouton.vue'
import CadreVue from '@/composants/CadreVue.vue'
import Carte from '@/composants/Carte.vue'
import CarteEquilibre from '@/composants/CarteEquilibre.vue'
import CaseACocher from '@/composants/CaseACocher.vue'
import CodeCommande from '@/composants/CodeCommande.vue'
import ConfirmationDialog from '@/composants/ConfirmationDialog.vue'
import EntetePage from '@/composants/EntetePage.vue'
import Icone from '@/composants/Icone.vue'
import Interrupteur from '@/composants/Interrupteur.vue'
import LienBouton from '@/composants/LienBouton.vue'
import Selecteur from '@/composants/Selecteur.vue'
import {
  formaterDate,
  formaterDimensions,
  formaterJour,
  formaterMillimetres,
  formaterPoids,
  premiereMajuscule,
} from '@/composants/format'
import type { InfoArticle } from '@/composants/info-article'
import { type GenreAjustement, type MessageRefus, messageRefus } from '@/composants/refus'

const props = defineProps<{ id: string }>()

const t = textes.plan
const depots = utiliserDepots()
const annonces = useAnnonces()
const attente = useAttente()

// --- Données ------------------------------------------------------------------

const chargement = ref(true)
const erreurChargement = ref('')
const tournee = ref<Tournee | null>(null)
const camion = ref<ModeleCamion | null>(null)
const articles = ref<FicheArticle[]>([])
const commandes = ref<CommandeAvecLignes[]>([])
const enregistre = ref<PlanAvecPlacements | null>(null)
/** Lignes reportées en liste d'attente, restées dans leur commande (RG-11). */
const reportees = ref<Set<string>>(new Set())
const annonce = ref('')
/** Message de la zone `aria-live` de la page. */
const message = ref('')

/** Relit la tournée et son dernier plan : au chargement, après un report ou un calcul. */
async function charger() {
  const [tr, catalogue, cmds, plan, elements] = await Promise.all([
    depots.tournees.obtenir(props.id),
    // Avec les archivés : un plan garde ses articles archivés (RG-21).
    depots.articles.lister({ avecArchives: true }),
    depots.commandes.listerParTournee(props.id),
    depots.plans.obtenirDernier(props.id),
    depots.attente.lister(),
  ])
  if (!tr) {
    erreurChargement.value = t.introuvable
    return
  }
  tournee.value = tr
  articles.value = catalogue
  commandes.value = cmds
  enregistre.value = plan
  reportees.value = lignesReportees(elements)
  camion.value = tr.modeleCamionId ? await depots.camions.obtenir(tr.modeleCamionId) : null
}

onMounted(async () => {
  try {
    await charger()
    annonce.value = annonces.reprendre()
    // Ce que les bandeaux signalent est aussi annoncé (5.16, RG-10).
    message.value = [texteCalage.value, texteDepassement.value].filter(Boolean).join(' ')
  } catch (e) {
    erreurChargement.value = e instanceof ErreurDonnees ? e.message : textes.donnees.reseau
  } finally {
    chargement.value = false
  }
})

const versionPlan = computed<PlanChargement | null>(() => enregistre.value?.plan ?? null)

/** Unités de la tournée et placements, dans l'ordre de chargement. */
const lecture = computed(() =>
  enregistre.value
    ? lirePlan(commandes.value, articles.value, enregistre.value.placements, reportees.value)
    : { unites: [], placements: [], aPlacer: [] },
)
const placements = computed(() => lecture.value.placements)
const unites = computed(() => lecture.value.unites)

/** Articles mal calés (RG-19, 5.16), dans l'ordre du plan. */
const malCales = computed(() =>
  camion.value ? diagnostiquerCalage(placements.value, unites.value, camion.value) : [],
)

/** Équilibre au départ puis après chaque livraison (RG-20, 4.5). */
const mesure = computed<MesureEquilibre>(() =>
  camion.value
    ? mesurerEquilibre(placements.value, unites.value, camion.value)
    : { etapes: [], statut: 'equilibre' },
)
const centreGravite = computed(() => {
  const depart = mesure.value.etapes[0]
  return depart ? { x: depart.cgX, y: depart.cgY } : null
})

/** Code de la commande (3 pour C3) de chaque commande de la tournée. */
const codeCommande = computed(
  () => new Map(commandes.value.map((c) => [c.commande.id, c.commande.rangLivraison ?? 0])),
)

/** Ce que l'interface affiche de chaque article placé. */
const infos = computed(() => {
  const ligneVersArticle = new Map(
    commandes.value.flatMap((c) => c.lignes.map((l) => [l.id, l.articleId] as const)),
  )
  const parArticle = new Map(articles.value.map((a) => [a.id, a]))
  const parCommande = new Map(commandes.value.map((c) => [c.commande.id, c.commande]))
  const parUnite = new Map(unites.value.map((u) => [u.id, u]))
  const signales = new Set(malCales.value)
  const resultat = new Map<string, InfoArticle>()
  for (const p of placements.value) {
    const unite = parUnite.get(p.uniteId)
    if (!unite) continue
    const article = parArticle.get(ligneVersArticle.get(unite.ligneCommandeId) ?? '')
    const commande = parCommande.get(unite.commandeId)
    resultat.set(p.uniteId, {
      repere: repereArticle(p.rang),
      nom: article?.nom ?? '',
      code: commande?.rangLivraison ?? 0,
      destination: commande?.destination ?? '',
      forme: article?.forme ?? 'rectangulaire',
      fragile: unite.fragile,
      etape: p.rang,
      malCale: signales.has(p.uniteId),
    })
  }
  return resultat
})

const dateAffichee = computed(() =>
  tournee.value?.date ? formaterJour(tournee.value.date) : textes.preparation.dateAFixer,
)
const ariane = computed(() => [
  { libelle: textes.navigation.accueil, vers: '/' },
  {
    libelle: tournee.value?.date
      ? textes.preparation.ariane(dateAffichee.value)
      : (tournee.value?.reference ?? ''),
    vers: `/tournees/${props.id}`,
  },
  { libelle: t.titre },
])

const sousTitre = computed(() => {
  const c = camion.value
  const v = versionPlan.value
  if (!c || !v) return undefined
  const caisse = [c.longueur, c.largeur, c.hauteur].map(formaterMillimetres).join(' × ')
  return [
    t.resume(c.nom, caisse, commandes.value.length, placements.value.length),
    lecture.value.aPlacer.length > 0 ? t.enTrop(lecture.value.aPlacer.length) : '',
    t.version(v.version, formaterDate(v.calculeLe)),
    v.ajusteALaMain ? t.manuel.ajusteeALaMain : '',
  ]
    .filter(Boolean)
    .join(' · ')
})

// --- Affichage : plan complet ou par étape (5.9) --------------------------------

const mode = ref<'complet' | 'etape'>('complet')
const modeChoisi = computed({
  get: () => mode.value as string,
  set: (v: string) => {
    mode.value = v === 'etape' ? 'etape' : 'complet'
  },
})
const modes = [
  { valeur: 'complet', libelle: t.modes.complet },
  { valeur: 'etape', libelle: t.modes.etape },
]
const etape = ref(1)
const total = computed(() => placements.value.length)
const etapeAffichee = computed(() => (mode.value === 'etape' ? etape.value : null))

function allerA(n: number) {
  etape.value = Math.min(Math.max(n, 0), total.value)
}

/** Le choix des silhouettes est mémorisé sur l'appareil (5.9). */
const CLE_SILHOUETTES = 'plan-de-chargement.silhouettes'
function lireSilhouettes(): boolean {
  try {
    return localStorage.getItem(CLE_SILHOUETTES) !== 'non'
  } catch {
    return true
  }
}
const silhouettes = ref(lireSilhouettes())
watch(silhouettes, (v) => {
  try {
    localStorage.setItem(CLE_SILHOUETTES, v ? 'oui' : 'non')
  } catch {
    // Stockage indisponible (navigation privée) : le choix vaut pour la page.
  }
})

const minuscule = (texte: string) => texte.charAt(0).toLocaleLowerCase('fr') + texte.slice(1)

/** Description de l'étape affichée : « à plat, à 2 400 mm du fond, contre la paroi gauche, posé sur A06 ». */
const etapeCourante = computed(() => {
  if (mode.value !== 'etape' || !camion.value) return null
  const p = placements.value.find((x) => x.rang === etape.value)
  const info = p ? infos.value.get(p.uniteId) : undefined
  if (!p || !info) return null
  const d = decrireEtape(p, placements.value, unites.value, camion.value)
  const sur = d.poseSur.map((id) => infos.value.get(id)?.repere ?? id).join(', ')
  const morceaux = [
    minuscule(textes.orientations[d.orientation]),
    t.description.distance(formaterMillimetres(d.distanceFond)),
    d.paroi ? t.description.paroi[d.paroi] : '',
    sur ? t.description.poseSur(sur) : t.description.plancher,
  ]
  return { info, texte: morceaux.filter(Boolean).join(', ') }
})

// --- Cadres de vue (5.8) --------------------------------------------------------

const vue1 = ref<Vue>('dessus')
const vue2 = ref<Vue>('gauche')

// --- Sélection et mise en évidence ----------------------------------------------

/**
 * Articles sélectionnés : un seul d'habitude ; plusieurs après « Voir » dans
 * le bandeau de calage (5.16). Échap, ou le choix d'un article, revient à un
 * seul.
 */
const selection = ref<string[]>([])

function selectionner(uniteId: string) {
  if (selection.value.length === 1 && selection.value[0] === uniteId) {
    selection.value = []
    return
  }
  selection.value = [uniteId]
  const info = infos.value.get(uniteId)
  if (info) message.value = t.articleSelectionne(info.repere, info.nom)
}

/** Depuis l'ordre de chargement : sélectionne, et en vue par étape, va à l'étape. */
function choisirDansOrdre(uniteId: string, rang: number) {
  if (mode.value === 'etape') allerA(rang)
  if (selection.value.length !== 1 || selection.value[0] !== uniteId) selectionner(uniteId)
}

const carteSelection = ref<InstanceType<typeof Carte> | null>(null)

/** « Voir » : sélectionne les articles mal calés et porte le focus sur leur liste. */
async function voirMalCales() {
  selection.value = [...malCales.value]
  message.value = t.calage.selectionnes(malCales.value.length)
  await nextTick()
  const element = carteSelection.value?.$el as HTMLElement | undefined
  element?.focus()
}

/**
 * Un clic ailleurs que dans la carte qui les liste (ou le bandeau qui les a
 * sélectionnés) quitte aussi la sélection multiple. Un clic sur un article le
 * sélectionne ensuite seul, par son propre bouton.
 */
function clicAilleurs(evenement: PointerEvent) {
  const cible = evenement.target
  if (selection.value.length < 2 || !(cible instanceof Element)) return
  if (!cible.closest('.selection, .bandeau-calage')) selection.value = []
}

onMounted(() => {
  document.addEventListener('keydown', clavierPage)
  document.addEventListener('pointerdown', clicAilleurs)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', clavierPage)
  document.removeEventListener('pointerdown', clicAilleurs)
})

const enEvidence = ref<number | null>(null)

function mettreEnEvidence(code: number) {
  enEvidence.value = enEvidence.value === code ? null : code
  message.value =
    enEvidence.value === null ? t.finMiseEnEvidence : t.miseEnEvidence(`C${enEvidence.value}`)
}

function toutAfficher() {
  enEvidence.value = null
  message.value = t.finMiseEnEvidence
}

const legende = computed(() =>
  commandes.value.map(({ commande, lignes }) => ({
    id: commande.id,
    code: commande.rangLivraison ?? 0,
    destination: commande.destination,
    articles: lignes.filter((l) => !reportees.value.has(l.id)).reduce((n, l) => n + l.quantite, 0),
  })),
)

/** État du code de commande d'un article dans les listes : étape à venir, autre commande. */
function etatCode(info: InfoArticle): 'normal' | 'attenue' | 'silhouette' {
  if (mode.value === 'etape' && info.etape > etape.value) return 'silhouette'
  if (enEvidence.value !== null && info.code !== enEvidence.value) return 'attenue'
  return 'normal'
}

// --- Tableau des placements et article sélectionné -----------------------------

const lignes = computed(() =>
  placements.value.flatMap((p) => {
    const info = infos.value.get(p.uniteId)
    const unite = unites.value.find((u) => u.id === p.uniteId)
    if (!info || !unite) return []
    return [{ p, info, unite, dims: encombrement(unite.dims, p.orientation) }]
  }),
)

const detail = computed(() =>
  selection.value.length === 1
    ? (lignes.value.find((l) => l.p.uniteId === selection.value[0]) ?? null)
    : null,
)

/**
 * Sélection multiple : chaque article, et pour celui qui est caché dans les
 * deux cadres, une vue où il se voit (comme pour les articles cachés, 5.10).
 */
const multiple = computed(() => {
  const c = camion.value
  if (selection.value.length < 2 || !c) return []
  const montres =
    mode.value === 'etape'
      ? placements.value.filter((p) => p.rang <= etape.value)
      : placements.value
  return selection.value.flatMap((uniteId) => {
    const info = infos.value.get(uniteId)
    if (!info) return []
    const vues = vuesOuVisible(uniteId, montres, unites.value, c)
    const visible = vues.includes(vue1.value) || vues.includes(vue2.value)
    return [{ uniteId, info, visible, proposee: vues.find((v) => v !== vue1.value) ?? null }]
  })
})

/** Montre la vue proposée dans le second cadre ; la sélection reste. */
function montrerVue(v: Vue) {
  vue2.value = v
  message.value = t.titresVues[v]
}

const deuxChiffres = (n: number) => String(n).padStart(2, '0')

// --- Articles mal calés (RG-19, 5.16) ---------------------------------------------

/** « A10, A11 et A12 » */
function enumerer(reperes: string[]): string {
  return reperes.length > 1
    ? `${reperes.slice(0, -1).join(', ')} et ${reperes.at(-1) ?? ''}`
    : reperes.join('')
}

/** « A10, A11, A12 (C2) » : les repères groupés par commande. */
const listeCalage = computed(() => {
  const groupes = new Map<number, string[]>()
  for (const id of malCales.value) {
    const info = infos.value.get(id)
    if (info) groupes.set(info.code, [...(groupes.get(info.code) ?? []), info.repere])
  }
  return [...groupes.entries()]
    .sort(([a], [b]) => a - b)
    .map(([code, reperes]) => `${reperes.join(', ')} (C${code})`)
    .join(', ')
})

const texteCalage = computed(() =>
  malCales.value.length ? t.calage.titre(malCales.value.length, listeCalage.value) : '',
)

/** Pourquoi : les articles debout d'un côté, les autres de l'autre (RG-19). */
const explicationCalage = computed(() => {
  const repere = (id: string) => infos.value.get(id)?.repere ?? id
  const estDebout = (id: string) =>
    placements.value.find((p) => p.uniteId === id)?.orientation !== 'aPlat'
  const debout = malCales.value.filter(estDebout).map(repere)
  const autres = malCales.value.filter((id) => !estDebout(id)).map(repere)
  return [
    debout.length ? t.calage.debout(enumerer(debout), debout.length) : '',
    autres.length ? t.calage.autres(enumerer(autres), autres.length) : '',
    t.calage.conseil,
  ]
    .filter(Boolean)
    .join(' ')
})

// --- Dépassement (RG-10, 5.7) ------------------------------------------------------

/**
 * Articles sans place dans le plan (5.7) : en trop après le calcul (RG-10), ou
 * dont la ligne a changé depuis. Leur repère suit ceux des articles placés.
 */
const aPlacer = computed(() => {
  const ligneVersArticle = new Map(
    commandes.value.flatMap((c) => c.lignes.map((l) => [l.id, l.articleId] as const)),
  )
  return lecture.value.aPlacer.map((unite, i) => ({
    unite,
    repere: repereArticle(placements.value.length + i + 1),
    nom:
      articles.value.find((a) => a.id === ligneVersArticle.get(unite.ligneCommandeId))?.nom ?? '',
    code: codeCommande.value.get(unite.commandeId) ?? 0,
  }))
})

/** Commandes concernées par le dépassement, avec leur nombre d'articles. */
const commandesEnTrop = computed(() =>
  [...new Set(aPlacer.value.map((a) => a.unite.commandeId))].map((id) => ({
    id,
    code: `C${codeCommande.value.get(id) ?? 0}`,
    articles: unites.value.filter((u) => u.commandeId === id).length,
  })),
)

const texteDepassement = computed(() =>
  aPlacer.value.length
    ? t.depassement.titre(
        aPlacer.value.length,
        commandesEnTrop.value.map((c) => c.code).join(' et '),
      )
    : '',
)

const detailDepassement = computed(() =>
  aPlacer.value
    .map((a) => `${a.repere} ${a.nom} (${formaterDimensions(a.unite.dims)} mm)`)
    .join(', '),
)

// --- Report et calcul (RG-11) ------------------------------------------------------

/** Le report et le calcul ne valent que pour une tournée en préparation. */
const modifiable = computed(() => tournee.value?.statut === 'enPreparation')
const occupe = ref(false)
const erreurAction = ref('')

/**
 * Fait une action qui change le plan, relit la page, puis annonce le message
 * de l'action et, s'il a changé, le nouveau statut d'équilibre (5.17).
 */
async function agir(action: () => Promise<string>) {
  if (occupe.value) return
  occupe.value = true
  erreurAction.value = ''
  // L'annonce reçue en arrivant sur la page ne vaut plus pour le nouveau plan.
  annonce.value = ''
  const statutAvant = mesure.value.etapes.length ? mesure.value.statut : null
  try {
    const texte = await action()
    await charger()
    selection.value = []
    oublierAjustements()
    const statut = mesure.value.etapes.length ? mesure.value.statut : null
    message.value = [
      texte,
      statut && statut !== statutAvant ? t.equilibre.annonce(t.equilibre.statuts[statut]) : '',
    ]
      .filter(Boolean)
      .join(' ')
  } catch (e) {
    erreurAction.value = e instanceof ErreurDonnees ? e.message : textes.donnees.reseau
    message.value = erreurAction.value
  } finally {
    occupe.value = false
    void attente.actualiser(depots)
  }
}

async function relancer() {
  const c = camion.value
  if (!c) return
  await agir(async () => (await calculerEtEnregistrer(depots, props.id, c)).annonce)
}

/** « Reporter les articles en trop » : une ligne reportée en partie est scindée. */
async function reporterEnTrop() {
  const n = aPlacer.value.length
  const reports = regrouperParLigne(aPlacer.value.map((a) => a.unite))
  await agir(async () => {
    await depots.attente.reporterArticles(props.id, reports, 'depassement')
    return t.depassement.articlesReportes(n)
  })
}

/** « Reporter toute la commande » : après confirmation (RG-22), puis nouveau calcul. */
const commandeAReporter = ref<{ id: string; code: string } | null>(null)

async function reporterCommande() {
  const choix = commandeAReporter.value
  const c = camion.value
  commandeAReporter.value = null
  if (!choix || !c) return
  await agir(async () => {
    await depots.attente.reporterCommande(choix.id, 'depassement')
    await calculerEtEnregistrer(depots, props.id, c)
    return t.depassement.commandeReportee(choix.code)
  })
}

/**
 * « Relancer le calcul » : sur une version ajustée à la main, et seulement
 * dans ce cas, une confirmation prévient que les ajustements seront perdus
 * (RG-22 ; décision 5 du prototype 2). Sinon rien n'est perdu : pas de fenêtre.
 */
const relanceAConfirmer = ref(false)

function demanderRelance() {
  if (versionPlan.value?.ajusteALaMain) relanceAConfirmer.value = true
  else void relancer()
}

function confirmerRelance() {
  relanceAConfirmer.value = false
  void relancer()
}

/** Le report d'une commande relance le calcul : il prévient aussi (5.18). */
const consequenceReport = computed(() => {
  const choix = commandeAReporter.value
  const v = versionPlan.value
  if (!choix) return ''
  const consequence = t.depassement.confirmation.consequence(choix.code)
  return v?.ajusteALaMain
    ? `${consequence} ${t.manuel.confirmationRelance.consequence(v.version)}`
    : consequence
})

// --- Ajustement manuel (5.3, 5.5, 5.7, 5.18) ----------------------------------------

const tm = t.manuel
const historique = useHistorique()
// L'historique ne vaut que pour la visite de la page (décision 4).
historique.vider()

/**
 * Seule la version actuelle d'une tournée en préparation s'ajuste, et pas
 * quand elle est « à recalculer » (décision 8). La page n'affiche que la
 * dernière version.
 */
const ajustable = computed(
  () => modifiable.value && versionPlan.value !== null && !versionPlan.value.aRecalculer,
)
const raisonNonAjustable = computed(() =>
  modifiable.value ? tm.nonAjustable.aRecalculer : tm.nonAjustable.statut,
)

/** Aimantation : activée par défaut, choix mémorisé sur l'appareil (5.2). */
const aimantation = ref(lireAimantation())
watch(aimantation, (active) => {
  enregistrerAimantation(active)
  message.value = tm.fait.aimantation(active)
})

/** Raccourcis de l'appareil (5.6) : R et Suppr par défaut. */
const raccourcis = lireRaccourcis()

/** La touche pressée est-elle celle du raccourci ? « r » et « R » sont la même touche. */
function correspond(touche: string | null, evenement: KeyboardEvent): boolean {
  if (touche === null || evenement.ctrlKey || evenement.metaKey || evenement.altKey) return false
  return touche.length === 1
    ? touche.toLocaleLowerCase('fr') === evenement.key.toLocaleLowerCase('fr')
    : touche === evenement.key
}

/** Dernier ajustement refusé (capture 04f), et les articles à retirer aussi (5.7). */
const refus = ref<(MessageRefus & { retires: string[]; aRetirerAussi: string[] }) | null>(null)

/** Orientation de chaque article de la zone : celle d'avant son retrait, ou celle choisie (5.7). */
const orientationsZone = ref<Partial<Record<string, Orientation>>>({})
/** Articles retirés pendant la visite : la zone les dit « retirés ». */
const retiresIci = ref<Set<string>>(new Set())

/** Déplacement au clavier en cours (5.3) : Entrée valide, Échap annule. */
const enCours = ref<{ uniteId: string; pose: Pose } | null>(null)

/** Places proposées par « Choisir une place » (5.3, capture 04h). */
const placesProposees = ref<{ uniteId: string; poses: Pose[] } | null>(null)

/** Oublie l'ajustement en cours : à chaque nouvelle version (décision 4). */
function oublierAjustements() {
  historique.vider()
  enCours.value = null
  placesProposees.value = null
  refus.value = null
  orientationsZone.value = {}
  retiresIci.value = new Set()
}

// Choisir un autre article abandonne le déplacement en cours.
watch(selection, (choisis) => {
  if (enCours.value && !choisis.includes(enCours.value.uniteId)) enCours.value = null
})

/** De quoi nommer un article, qu'il soit dans le camion ou dans la zone. */
function citer(uniteId: string) {
  const info = infos.value.get(uniteId)
  if (info) return { nom: info.nom, repere: info.repere, code: info.code }
  const a = aPlacer.value.find((x) => x.unite.id === uniteId)
  return a ? { nom: a.nom, repere: a.repere, code: a.code } : undefined
}
const repere = (uniteId: string) => citer(uniteId)?.repere ?? uniteId

const racine = ref<HTMLElement | null>(null)
const carteZone = ref<InstanceType<typeof Carte> | null>(null)

/**
 * Replace le focus après une action (cahier technique 6) : sur l'article
 * dans les vues, sinon sur la zone « Articles à placer ».
 */
async function focaliser(uniteId: string | null) {
  await nextTick()
  const bouton = uniteId
    ? racine.value?.querySelector<HTMLElement>(`.calque__bouton[data-unite="${uniteId}"]`)
    : null
  const repli = carteZone.value?.$el as HTMLElement | undefined
  ;(bouton ?? repli)?.focus()
}

/** Montre et annonce un refus ; l'article reprend sa place (RG-08, RG-09). */
function refuser(
  enfreintes: RegleEnfreinte[],
  genre: GenreAjustement,
  uniteId: string,
  retrait: { retires: string[]; aRetirerAussi: string[] } = { retires: [], aRetirerAussi: [] },
) {
  const m = messageRefus(enfreintes, genre, citer)
  refus.value = { ...m, ...retrait }
  message.value = `${m.titre}. ${m.texte}`
  void focaliser(genre === 'remise' ? null : uniteId)
}

/**
 * Enregistre aussitôt un changement accepté (5.18), puis annonce le message,
 * et ce qui a changé dans l'équilibre et le calage (RG-19, RG-20). `libelle`
 * dit ce qu'annulera « Annuler le dernier déplacement » ; absent pour une
 * annulation, qui ne s'annule pas (pas de « Rétablir »).
 */
async function enregistrerAjustement(
  nouveau: Placement[],
  libelle: string | null,
  texte: () => string,
  focus: string | null,
): Promise<void> {
  const v = versionPlan.value
  const e = enregistre.value
  if (!v || !e || occupe.value) return
  occupe.value = true
  erreurAction.value = ''
  refus.value = null
  annonce.value = ''
  const avant = placements.value
  const statutAvant = mesure.value.etapes.length ? mesure.value.statut : null
  const calageAvant = texteCalage.value
  try {
    enregistre.value = await depots.plans.ajuster(
      v.id,
      dispositionAjustee(nouveau, e.placements, unites.value),
    )
    if (libelle) historique.empiler({ planId: v.id, avant, libelle })
    const statut = mesure.value.etapes.length ? mesure.value.statut : null
    message.value = [
      texte(),
      statut && statut !== statutAvant ? t.equilibre.annonce(t.equilibre.statuts[statut]) : '',
      texteCalage.value !== calageAvant ? texteCalage.value : '',
    ]
      .filter(Boolean)
      .join(' ')
    void focaliser(focus)
  } catch (err) {
    erreurAction.value = err instanceof ErreurDonnees ? err.message : textes.donnees.reseau
    message.value = erreurAction.value
  } finally {
    occupe.value = false
  }
}

// --- Au clavier (5.3) ---------------------------------------------------------------

/** Le plan montré dans les vues : l'article déplacé au clavier y est à sa position en cours. */
const planAffiche = computed(() => {
  const c = enCours.value
  return c
    ? placements.value.map((p) => (p.uniteId === c.uniteId ? { ...p, ...c.pose } : p))
    : placements.value
})

/** Ce que dit le bandeau du déplacement en cours : position, puis permise ou refusée. */
const etatEnCours = computed(() => {
  const c = enCours.value
  const cam = camion.value
  if (!c || !cam) return null
  const verdict = deplacer(placements.value, c.uniteId, c.pose, unites.value, cam)
  const position = tm.enCours.position(
    formaterMillimetres(c.pose.x),
    formaterMillimetres(c.pose.y),
    formaterMillimetres(c.pose.z),
  )
  const premiere = verdict.accepte ? undefined : verdict.enfreintes[0]
  return {
    titre: tm.enCours.titre(repere(c.uniteId)),
    permise: verdict.accepte,
    texte: `${position} ${
      premiere ? tm.enCours.refusee(t.ajustement.refus[premiere.motif].raison) : tm.enCours.permise
    }`,
  }
})

/**
 * Une touche sur un article d'une vue (5.3, 5.5, 5.7) :
 * - flèches, Maj + flèches : un pas de 50 ou 500 mm sur les axes de la vue,
 *   raccourci au contact avec l'aimantation ; en vue de dessus, l'article se
 *   pose au plus bas (décision 2) ;
 * - Entrée : valide la position en cours ;
 * - R, Suppr (raccourcis de l'appareil) : change d'orientation, retire.
 */
function toucheArticle(uniteId: string, evenement: KeyboardEvent, vue: Vue) {
  const cam = camion.value
  const p = placements.value.find((x) => x.uniteId === uniteId)
  if (!ajustable.value || !cam || !p || occupe.value) return
  const pas = evenement.ctrlKey || evenement.altKey ? null : flecheVersPas(vue, evenement.key)
  if (pas) {
    evenement.preventDefault()
    if (selection.value.length !== 1 || selection.value[0] !== uniteId) selection.value = [uniteId]
    placesProposees.value = null
    refus.value = null
    const depart: Pose =
      enCours.value?.uniteId === uniteId
        ? enCours.value.pose
        : { x: p.x, y: p.y, z: p.z, orientation: p.orientation }
    const position = avancer(
      placements.value,
      uniteId,
      depart,
      pas.axe,
      pas.sens,
      pasClavier(evenement.shiftKey),
      aimantation.value,
      unites.value,
      cam,
    )
    if (vue === 'dessus') {
      position.z = poserAuPlusBas(
        placements.value,
        uniteId,
        position,
        depart.orientation,
        unites.value,
      )
    }
    enCours.value = { uniteId, pose: { ...position, orientation: depart.orientation } }
    const etat = etatEnCours.value
    message.value = etat ? `${etat.titre}. ${etat.texte}` : ''
    return
  }
  if (evenement.key === 'Enter' && enCours.value?.uniteId === uniteId) {
    // Sans cela, Entrée « cliquerait » le bouton et désélectionnerait l'article.
    evenement.preventDefault()
    void validerEnCours()
  } else if (correspond(raccourcis.changerOrientation, evenement)) {
    evenement.preventDefault()
    void changerOrientationDe(uniteId)
  } else if (correspond(raccourcis.retirer, evenement)) {
    evenement.preventDefault()
    void retirerArticles([uniteId])
  }
}

/** Entrée : la position en cours est contrôlée, puis enregistrée ou refusée (5.2, étape 5). */
async function validerEnCours() {
  const c = enCours.value
  const cam = camion.value
  if (!c || !cam) return
  const r = deplacer(placements.value, c.uniteId, c.pose, unites.value, cam)
  if (!r.accepte) {
    enCours.value = null
    refuser(r.enfreintes, 'deplacement', c.uniteId)
    return
  }
  await enregistrerAjustement(
    r.plan,
    tm.historique.deplacement(repere(c.uniteId)),
    () => tm.fait.deplace(repere(c.uniteId)),
    c.uniteId,
  )
  enCours.value = null
}

/** Échap : l'article reprend sa place. */
function annulerEnCours() {
  const c = enCours.value
  enCours.value = null
  message.value = tm.fait.deplacementAnnule
  if (c) void focaliser(c.uniteId)
}

// --- Orientation et retrait (5.5, 5.7) ----------------------------------------------

/** Nom d'une orientation dans une phrase : « à plat », « debout », « contre une paroi ». */
const enPhrase = (o: Orientation) => t.ajustement.placementZone.orientation[o]

async function changerOrientationDe(uniteId: string) {
  const cam = camion.value
  if (!cam || !ajustable.value) return
  enCours.value = null
  placesProposees.value = null
  const r = changerOrientation(placements.value, uniteId, unites.value, cam)
  if (!r.accepte) {
    refuser(r.enfreintes, 'orientation', uniteId)
    return
  }
  const orientation = r.plan.find((p) => p.uniteId === uniteId)?.orientation ?? 'aPlat'
  await enregistrerAjustement(
    r.plan,
    tm.historique.orientation(repere(uniteId)),
    () => tm.fait.oriente(repere(uniteId), enPhrase(orientation)),
    uniteId,
  )
}

/**
 * Retire des articles vers la zone (5.7). Refusé s'il laisse un article sans
 * appui ou sans calage : le bandeau propose de retirer aussi ces articles, en
 * une seule action annulable (décision 12).
 */
async function retirerArticles(ids: string[]) {
  const cam = camion.value
  if (!cam || !ajustable.value || ids.length === 0) return
  enCours.value = null
  placesProposees.value = null
  const r = retirer(placements.value, ids, unites.value, cam)
  if (!r.accepte) {
    refuser(r.enfreintes, 'retrait', ids[0] ?? '', {
      retires: ids,
      aRetirerAussi: r.aRetirerAussi,
    })
    return
  }
  const reperes = enumerer(ids.map(repere))
  for (const id of ids) {
    const p = placements.value.find((x) => x.uniteId === id)
    if (p) orientationsZone.value[id] = p.orientation
  }
  retiresIci.value = new Set([...retiresIci.value, ...ids])
  selection.value = []
  await enregistrerAjustement(
    r.plan,
    tm.historique.retrait(reperes),
    () => tm.fait.retire(reperes, ids.length),
    null,
  )
}

/** « Retirer aussi A05 » : l'article demandé et ceux qu'il porte ou cale. */
function retirerAussi() {
  const r = refus.value
  if (r) void retirerArticles([...r.retires, ...r.aRetirerAussi])
}

const texteRetirerAussi = computed(() => {
  const ids = refus.value?.aRetirerAussi ?? []
  return ids.length ? t.ajustement.retirerAussi(enumerer(ids.map(repere))) : ''
})

// --- Zone « Articles à placer » et places proposées (5.3, 5.7) ------------------------

/** Orientation d'un article de la zone : celle d'avant son retrait, sinon la première autorisée. */
function orientationZone(uniteId: string): Orientation {
  const unite = unites.value.find((u) => u.id === uniteId)
  return orientationsZone.value[uniteId] ?? unite?.orientations[0] ?? 'aPlat'
}

/** « Changer d'orientation » dans la zone, avant de placer l'article (5.7). */
function changerOrientationZone(uniteId: string) {
  const unite = unites.value.find((u) => u.id === uniteId)
  if (!unite || !ajustable.value) return
  const suivante = orientationSuivante(unite, orientationZone(uniteId))
  if (suivante === null) {
    const a = citer(uniteId)
    message.value = t.ajustement.refus.orientationUnique.explication(
      a ? t.ajustement.citer(a.nom, a.repere, `C${a.code}`) : uniteId,
    )
    return
  }
  orientationsZone.value[uniteId] = suivante
  message.value = tm.fait.orientationZone(repere(uniteId), enPhrase(suivante))
  if (placesProposees.value?.uniteId === uniteId) choisirPlace(uniteId)
}

/**
 * Ce que la zone dit d'un article : retiré pendant la visite, en trop après
 * le calcul (RG-10), ou simplement à placer sur un plan ajusté.
 */
function mentionZone(uniteId: string): string {
  if (retiresIci.value.has(uniteId)) return tm.retire
  return versionPlan.value?.ajusteALaMain ? tm.aPlacer : t.aPlacer.enTrop
}

/** R sur un article de la zone change son orientation (5.7). */
function toucheZone(uniteId: string, evenement: KeyboardEvent) {
  if (!correspond(raccourcis.changerOrientation, evenement)) return
  evenement.preventDefault()
  changerOrientationZone(uniteId)
}

/** « Choisir une place » : au plus 5 places, marquées « + » dans les vues (5.3). */
function choisirPlace(uniteId: string) {
  const cam = camion.value
  if (!cam || !ajustable.value) return
  enCours.value = null
  refus.value = null
  const dansLePlan = placements.value.some((p) => p.uniteId === uniteId)
  const poses = proposerPlaces(
    placements.value,
    uniteId,
    unites.value,
    cam,
    dansLePlan ? {} : { orientation: orientationZone(uniteId) },
  )
  placesProposees.value = { uniteId, poses }
  message.value = poses.length
    ? `${titrePlaces.value}. ${tm.places.aide(poses.length)}`
    : `${titrePlaces.value}. ${tm.places.aucune}`
  void nextTick(() => racine.value?.querySelector<HTMLElement>('.calque__place')?.focus())
}

const titrePlaces = computed(() => {
  const id = placesProposees.value?.uniteId
  const a = id ? citer(id) : undefined
  return a ? tm.places.titre(a.repere, `C${a.code}`) : ''
})

/** Les marques « + » des vues, avec leur nom accessible. */
const marquesPlaces = computed(() => {
  const pp = placesProposees.value
  if (!pp) return []
  return pp.poses.map((pose, i) => ({
    uniteId: pp.uniteId,
    pose,
    libelle: tm.places.place(
      i + 1,
      pp.poses.length,
      formaterMillimetres(pose.x),
      formaterMillimetres(pose.y),
      formaterMillimetres(pose.z),
    ),
  }))
})

function annulerPlaces() {
  const id = placesProposees.value?.uniteId ?? null
  placesProposees.value = null
  message.value = ''
  void focaliser(id && placements.value.some((p) => p.uniteId === id) ? id : null)
}

/** Un article qui quitte la zone n'a plus d'orientation de zone. */
function oublierZone(ids: string[]) {
  orientationsZone.value = Object.fromEntries(
    Object.entries(orientationsZone.value).filter(([id]) => !ids.includes(id)),
  )
  retiresIci.value = new Set([...retiresIci.value].filter((id) => !ids.includes(id)))
}

/** Une marque « + » choisie : l'article y est déplacé, ou remis depuis la zone. */
async function poserSurPlace(rang: number) {
  const pp = placesProposees.value
  const pose = pp?.poses[rang]
  const cam = camion.value
  if (!pp || !pose || !cam) return
  placesProposees.value = null
  const id = pp.uniteId
  const dansLePlan = placements.value.some((p) => p.uniteId === id)
  const r = dansLePlan
    ? deplacer(placements.value, id, pose, unites.value, cam)
    : remettre(placements.value, id, pose, unites.value, cam)
  if (!r.accepte) {
    refuser(r.enfreintes, dansLePlan ? 'deplacement' : 'remise', id)
    return
  }
  const libelle = dansLePlan
    ? tm.historique.deplacement(repere(id))
    : tm.historique.remise(repere(id))
  if (!dansLePlan) oublierZone([id])
  selection.value = [id]
  await enregistrerAjustement(
    r.plan,
    libelle,
    () => (dansLePlan ? tm.fait.deplace(repere(id)) : tm.fait.remis(repere(id))),
    id,
  )
}

/**
 * « Placer » et « Tout placer » (5.7 ; décision 9) : chaque article sur la
 * première place proposée, sans bouger les autres. Un article sans place
 * reste dans la zone, avec un message.
 */
async function placer(ids: string[]) {
  const cam = camion.value
  if (!cam || !ajustable.value || ids.length === 0) return
  enCours.value = null
  placesProposees.value = null
  refus.value = null
  const avant = new Map(ids.map((id) => [id, repere(id)]))
  const r = placerDepuisZone(placements.value, ids, unites.value, cam, orientationsZone.value)
  const details = [
    ...r.orientationsChangees.map((c) =>
      t.ajustement.placementZone.autreOrientation(
        avant.get(c.uniteId) ?? c.uniteId,
        enPhrase(c.orientation),
        enPhrase(c.demandee),
      ),
    ),
    ...r.restants.map((id) => t.ajustement.placementZone.sansPlace(avant.get(id) ?? id)),
  ]
  const [seul] = r.places
  if (seul === undefined) {
    message.value = details.join(' ')
    return
  }
  oublierZone(r.places)
  await enregistrerAjustement(
    r.plan,
    r.places.length === 1
      ? tm.historique.remise(avant.get(seul) ?? seul)
      : tm.historique.placementZone,
    () => [tm.fait.places(r.places.length), ...details].join(' '),
    r.places.length === 1 ? seul : null,
  )
}

// --- Annuler le dernier déplacement (5.18) -----------------------------------------

const peutAnnuler = computed(() => {
  const v = versionPlan.value
  return v !== null && historique.peutAnnuler(v.id)
})

async function annuler() {
  const v = versionPlan.value
  if (!v || !ajustable.value || occupe.value) return
  enCours.value = null
  placesProposees.value = null
  const changement = historique.depiler(v.id)
  if (!changement) {
    message.value = tm.fait.rienAAnnuler
    return
  }
  await enregistrerAjustement(
    changement.avant,
    null,
    () => tm.fait.annule(changement.libelle),
    selection.value.length === 1 ? (selection.value[0] ?? null) : null,
  )
}

// --- Clavier de la page ----------------------------------------------------------------

/** Un champ où l'on écrit garde ses propres touches (Ctrl + Z y annule la saisie). */
function estChampDeSaisie(cible: EventTarget | null): boolean {
  return (
    cible instanceof HTMLElement &&
    (cible.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(cible.tagName))
  )
}

/**
 * Raccourcis fixes de la page (5.6) :
 * - Échap (« Désélectionner ») : ferme les places proposées, annule le
 *   déplacement en cours, sinon quitte la sélection ;
 * - Ctrl + Z : « Annuler le dernier déplacement ».
 * Une fenêtre de confirmation ouverte garde ses touches.
 */
function clavierPage(evenement: KeyboardEvent) {
  if (document.querySelector('dialog[open]')) return
  if (evenement.key === 'Escape') {
    if (placesProposees.value) annulerPlaces()
    else if (enCours.value) annulerEnCours()
    else if (selection.value.length > 0) selection.value = []
    return
  }
  const z = evenement.key === 'z' || evenement.key === 'Z'
  if (z && (evenement.ctrlKey || evenement.metaKey) && !evenement.altKey && !evenement.shiftKey) {
    if (!ajustable.value || estChampDeSaisie(evenement.target)) return
    evenement.preventDefault()
    void annuler()
  }
}
</script>

<template>
  <EntetePage :titre="t.titre" :ariane="ariane" :sous-titre="sousTitre">
    <template v-if="tournee" #apres-titre>
      <Badge class="plan-page__statut">{{
        premiereMajuscule(textes.statutsTournee[tournee.statut])
      }}</Badge>
    </template>
    <template v-if="tournee" #actions>
      <LienBouton :vers="`/tournees/${props.id}`">{{ t.retourPreparation }}</LienBouton>
      <Bouton
        v-if="versionPlan && camion && modifiable && !versionPlan.aRecalculer"
        :desactive="occupe"
        @click="demanderRelance"
      >
        {{ occupe ? t.calculEnCours : t.relancer }}
      </Bouton>
    </template>
  </EntetePage>

  <Annonce :message="annonce" />
  <p class="visuellement-cache" role="status">{{ message }}</p>

  <p v-if="chargement" class="etat">{{ textes.referentiels.chargement }}</p>
  <Bandeau v-else-if="erreurChargement" ton="alerte">{{ erreurChargement }}</Bandeau>
  <Bandeau v-else-if="!versionPlan" ton="info" :titre="t.aucunPlan">
    {{ t.aucunPlanAide }}
  </Bandeau>
  <Bandeau v-else-if="!camion" ton="alerte">{{ t.sansCamion }}</Bandeau>

  <div v-else ref="racine" class="plan-page">
    <Bandeau v-if="erreurAction" ton="alerte">{{ erreurAction }}</Bandeau>

    <!-- Ajustement refusé (RG-08, RG-09, capture 04f). -->
    <Bandeau v-if="refus" ton="alerte" class="bandeau-refus" :titre="refus.titre">
      <span class="donnees bandeau__regle">{{ refus.regles }}</span>
      <br />
      {{ refus.texte }}
      <template #actions>
        <Bouton v-if="texteRetirerAussi" :desactive="occupe" @click="retirerAussi">
          {{ texteRetirerAussi }}
        </Bouton>
        <Bouton
          variante="texte"
          icone="fermer"
          seulement-icone
          :libelle="tm.fermer"
          @click="refus = null"
        />
      </template>
    </Bandeau>

    <!-- Déplacement au clavier en cours (5.3). -->
    <Bandeau v-if="etatEnCours" ton="info" class="bandeau-en-cours" :titre="etatEnCours.titre">
      <span class="en-cours__etat" :class="{ 'en-cours__etat--refusee': !etatEnCours.permise }">
        <Icone :nom="etatEnCours.permise ? 'coche' : 'alerte'" :taille="16" />
        {{ etatEnCours.texte }}
      </span>
      <template #actions>
        <Bouton :desactive="occupe" @click="validerEnCours">{{ tm.enCours.valider }}</Bouton>
        <Bouton @click="annulerEnCours">{{ tm.enCours.annuler }}</Bouton>
      </template>
    </Bandeau>

    <!-- « Choisir une place » (5.3, capture 04h). -->
    <Bandeau v-if="placesProposees" ton="info" class="bandeau-places" :titre="titrePlaces">
      {{
        placesProposees.poses.length
          ? tm.places.aide(placesProposees.poses.length)
          : tm.places.aucune
      }}
      <template #actions>
        <Bouton @click="annulerPlaces">{{ tm.places.annuler }}</Bouton>
      </template>
    </Bandeau>

    <Bandeau v-if="versionPlan.aRecalculer" ton="alerte" :titre="t.aRecalculer">
      {{ t.aRecalculerAide }}
      <template v-if="modifiable" #actions>
        <Bouton variante="principal" :desactive="occupe" @click="demanderRelance">
          {{ occupe ? t.calculEnCours : t.relancer }}
        </Bouton>
      </template>
    </Bandeau>

    <!-- Barre d'affichage : mode, étape, légende des commandes. -->
    <section class="barre" :aria-label="t.affichage">
      <div class="barre__ligne">
        <Selecteur
          v-model="modeChoisi"
          :legende="t.affichage"
          :legende-visible="false"
          :options="modes"
        />
        <template v-if="mode === 'etape'">
          <div class="barre__etapes">
            <Bouton icone="chevron-gauche" :desactive="etape <= 0" @click="allerA(etape - 1)">
              {{ t.precedent }}
            </Bouton>
            <span class="barre__compteur donnees">{{ t.etapeSur(etape, total) }}</span>
            <Bouton :desactive="etape >= total" @click="allerA(etape + 1)">
              {{ t.suivant }}
            </Bouton>
            <label class="barre__curseur">
              <span class="visuellement-cache">{{ t.curseurEtape }}</span>
              <input
                type="range"
                min="0"
                :max="total"
                step="1"
                :value="etape"
                :aria-valuetext="t.etapeSur(etape, total)"
                @input="allerA(Number(($event.target as HTMLInputElement).value))"
              />
            </label>
          </div>
          <CaseACocher v-model="silhouettes" :libelle="t.silhouettes" />
        </template>
      </div>
      <div class="barre__ligne">
        <span class="barre__titre">{{ t.commandes }}</span>
        <ul class="legende">
          <li v-for="c in legende" :key="c.id">
            <button
              type="button"
              class="legende__bouton"
              :aria-pressed="enEvidence === c.code"
              @click="mettreEnEvidence(c.code)"
            >
              <CodeCommande
                :numero="c.code"
                :etat="enEvidence !== null && enEvidence !== c.code ? 'attenue' : 'normal'"
              />
              <span class="legende__nom">{{ c.destination }}</span>
              <span class="legende__detail">
                · {{ t.legendeCommande(textes.preparation.rang(c.code), c.articles) }}
              </span>
            </button>
          </li>
        </ul>
        <Bouton v-if="enEvidence !== null" variante="texte" @click="toutAfficher">
          {{ t.toutAfficher }}
        </Bouton>
      </div>
      <!-- Ajustement (5.2, 5.18) : annulation et aimantation, ou pourquoi le plan ne s'ajuste pas. -->
      <div v-if="ajustable" class="barre__ligne barre__ligne--ajustement">
        <Bouton icone="annuler" :desactive="!peutAnnuler || occupe" @click="annuler">
          {{ tm.annuler }}
        </Bouton>
        <span class="barre__aimantation">
          <Interrupteur v-model="aimantation" :libelle="tm.aimantation" />
          <span class="donnees barre__pas">{{ tm.pas }}</span>
        </span>
      </div>
      <p v-else class="barre__note">{{ raisonNonAjustable }}</p>
    </section>

    <!-- Articles mal calés (RG-19, 5.16). -->
    <Bandeau v-if="malCales.length" ton="alerte" class="bandeau-calage" :titre="texteCalage">
      <span class="donnees bandeau__regle">{{ t.calage.regle }}</span>
      <br />
      {{ explicationCalage }}
      <template #actions>
        <Bouton @click="voirMalCales">{{ t.calage.voir }}</Bouton>
      </template>
    </Bandeau>

    <!-- Dépassement (RG-10, RG-11, 5.7). -->
    <Bandeau
      v-if="aPlacer.length"
      ton="alerte"
      class="bandeau-depassement"
      :titre="texteDepassement"
    >
      <span class="donnees bandeau__regle">{{ t.depassement.regles }}</span>
      <br />
      {{ detailDepassement }}. {{ t.depassement.aide }}
      <template v-if="modifiable" #actions>
        <div class="depassement__actions">
          <Bouton variante="principal" :desactive="occupe" @click="reporterEnTrop">
            {{ t.depassement.reporterEnTrop(aPlacer.length) }}
          </Bouton>
          <Bouton
            v-for="c in commandesEnTrop"
            :key="c.id"
            :desactive="occupe"
            @click="commandeAReporter = { id: c.id, code: c.code }"
          >
            {{ t.depassement.reporterCommande(c.code, c.articles) }}
          </Bouton>
        </div>
      </template>
    </Bandeau>

    <!-- Description de l'étape, lue par les lecteurs d'écran (5.9). -->
    <div v-if="mode === 'etape'" role="status">
      <Bandeau ton="info">
        <template v-if="etapeCourante">
          <strong>{{ t.etapeSur(etape, total) }}</strong>
          {{ ' ' }}
          <CodeCommande :numero="etapeCourante.info.code" />
          {{ ' ' }}
          <strong>{{ etapeCourante.info.nom }}</strong>
          {{ ' ' }}
          <span class="donnees">{{ etapeCourante.info.repere }}</span>
          — {{ etapeCourante.texte }}.
        </template>
        <template v-else>{{ t.etapeVide(total) }}</template>
      </Bandeau>
    </div>

    <div class="plan-page__grille">
      <div class="plan-page__principal">
        <CadreVue
          v-model:vue="vue1"
          :autre-vue="vue2"
          :camion="camion"
          :plan="planAffiche"
          :unites="unites"
          :infos="infos"
          :etape="etapeAffichee"
          :silhouettes="silhouettes"
          :selection="selection"
          :en-evidence="enEvidence"
          :centre-gravite="centreGravite"
          :places="marquesPlaces"
          :en-deplacement="enCours?.uniteId ?? null"
          @selectionner="selectionner"
          @touche="toucheArticle"
          @choisir-place="poserSurPlace"
        />
        <CadreVue
          v-model:vue="vue2"
          :autre-vue="vue1"
          :camion="camion"
          :plan="planAffiche"
          :unites="unites"
          :infos="infos"
          :etape="etapeAffichee"
          :silhouettes="silhouettes"
          :selection="selection"
          :en-evidence="enEvidence"
          :centre-gravite="centreGravite"
          :places="marquesPlaces"
          :en-deplacement="enCours?.uniteId ?? null"
          @selectionner="selectionner"
          @touche="toucheArticle"
          @choisir-place="poserSurPlace"
        />

        <Carte :titre="t.placements" :sous-titre="t.placementsSousTitre">
          <div class="tableau-defilant" tabindex="0" role="region" :aria-label="t.placements">
            <table class="tableau placements">
              <thead>
                <tr>
                  <th scope="col">{{ t.colonnes.etape }}</th>
                  <th scope="col">{{ t.colonnes.commande }}</th>
                  <th scope="col">{{ t.colonnes.article }}</th>
                  <th scope="col">{{ t.colonnes.dimensions }}</th>
                  <th scope="col" class="nombre">{{ t.colonnes.fond }}</th>
                  <th scope="col" class="nombre">{{ t.colonnes.paroi }}</th>
                  <th scope="col" class="nombre">{{ t.colonnes.plancher }}</th>
                  <th scope="col">{{ t.colonnes.orientation }}</th>
                  <th scope="col" class="nombre">{{ t.colonnes.poids }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="l in lignes"
                  :key="l.p.uniteId"
                  :class="{
                    'placements__ligne--choisie': selection.includes(l.p.uniteId),
                    'placements__ligne--en-cours': mode === 'etape' && l.p.rang === etape,
                  }"
                >
                  <td class="donnees">{{ deuxChiffres(l.p.rang) }}</td>
                  <td><CodeCommande :numero="l.info.code" :etat="etatCode(l.info)" /></td>
                  <td>
                    <button
                      type="button"
                      class="placements__article"
                      :aria-pressed="selection.includes(l.p.uniteId)"
                      @click="selectionner(l.p.uniteId)"
                    >
                      <span class="donnees placements__repere">{{ l.info.repere }}</span>
                      {{ l.info.nom }}
                    </button>
                    <span v-if="l.info.fragile" class="placements__mention">{{ t.fragile }}</span>
                    <span v-if="l.info.forme !== 'rectangulaire'" class="placements__mention">{{
                      minuscule(textes.formes[l.info.forme])
                    }}</span>
                    <span v-if="l.info.malCale" class="placements__mal-cale">
                      <Icone nom="alerte" :taille="14" />
                      {{ t.calage.mention }}
                    </span>
                  </td>
                  <td class="donnees">{{ formaterDimensions(l.dims) }}</td>
                  <td class="donnees nombre">{{ formaterMillimetres(l.p.x) }}</td>
                  <td class="donnees nombre">{{ formaterMillimetres(l.p.y) }}</td>
                  <td class="donnees nombre">{{ formaterMillimetres(l.p.z) }}</td>
                  <td>{{ textes.orientations[l.p.orientation] }}</td>
                  <td class="donnees nombre">{{ formaterPoids(l.unite.poids) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Carte>
      </div>

      <div class="plan-page__cote">
        <!-- Zone « Articles à placer » (5.7) : à côté des vues, sans défilement. -->
        <Carte ref="carteZone" :titre="t.aPlacer.titre" variante="zone" tabindex="-1" class="zone">
          <template #actions>
            <Bouton
              v-if="ajustable && aPlacer.length > 1"
              taille="petite"
              :desactive="occupe"
              @click="placer(aPlacer.map((a) => a.unite.id))"
            >
              {{ tm.toutPlacer }}
            </Bouton>
            <span class="donnees a-placer__nombre">{{ aPlacer.length }}</span>
          </template>
          <p v-if="!aPlacer.length" class="note">{{ t.aPlacer.vide }}</p>
          <template v-else>
            <ul class="a-placer">
              <li
                v-for="a in aPlacer"
                :key="a.unite.id"
                class="a-placer__article"
                @keydown="toucheZone(a.unite.id, $event)"
              >
                <CodeCommande :numero="a.code" />
                <span class="a-placer__texte">
                  {{ a.nom }} <span class="donnees a-placer__repere">{{ a.repere }}</span>
                  <span class="a-placer__detail donnees">
                    {{ formaterDimensions(a.unite.dims) }} mm · {{ mentionZone(a.unite.id) }}
                  </span>
                  <span v-if="ajustable" class="a-placer__detail">
                    {{ tm.zone.pose(enPhrase(orientationZone(a.unite.id))) }}
                  </span>
                </span>
                <span v-if="ajustable" class="a-placer__actions">
                  <Bouton
                    taille="petite"
                    icone="tourner"
                    seulement-icone
                    :libelle="tm.zone.orientation(a.repere)"
                    :desactive="occupe"
                    @click="changerOrientationZone(a.unite.id)"
                  />
                  <Bouton taille="petite" :desactive="occupe" @click="choisirPlace(a.unite.id)">
                    {{ tm.choisir
                    }}<span class="visuellement-cache">{{ tm.zone.choisirSuite(a.repere) }}</span>
                  </Bouton>
                  <Bouton taille="petite" :desactive="occupe" @click="placer([a.unite.id])">
                    {{ tm.placer
                    }}<span class="visuellement-cache">{{ tm.zone.placerSuite(a.repere) }}</span>
                  </Bouton>
                </span>
              </li>
            </ul>
            <p
              v-if="aPlacer.some((a) => mentionZone(a.unite.id) === t.aPlacer.enTrop)"
              class="note"
            >
              {{ t.aPlacer.note }}
            </p>
          </template>
        </Carte>

        <CarteEquilibre :mesure="mesure" :largeur="camion.largeur" />

        <Carte
          ref="carteSelection"
          :titre="multiple.length ? t.selectionMultiple(multiple.length) : t.selection"
          :niveau="2"
          tabindex="-1"
          class="selection"
        >
          <template v-if="multiple.length">
            <p class="note">{{ t.selectionMultipleAide }}</p>
            <ul class="multiple">
              <li v-for="m in multiple" :key="m.uniteId">
                <button type="button" class="multiple__article" @click="selectionner(m.uniteId)">
                  <CodeCommande :numero="m.info.code" />
                  <span class="donnees">{{ m.info.repere }}</span>
                  {{ m.info.nom }}
                </button>
                <template v-if="!m.visible">
                  <Bouton
                    v-if="m.proposee"
                    variante="texte"
                    taille="petite"
                    @click="montrerVue(m.proposee)"
                  >
                    {{ t.voirDansVue(t.vues[m.proposee]) }}
                  </Bouton>
                  <span v-else class="note">{{ t.cacheToutesVues }}</span>
                </template>
              </li>
            </ul>
          </template>
          <p v-else-if="!detail" class="note">{{ t.selectionVide }}</p>
          <template v-else>
            <p class="detail__titre">
              <CodeCommande :numero="detail.info.code" />
              <span class="donnees">{{ detail.info.repere }}</span>
              {{ detail.info.nom }}
            </p>
            <dl class="detail">
              <dt>{{ t.detail.commande }}</dt>
              <dd>C{{ detail.info.code }} {{ detail.info.destination }}</dd>
              <dt>{{ t.detail.etape }}</dt>
              <dd class="donnees">{{ t.etapeSur(detail.p.rang, total) }}</dd>
              <dt>{{ t.detail.dimensions }}</dt>
              <dd class="donnees">{{ formaterDimensions(detail.dims) }} mm</dd>
              <dt>{{ t.detail.position }}</dt>
              <dd class="donnees">
                {{
                  t.position(
                    formaterMillimetres(detail.p.x),
                    formaterMillimetres(detail.p.y),
                    formaterMillimetres(detail.p.z),
                  )
                }}
              </dd>
              <dt>{{ t.detail.orientation }}</dt>
              <dd>{{ textes.orientations[detail.p.orientation] }}</dd>
              <dt>{{ t.detail.poids }}</dt>
              <dd class="donnees">{{ formaterPoids(detail.unite.poids) }}</dd>
            </dl>
            <p v-if="detail.info.malCale" class="detail__mal-cale">
              <Icone nom="alerte" :taille="16" />
              {{ t.calage.mention }}
            </p>
            <p v-if="detail.info.forme !== 'rectangulaire'" class="note">
              {{ t.formeNote(minuscule(textes.formes[detail.info.forme])) }}
            </p>
            <div v-if="ajustable" class="detail__actions">
              <Bouton
                taille="petite"
                icone="tourner"
                :desactive="occupe"
                @click="changerOrientationDe(detail.p.uniteId)"
              >
                {{ tm.changerOrientation }}
              </Bouton>
              <Bouton
                taille="petite"
                icone="cible"
                :desactive="occupe"
                @click="choisirPlace(detail.p.uniteId)"
              >
                {{ tm.choisirPlace }}
              </Bouton>
              <Bouton
                taille="petite"
                :desactive="occupe"
                @click="retirerArticles([detail.p.uniteId])"
              >
                {{ tm.retirer }}
              </Bouton>
            </div>
            <Bouton taille="petite" @click="selection = []">{{ t.deselectionner }}</Bouton>
            <p class="note detail__aide">{{ ajustable ? tm.aideClavier : raisonNonAjustable }}</p>
          </template>
        </Carte>

        <Carte :titre="t.ordre" :sous-titre="t.ordreSousTitre">
          <ol class="ordre">
            <li v-for="l in lignes" :key="l.p.uniteId">
              <button
                type="button"
                class="ordre__bouton"
                :class="{
                  'ordre__bouton--en-cours': mode === 'etape' && l.p.rang === etape,
                  'ordre__bouton--doux': etatCode(l.info) !== 'normal',
                }"
                :aria-current="mode === 'etape' && l.p.rang === etape ? 'step' : undefined"
                :aria-pressed="selection.includes(l.p.uniteId)"
                @click="choisirDansOrdre(l.p.uniteId, l.p.rang)"
              >
                <span class="donnees ordre__rang">{{ deuxChiffres(l.p.rang) }}</span>
                <CodeCommande :numero="l.info.code" :etat="etatCode(l.info)" />
                <span class="ordre__nom">{{ l.info.nom }}</span>
                <span class="donnees ordre__repere">{{ l.info.repere }}</span>
              </button>
            </li>
          </ol>
        </Carte>
      </div>
    </div>
  </div>

  <ConfirmationDialog
    :ouvert="commandeAReporter !== null"
    :titre="commandeAReporter ? t.depassement.confirmation.titre(commandeAReporter.code) : ''"
    :consequence="consequenceReport"
    :libelle-action="t.depassement.confirmation.action"
    ton="neutre"
    @confirmer="reporterCommande"
    @annuler="commandeAReporter = null"
  />

  <!-- Relancer le calcul d'un plan ajusté à la main (RG-22, décision 5). -->
  <ConfirmationDialog
    :ouvert="relanceAConfirmer"
    :titre="tm.confirmationRelance.titre"
    :consequence="versionPlan ? tm.confirmationRelance.consequence(versionPlan.version) : ''"
    :libelle-action="tm.confirmationRelance.action"
    ton="neutre"
    @confirmer="confirmerRelance"
    @annuler="relanceAConfirmer = false"
  />
</template>

<style scoped>
.etat {
  font: var(--typo-interface);
  color: var(--texte-doux);
}

.plan-page {
  display: grid;
  gap: var(--espace-4);
}

.plan-page__statut {
  margin-left: var(--espace-3);
  vertical-align: middle;
}

/* --- Barre d'affichage --- */
.barre {
  display: grid;
  gap: var(--espace-3);
  padding: var(--espace-3) var(--espace-5);
  background: var(--surface);
  border: 1px solid var(--bordure);
  border-radius: var(--rayon-carte);
}

.barre__ligne {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espace-3) var(--espace-5);
  align-items: center;
}

.barre__etapes {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--espace-2) var(--espace-3);
  align-items: center;
}

.barre__compteur {
  min-width: calc(var(--espace-7) * 3);
  text-align: center;
}

.barre__curseur input {
  width: calc(var(--espace-7) * 5);
  min-height: var(--cible-mini);
  margin: 0;
  accent-color: var(--action);
}

.barre__titre {
  font: var(--typo-legende);
  color: var(--texte-doux);
}

.legende {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espace-2);
  padding: 0;
  margin: 0;
  list-style: none;
}

.legende__bouton {
  display: inline-flex;
  gap: var(--espace-2);
  align-items: center;
  min-height: var(--cible-compacte);
  padding: 0 var(--espace-3) 0 var(--espace-2);
  font: var(--typo-interface);
  color: var(--encre);
  cursor: pointer;
  background: var(--surface);
  border: 1px solid var(--bordure-controle);
  border-radius: var(--rayon-controle);
}

.legende__bouton:hover {
  background: var(--surface-survol);
}

.legende__bouton[aria-pressed='true'] {
  background: var(--info-fond);
  border-color: var(--action);
}

.legende__detail {
  font: var(--typo-legende);
  color: var(--texte-doux);
}

/* --- Barre : ajustement --- */
.barre__ligne--ajustement {
  justify-content: space-between;
}

.barre__aimantation {
  display: inline-flex;
  gap: var(--espace-3);
  align-items: center;
}

.barre__pas {
  font: var(--typo-repere);
  color: var(--texte-doux);
}

.barre__note {
  margin: 0;
  font: var(--typo-interface);
  color: var(--texte-doux);
}

/* --- Déplacement au clavier : l'état s'écrit et s'illustre, jamais par la couleur seule --- */
.en-cours__etat {
  display: inline-flex;
  gap: var(--espace-1);
  align-items: baseline;
}

.en-cours__etat--refusee {
  color: var(--alerte-texte);
}

/* --- Bandeaux de calage et de dépassement --- */
.bandeau__regle {
  margin-left: var(--espace-2);
  font: var(--typo-repere);
  color: var(--texte-doux);
}

.depassement__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espace-2);
}

/* Dépassement : les boutons passent sous le message (capture 04b). */
.bandeau-depassement {
  flex-wrap: wrap;
}

.bandeau-depassement :deep(.bandeau__actions) {
  flex-basis: 100%;
  padding-left: calc(var(--espace-5) + var(--espace-3));
}

/* --- Grille : vues et tableau à gauche, panneau à droite --- */
.plan-page__grille {
  display: grid;
  grid-template-columns: minmax(0, 1fr) calc(var(--espace-7) * 11);
  gap: var(--espace-5);
  align-items: start;
}

.plan-page__principal,
.plan-page__cote {
  display: grid;
  gap: var(--espace-4);
  min-width: 0;
}

@media (width <= 1100px) {
  .plan-page__grille {
    grid-template-columns: minmax(0, 1fr);
  }
}

.note {
  margin: 0 0 var(--espace-3);
  font: var(--typo-interface);
  color: var(--texte-doux);
}

/* --- Zone « Articles à placer » --- */
.a-placer__nombre {
  font: var(--typo-repere);
  color: var(--texte-doux);
}

.a-placer {
  display: grid;
  gap: var(--espace-2);
  padding: 0;
  margin: 0 0 var(--espace-3);
  list-style: none;
}

.zone:focus-visible {
  outline: var(--focus) solid var(--action);
  outline-offset: var(--focus);
}

.a-placer__article {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espace-2);
  align-items: flex-start;
  padding: var(--espace-2) var(--espace-3);
  font: var(--typo-interface);
  color: var(--encre);
  border: 1px solid var(--alerte-bordure);
  border-radius: var(--rayon-controle);
}

.a-placer__repere,
.a-placer__detail {
  font: var(--typo-repere);
  color: var(--texte-doux);
}

.a-placer__detail {
  display: block;
}

.a-placer__texte {
  flex: 1;
  min-width: 0;
}

.a-placer__actions {
  display: flex;
  flex-basis: 100%;
  flex-wrap: wrap;
  gap: var(--espace-1);
  justify-content: flex-end;
}

/* --- Tableau des placements --- */
.tableau-defilant {
  overflow-x: auto;
}

.placements__ligne--choisie td,
.placements__ligne--en-cours td {
  background: var(--info-fond);
}

.placements__article {
  padding: 0;
  font: var(--typo-interface);
  color: var(--action);
  text-align: left;
  cursor: pointer;
  background: none;
  border: 0;
}

.placements__article:hover {
  color: var(--action-fonce);
  text-decoration: underline;
}

.placements__repere {
  margin-right: var(--espace-1);
  color: var(--texte-doux);
}

.placements__mention {
  margin-left: var(--espace-2);
  font: var(--typo-legende);
  color: var(--texte-doux);
}

.placements__mal-cale,
.detail__mal-cale {
  display: inline-flex;
  gap: var(--espace-1);
  align-items: center;
  margin-left: var(--espace-2);
  font: var(--typo-legende);
  font-weight: 600;
  color: var(--alerte-texte);
}

.detail__mal-cale {
  margin: 0 0 var(--espace-3);
}

.detail__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espace-2);
  margin-bottom: var(--espace-3);
}

.detail__aide {
  margin-top: var(--espace-3);
}

/* --- Article sélectionné --- */
.selection:focus-visible {
  outline: var(--focus) solid var(--action);
  outline-offset: var(--focus);
}

.multiple {
  display: grid;
  gap: var(--espace-1);
  padding: 0;
  margin: 0;
  list-style: none;
}

.multiple__article {
  display: inline-flex;
  gap: var(--espace-2);
  align-items: center;
  min-height: var(--cible-compacte);
  padding: 0;
  font: var(--typo-interface);
  color: var(--action);
  text-align: left;
  cursor: pointer;
  background: none;
  border: 0;
}

.multiple__article:hover {
  color: var(--action-fonce);
  text-decoration: underline;
}

.detail__titre {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espace-2);
  align-items: center;
  margin: 0 0 var(--espace-3);
  font: var(--typo-titre-article);
  color: var(--encre);
}

.detail {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--espace-1) var(--espace-3);
  margin: 0 0 var(--espace-3);
  font: var(--typo-interface);
}

.detail dt {
  color: var(--texte-doux);
}

.detail dd {
  margin: 0;
}

/* --- Ordre de chargement --- */
.ordre {
  display: grid;
  padding: 0;
  margin: 0;
  list-style: none;
}

.ordre__bouton {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  gap: var(--espace-3);
  align-items: center;
  width: 100%;
  min-height: var(--cible-compacte);
  padding: var(--espace-1) var(--espace-2);
  font: var(--typo-interface);
  color: var(--encre);
  text-align: left;
  cursor: pointer;
  background: none;
  border: 0;
  border-radius: var(--rayon-controle);
}

.ordre__bouton:hover {
  background: var(--surface-survol);
}

.ordre__bouton[aria-pressed='true'],
.ordre__bouton--en-cours {
  background: var(--info-fond);
}

.ordre__bouton--en-cours .ordre__nom {
  font-weight: 600;
}

.ordre__bouton--doux .ordre__nom {
  color: var(--texte-doux);
}

.ordre__rang,
.ordre__repere {
  color: var(--texte-doux);
}
</style>
