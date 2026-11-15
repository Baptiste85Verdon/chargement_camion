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
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { diagnostiquerCalage } from '@/domaine/calage'
import { decrireEtape, repereArticle } from '@/domaine/contenu-vue'
import { encombrement } from '@/domaine/encombrement'
import { mesurerEquilibre, type MesureEquilibre } from '@/domaine/equilibre'
import type { FicheArticle, ModeleCamion, PlanChargement, Tournee } from '@/domaine/modele'
import { type Vue, vuesOuVisible } from '@/domaine/projection'
import { lignesReportees, lirePlan, regrouperParLigne } from '@/domaine/tournee'
import type { CommandeAvecLignes, PlanAvecPlacements } from '@/donnees/depots'
import { ErreurDonnees } from '@/donnees/erreurs'
import { useAnnonces } from '@/stores/annonces'
import { useAttente } from '@/stores/attente'
import { calculerEtEnregistrer } from '@/stores/calcul'
import { utiliserDepots } from '@/stores/depots'
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

/** Échap quitte la sélection multiple. */
function echap(evenement: KeyboardEvent) {
  if (evenement.key === 'Escape' && selection.value.length > 1) selection.value = []
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
  document.addEventListener('keydown', echap)
  document.addEventListener('pointerdown', clicAilleurs)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', echap)
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
        @click="relancer"
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

  <div v-else class="plan-page">
    <Bandeau v-if="erreurAction" ton="alerte">{{ erreurAction }}</Bandeau>

    <Bandeau v-if="versionPlan.aRecalculer" ton="alerte" :titre="t.aRecalculer">
      {{ t.aRecalculerAide }}
      <template v-if="modifiable" #actions>
        <Bouton variante="principal" :desactive="occupe" @click="relancer">
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
          :plan="placements"
          :unites="unites"
          :infos="infos"
          :etape="etapeAffichee"
          :silhouettes="silhouettes"
          :selection="selection"
          :en-evidence="enEvidence"
          :centre-gravite="centreGravite"
          @selectionner="selectionner"
        />
        <CadreVue
          v-model:vue="vue2"
          :autre-vue="vue1"
          :camion="camion"
          :plan="placements"
          :unites="unites"
          :infos="infos"
          :etape="etapeAffichee"
          :silhouettes="silhouettes"
          :selection="selection"
          :en-evidence="enEvidence"
          :centre-gravite="centreGravite"
          @selectionner="selectionner"
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
        <Carte :titre="t.aPlacer.titre" variante="zone">
          <template #actions>
            <span class="donnees a-placer__nombre">{{ aPlacer.length }}</span>
          </template>
          <p v-if="!aPlacer.length" class="note">{{ t.aPlacer.vide }}</p>
          <template v-else>
            <ul class="a-placer">
              <li v-for="a in aPlacer" :key="a.unite.id" class="a-placer__article">
                <CodeCommande :numero="a.code" />
                <span>
                  {{ a.nom }} <span class="donnees a-placer__repere">{{ a.repere }}</span>
                  <span class="a-placer__detail donnees">
                    {{ formaterDimensions(a.unite.dims) }} mm · {{ t.aPlacer.enTrop }}
                  </span>
                </span>
              </li>
            </ul>
            <p class="note">{{ t.aPlacer.note }}</p>
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
            <Bouton taille="petite" @click="selection = []">{{ t.deselectionner }}</Bouton>
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
    :consequence="
      commandeAReporter ? t.depassement.confirmation.consequence(commandeAReporter.code) : ''
    "
    :libelle-action="t.depassement.confirmation.action"
    ton="neutre"
    @confirmer="reporterCommande"
    @annuler="commandeAReporter = null"
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

.a-placer__article {
  display: flex;
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
