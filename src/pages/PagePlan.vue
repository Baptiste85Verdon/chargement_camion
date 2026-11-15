<script setup lang="ts">
/**
 * Plan de chargement d'une tournée, en lecture (captures 04, 04c, 04d, 04e ;
 * cahier fonctionnel 4.4 ; cahier technique 5).
 *
 * La page lit le dernier plan enregistré et le montre :
 * - une barre d'affichage : plan complet ou par étape (5.9), légende des
 *   commandes qui en met une en évidence (5.12) ;
 * - deux cadres de vue, Dessus et Gauche par défaut (5.8) ;
 * - le tableau des placements, alternative textuelle des vues ;
 * - à droite, l'article sélectionné et l'ordre de chargement.
 *
 * Tout se déduit des placements : le rang de chargement donne le repère
 * (A07), l'étape et l'ordre. La sélection, la commande mise en évidence et
 * l'étape valent pour toute la page.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { decrireEtape, repereArticle } from '@/domaine/contenu-vue'
import { encombrement } from '@/domaine/encombrement'
import type { FicheArticle, ModeleCamion, PlanChargement, Tournee } from '@/domaine/modele'
import type { Vue } from '@/domaine/projection'
import { lirePlan } from '@/domaine/tournee'
import type { CommandeAvecLignes, PlanAvecPlacements } from '@/donnees/depots'
import { ErreurDonnees } from '@/donnees/erreurs'
import { useAnnonces } from '@/stores/annonces'
import { utiliserDepots } from '@/stores/depots'
import { textes } from '@/textes/fr'
import Annonce from '@/composants/Annonce.vue'
import Badge from '@/composants/Badge.vue'
import Bandeau from '@/composants/Bandeau.vue'
import Bouton from '@/composants/Bouton.vue'
import CadreVue from '@/composants/CadreVue.vue'
import Carte from '@/composants/Carte.vue'
import CaseACocher from '@/composants/CaseACocher.vue'
import CodeCommande from '@/composants/CodeCommande.vue'
import EntetePage from '@/composants/EntetePage.vue'
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

// --- Données ------------------------------------------------------------------

const chargement = ref(true)
const erreurChargement = ref('')
const tournee = ref<Tournee | null>(null)
const camion = ref<ModeleCamion | null>(null)
const articles = ref<FicheArticle[]>([])
const commandes = ref<CommandeAvecLignes[]>([])
const enregistre = ref<PlanAvecPlacements | null>(null)
const annonce = ref('')

onMounted(async () => {
  try {
    const [tr, catalogue, cmds, plan] = await Promise.all([
      depots.tournees.obtenir(props.id),
      // Avec les archivés : un plan garde ses articles archivés (RG-21).
      depots.articles.lister({ avecArchives: true }),
      depots.commandes.listerParTournee(props.id),
      depots.plans.obtenirDernier(props.id),
    ])
    if (!tr) {
      erreurChargement.value = t.introuvable
      return
    }
    tournee.value = tr
    articles.value = catalogue
    commandes.value = cmds
    enregistre.value = plan
    camion.value = tr.modeleCamionId ? await depots.camions.obtenir(tr.modeleCamionId) : null
    annonce.value = annonces.reprendre()
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
    ? lirePlan(commandes.value, articles.value, enregistre.value.placements)
    : { unites: [], placements: [], aPlacer: [] },
)
const placements = computed(() => lecture.value.placements)
const unites = computed(() => lecture.value.unites)

/** Ce que l'interface affiche de chaque article placé. */
const infos = computed(() => {
  const ligneVersArticle = new Map(
    commandes.value.flatMap((c) => c.lignes.map((l) => [l.id, l.articleId] as const)),
  )
  const parArticle = new Map(articles.value.map((a) => [a.id, a]))
  const parCommande = new Map(commandes.value.map((c) => [c.commande.id, c.commande]))
  const parUnite = new Map(unites.value.map((u) => [u.id, u]))
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

const selection = ref<string | null>(null)
const message = ref('')

function selectionner(uniteId: string) {
  if (selection.value === uniteId) {
    selection.value = null
    return
  }
  selection.value = uniteId
  const info = infos.value.get(uniteId)
  if (info) message.value = t.articleSelectionne(info.repere, info.nom)
}

/** Depuis l'ordre de chargement : sélectionne, et en vue par étape, va à l'étape. */
function choisirDansOrdre(uniteId: string, rang: number) {
  if (mode.value === 'etape') allerA(rang)
  if (selection.value !== uniteId) selectionner(uniteId)
}

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
    articles: lignes.reduce((n, l) => n + l.quantite, 0),
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

const detail = computed(() => lignes.value.find((l) => l.p.uniteId === selection.value) ?? null)

const deuxChiffres = (n: number) => String(n).padStart(2, '0')
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
    <Bandeau v-if="versionPlan.aRecalculer" ton="alerte" :titre="t.aRecalculer">
      {{ t.aRecalculerAide }}
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
                    'placements__ligne--choisie': l.p.uniteId === selection,
                    'placements__ligne--en-cours': mode === 'etape' && l.p.rang === etape,
                  }"
                >
                  <td class="donnees">{{ deuxChiffres(l.p.rang) }}</td>
                  <td><CodeCommande :numero="l.info.code" :etat="etatCode(l.info)" /></td>
                  <td>
                    <button
                      type="button"
                      class="placements__article"
                      :aria-pressed="l.p.uniteId === selection"
                      @click="selectionner(l.p.uniteId)"
                    >
                      <span class="donnees placements__repere">{{ l.info.repere }}</span>
                      {{ l.info.nom }}
                    </button>
                    <span v-if="l.info.fragile" class="placements__mention">{{ t.fragile }}</span>
                    <span v-if="l.info.forme !== 'rectangulaire'" class="placements__mention">{{
                      minuscule(textes.formes[l.info.forme])
                    }}</span>
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
        <Carte :titre="t.selection" :niveau="2">
          <p v-if="!detail" class="note">{{ t.selectionVide }}</p>
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
            <p v-if="detail.info.forme !== 'rectangulaire'" class="note">
              {{ t.formeNote(minuscule(textes.formes[detail.info.forme])) }}
            </p>
            <Bouton taille="petite" @click="selection = null">{{ t.deselectionner }}</Bouton>
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
                :aria-pressed="l.p.uniteId === selection"
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

/* --- Article sélectionné --- */
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
