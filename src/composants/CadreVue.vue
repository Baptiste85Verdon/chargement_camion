<script setup lang="ts">
/**
 * Un cadre de vue du plan (cahier technique 5.1, 5.8, 5.10, 5.11).
 *
 * - En-tête : titre et sous-titre de la vue, mini-pictogramme du point de vue.
 * - Barre d'outils : filtre de profondeur, zoom (Zoom −, valeur, Zoom +,
 *   Ajuster), sélecteur de vue. La vue de l'autre cadre est indisponible ici.
 * - Bandeau « Filtre de profondeur actif » avec « Tout afficher ».
 * - La scène (`ScenePlan`).
 * - Bandeau des articles cachés, avec leur liste et, pour chacun, une vue où
 *   il est visible.
 *
 * Le cadre garde ses propres réglages (zoom, tranche) ; ils repartent de
 * zéro quand on change de vue.
 */
import { computed, ref, useId, watch } from 'vue'
import { composerVue, profondeurVue, type Tranche } from '@/domaine/contenu-vue'
import { type Vue, VUES, dimensionsVue, vuesOuVisible } from '@/domaine/projection'
import type { Camion, Placement, Unite } from '@/domaine/types'
import { textes } from '@/textes/fr'
import Bandeau from './Bandeau.vue'
import Bouton from './Bouton.vue'
import Carte from './Carte.vue'
import FiltreProfondeur from './FiltreProfondeur.vue'
import PictoVue from './PictoVue.vue'
import ScenePlan from './ScenePlan.vue'
import Selecteur from './Selecteur.vue'
import { type Cadrage, ZOOM_MAX, cadrer, centreDe, zoomDe, zoomSuivant } from './cadrage'
import { formaterMillimetres, formaterPourcentage } from './format'
import type { InfoArticle } from './info-article'

const props = defineProps<{
  camion: Camion
  plan: Placement[]
  unites: Unite[]
  infos: Map<string, InfoArticle>
  /** Vue affichée dans l'autre cadre : indisponible ici. */
  autreVue: Vue
  /** Étape affichée en vue par étape ; absente : plan complet. */
  etape: number | null
  silhouettes: boolean
  selection: readonly string[]
  centreGravite?: { x: number; y: number } | null
  enEvidence: number | null
}>()

const vue = defineModel<Vue>('vue', { required: true })
const emit = defineEmits<{ selectionner: [uniteId: string] }>()

const t = textes.plan
const idListe = useId()

// --- Zoom (5.11) ----------------------------------------------------------------

const taille = computed(() => dimensionsVue(props.camion, vue.value))
const cadrage = ref<Cadrage>(cadrer(taille.value, 1))
const zoom = computed(() => zoomDe(cadrage.value, taille.value))

function zoomer(sens: 1 | -1) {
  cadrage.value = cadrer(taille.value, zoomSuivant(zoom.value, sens), centreDe(cadrage.value))
}

function ajuster() {
  cadrage.value = cadrer(taille.value, 1)
}

// --- Filtre de profondeur (5.10) -----------------------------------------------

const profondeurMax = computed(() => profondeurVue(props.camion, vue.value))
const tranche = ref<Tranche>({ debut: 0, fin: profondeurMax.value })
const filtreActif = computed(
  () => tranche.value.debut > 0 || tranche.value.fin < profondeurMax.value,
)

function toutAfficher() {
  tranche.value = { debut: 0, fin: profondeurMax.value }
}

watch([vue, () => props.camion], () => {
  ajuster()
  toutAfficher()
  listeOuverte.value = false
})

// --- Contenu ------------------------------------------------------------------

const contenu = computed(() =>
  composerVue(props.plan, props.unites, props.camion, vue.value, {
    etape: props.etape,
    silhouettes: props.silhouettes,
    tranche: filtreActif.value ? tranche.value : null,
  }),
)

const options = computed(() =>
  VUES.map((v) => ({
    valeur: v,
    libelle: t.vues[v],
    desactive: v === props.autreVue,
    description: v === props.autreVue ? t.dejaAffichee(t.vues[v]) : undefined,
  })),
)

const vueChoisie = computed({
  get: () => vue.value as string,
  set: (v: string) => {
    const choisie = VUES.find((x) => x === v)
    if (choisie) vue.value = choisie
  },
})

// --- Articles cachés (5.10) -------------------------------------------------------

const listeOuverte = ref(false)

/** Le plan tel qu'il est montré : en vue par étape, sans les étapes à venir. */
const planMontre = computed(() =>
  props.etape === null ? props.plan : props.plan.filter((p) => p.rang <= (props.etape ?? 0)),
)

const caches = computed(() =>
  contenu.value.caches.map((uniteId) => {
    const info = props.infos.get(uniteId)
    const ailleurs = vuesOuVisible(uniteId, planMontre.value, props.unites, props.camion).filter(
      (v) => v !== vue.value,
    )
    return {
      uniteId,
      libelle: info ? `${info.repere} (C${info.code})` : uniteId,
      nom: info?.nom ?? '',
      proposee: ailleurs.find((v) => v !== props.autreVue) ?? null,
      autreCadre: ailleurs.includes(props.autreVue),
    }
  }),
)

function voirDans(v: Vue, uniteId: string) {
  vue.value = v
  emit('selectionner', uniteId)
}

const mm = (v: number) => formaterMillimetres(v)
</script>

<template>
  <Carte class="cadre" :titre="t.titresVues[vue]" :sous-titre="t.sousTitresVues[vue]">
    <template #actions>
      <PictoVue :vue="vue" />
    </template>

    <div class="cadre__outils">
      <FiltreProfondeur v-model="tranche" :max="profondeurMax" :depuis="t.depuis[vue]" />
      <div class="cadre__zoom" role="group" :aria-label="t.zoomActuel">
        <Bouton
          taille="petite"
          icone="moins"
          seulement-icone
          :libelle="t.zoomMoins"
          :desactive="zoom <= 1.0001"
          @click="zoomer(-1)"
        />
        <output class="cadre__zoom-valeur">{{ formaterPourcentage(zoom) }}</output>
        <Bouton
          taille="petite"
          icone="plus"
          seulement-icone
          :libelle="t.zoomPlus"
          :desactive="zoom >= ZOOM_MAX"
          @click="zoomer(1)"
        />
        <Bouton taille="petite" icone="ajuster" :desactive="zoom <= 1.0001" @click="ajuster">
          {{ t.ajuster }}
        </Bouton>
      </div>
      <Selecteur v-model="vueChoisie" :legende="t.choixVue" :options="options" />
    </div>

    <Bandeau v-if="filtreActif" ton="info" :titre="t.filtreActif" class="cadre__bandeau">
      {{
        t.filtreDetail(mm(tranche.debut), mm(tranche.fin), t.depuis[vue], contenu.masquesParFiltre)
      }}
      <template #actions>
        <Bouton taille="petite" @click="toutAfficher">{{ t.toutAfficher }}</Bouton>
      </template>
    </Bandeau>

    <ScenePlan
      v-model:cadrage="cadrage"
      :camion="props.camion"
      :vue="vue"
      :contenu="contenu"
      :plan="props.plan"
      :unites="props.unites"
      :infos="props.infos"
      :selection="props.selection"
      :centre-gravite="props.centreGravite"
      :en-evidence="props.enEvidence"
      :filtre-actif="filtreActif"
      :titre="t.titresVues[vue]"
      @selectionner="emit('selectionner', $event)"
    />

    <div v-if="caches.length" class="cadre__caches">
      <Bandeau ton="alerte" :titre="t.caches(caches.length)">
        <span class="cadre__liste-courte">{{ caches.map((c) => c.libelle).join(' · ') }}</span>
        <template #actions>
          <Bouton
            taille="petite"
            :aria-expanded="listeOuverte"
            :aria-controls="idListe"
            @click="listeOuverte = !listeOuverte"
          >
            {{ listeOuverte ? t.masquerCaches : t.voirCaches }}
          </Bouton>
        </template>
      </Bandeau>
      <ul v-show="listeOuverte" :id="idListe" class="cadre__liste">
        <li v-for="c in caches" :key="c.uniteId" class="cadre__cache">
          <span class="cadre__cache-nom">
            <span class="donnees">{{ c.libelle }}</span> {{ c.nom }}
          </span>
          <Bouton v-if="c.proposee" taille="petite" @click="voirDans(c.proposee, c.uniteId)">
            {{ t.voirDansVue(t.vues[c.proposee]) }}
          </Bouton>
          <span v-else-if="c.autreCadre" class="cadre__note">
            {{ t.visibleAutreCadre(t.vues[props.autreVue]) }}
          </span>
          <span v-else class="cadre__note">{{ t.cacheToutesVues }}</span>
        </li>
      </ul>
    </div>
  </Carte>
</template>

<style scoped>
.cadre {
  min-width: 0;
}

.cadre__outils {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espace-3) var(--espace-5);
  align-items: center;
  padding-bottom: var(--espace-3);
  margin-bottom: var(--espace-4);
  border-bottom: 1px solid var(--bordure);
}

.cadre__zoom {
  display: inline-flex;
  gap: var(--espace-1);
  align-items: center;
}

.cadre__zoom-valeur {
  min-width: calc(var(--espace-7) + var(--espace-3));
  font: var(--typo-donnees);
  color: var(--texte-fort);
  text-align: center;
}

.cadre__bandeau {
  margin-bottom: var(--espace-3);
}

.cadre__caches {
  margin-top: var(--espace-4);
}

.cadre__liste-courte {
  font: var(--typo-donnees);
}

.cadre__liste {
  display: grid;
  gap: var(--espace-2);
  padding: var(--espace-3) 0 0;
  margin: 0;
  list-style: none;
}

.cadre__cache {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espace-2) var(--espace-4);
  align-items: center;
  justify-content: space-between;
}

.cadre__cache-nom {
  font: var(--typo-interface);
}

.cadre__note {
  font: var(--typo-legende);
  color: var(--texte-doux);
}
</style>
