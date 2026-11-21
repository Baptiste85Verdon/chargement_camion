<script setup lang="ts">
/**
 * Scène d'une vue du plan (cahier technique 5.1, 5.8 à 5.14).
 *
 * Deux couches superposées, alignées sur le même cadrage :
 * 1. Le dessin, un SVG dont le `viewBox` est le cadrage, en millimètres :
 *    caisse, quadrillage de 1 m, blocs des articles, plancher. Le navigateur
 *    gère l'échelle ; les contours gardent leur épaisseur en pixels
 *    (`vector-effect: non-scaling-stroke`).
 * 2. Le calque de libellés, en HTML : codes de commande, anneau de
 *    sélection, étiquette « Étape n », cotes de l'article sélectionné, et un
 *    bouton transparent par article visible. Chaque élément est placé en
 *    pourcentage du cadrage : il suit le zoom en position, mais garde sa
 *    taille en pixels, donc reste lisible.
 *
 * Les repères (Fond, Portes, parois) et les cotes de la caisse sont autour
 * du dessin. Le zoom vient du cadre (`v-model:cadrage`) ; la scène gère le
 * déplacement de la zone visible (glisser le fond, flèches du clavier) et le
 * zoom à la molette avec Ctrl (aussi le pincement d'un pavé tactile), ou au
 * pincement à deux doigts sur tablette.
 */
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import {
  type BlocVue,
  type ContenuVue,
  decrireEtape,
  recouvrants,
  situer,
  zoneVisible,
} from '@/domaine/contenu-vue'
import { type Cote, coter, coterCaisse } from '@/domaine/cotes'
import { libellesTraverses, ordonneeLibre } from '@/composants/evitement'
import { trouverUnite } from '@/domaine/geometrie'
import type { Pose } from '@/domaine/ajustement'
import { type Vue, dimensionsVue, projeter } from '@/domaine/projection'
import type { Camion, Placement, Unite } from '@/domaine/types'
import { textes } from '@/textes/fr'
import Icone from './Icone.vue'
import LigneCote from './LigneCote.vue'
import { type Cadrage, centreDe, deplacerCadrage, pincer, zoomAutour, zoomDe } from './cadrage'
import { formaterMillimetres } from './format'
import type { InfoArticle } from './info-article'
import { teinteCommande } from './teinte-commande'

const props = defineProps<{
  camion: Camion
  vue: Vue
  contenu: ContenuVue
  /** Plan et unités complets : pour les cotes de l'article sélectionné. */
  plan: Placement[]
  unites: Unite[]
  infos: Map<string, InfoArticle>
  /** Articles sélectionnés : un seul, ou plusieurs (« Voir » du bandeau de calage, 5.16). */
  selection: readonly string[]
  /** Numéro de la commande mise en évidence (5.12), ou rien. */
  enEvidence: number | null
  filtreActif: boolean
  /** Titre du cadre, pour les noms accessibles. */
  titre: string
  /**
   * Centre de gravité de la charge au départ, en mm (x depuis le fond, y depuis
   * la paroi gauche). Dessiné sur la vue de dessus seulement (5.17).
   */
  centreGravite?: { x: number; y: number } | null
  /**
   * Places proposées par « Choisir une place » (5.3, capture 04h) : une
   * marque « + » au centre de l'article posé à chacune.
   */
  places?: readonly { uniteId: string; pose: Pose; libelle: string }[]
  /**
   * Article déplacé au clavier (5.3) : son bouton reste présent même s'il
   * passe derrière un autre article, pour garder le focus et les flèches.
   */
  enDeplacement?: string | null
}>()

const cadrage = defineModel<Cadrage>('cadrage', { required: true })
const emit = defineEmits<{
  selectionner: [uniteId: string]
  /** Une touche pressée sur un article : flèches, Entrée, R, Suppr (5.3, 5.5). */
  touche: [uniteId: string, evenement: KeyboardEvent]
  /** Une marque « + » choisie : son rang dans `places`. */
  choisirPlace: [rang: number]
}>()

const t = textes.plan
const id = useId()
const metres = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const taille = computed(() => dimensionsVue(props.camion, props.vue))
const zoom = computed(() => zoomDe(cadrage.value, taille.value))
const zoomee = computed(() => zoom.value > 1.0001)

// --- Échelle : pixels par millimètre ------------------------------------------
// Mesurée sur la toile ; elle sert aux décisions en pixels (code dans le bloc
// ou à côté, coins de 3 px, contour intérieur).

const toile = ref<HTMLElement | null>(null)
const largeurPx = ref(800)
let observateur: ResizeObserver | null = null

onMounted(() => {
  if (!toile.value) return
  largeurPx.value = toile.value.clientWidth || largeurPx.value
  if (typeof ResizeObserver === 'undefined') return
  observateur = new ResizeObserver(([entree]) => {
    if (entree && entree.contentRect.width > 0) largeurPx.value = entree.contentRect.width
  })
  observateur.observe(toile.value)
})
onBeforeUnmount(() => observateur?.disconnect())

const echelle = computed(() => largeurPx.value / cadrage.value.largeur)
const enMm = (px: number) => px / echelle.value

// --- Positions du calque, en pourcentage du cadrage --------------------------

const pctX = (x: number) => `${((x - cadrage.value.x) / cadrage.value.largeur) * 100}%`
const pctY = (y: number) => `${((y - cadrage.value.y) / cadrage.value.hauteur) * 100}%`
const pctL = (l: number) => `${(l / cadrage.value.largeur) * 100}%`
const pctH = (h: number) => `${(h / cadrage.value.hauteur) * 100}%`

// --- Blocs ----------------------------------------------------------------------

const SEUIL_CODE_PX = 24
const SEUIL_REPERE_PX = 40

/** Survol ou focus : ceux qui recouvrent cet article deviennent transparents (5.10). */
const survol = ref<string | null>(null)
const transparents = computed(
  () => new Set(survol.value ? recouvrants(survol.value, props.contenu.blocs) : []),
)

const info = (b: BlocVue) => props.infos.get(b.uniteId)
const attenue = (b: BlocVue) =>
  props.enEvidence !== null && b.etat !== 'silhouette' && info(b)?.code !== props.enEvidence

/** Épaisseur du contour, en px (charte, « États d'un article »). */
function epaisseur(b: BlocVue): number {
  if (b.etat === 'enCours') return 4
  if (b.etat === 'silhouette' || attenue(b)) return 2
  return 3
}

/**
 * Rectangle dessiné, rentré d'une demi-épaisseur de contour : le contour
 * tient ainsi à l'intérieur du bloc, sans déborder sur le voisin.
 */
function dessine(b: BlocVue) {
  const retrait = Math.min(enMm(epaisseur(b) / 2), b.rect.largeur / 4, b.rect.hauteur / 4)
  return {
    x: b.rect.x + retrait,
    y: b.rect.y + retrait,
    width: b.rect.largeur - 2 * retrait,
    height: b.rect.hauteur - 2 * retrait,
  }
}

function classesBloc(b: BlocVue) {
  const code = info(b)?.code ?? 1
  return [
    'bloc',
    `bloc--t${teinteCommande(code).teinte}`,
    {
      'bloc--attenue': attenue(b),
      'bloc--silhouette': b.etat === 'silhouette',
      'bloc--en-cours': b.etat === 'enCours',
    },
  ]
}

const hachure = (b: BlocVue) =>
  b.etat !== 'silhouette' && !attenue(b) && teinteCommande(info(b)?.code ?? 1).hachure

const rayon = computed(() => enMm(3))
/** Pas des rayures C7 à C12, en mm : 8 px à l'écran. */
const pasHachure = computed(() => enMm(8))

/** Articles visibles : ni cachés, ni silhouettes recouvertes par les articles affichés. */
/**
 * Partie visible de chaque bloc (`zoneVisible`) : rien pour un article
 * caché, ni pour une silhouette recouverte par les articles affichés ou par
 * des silhouettes plus proches.
 */
const zones = computed(
  () =>
    new Map(
      props.contenu.blocs.map((b) => [b.uniteId, zoneVisible(b.uniteId, props.contenu.blocs)]),
    ),
)
const visibles = computed(() =>
  props.contenu.blocs.filter(
    (b) => zones.value.get(b.uniteId) || b.uniteId === props.enDeplacement,
  ),
)

/** Centre de chaque place proposée dans cette vue, en mm du `viewBox`. */
const marques = computed(() =>
  (props.places ?? []).map((place) => {
    const { rect } = projeter(
      { uniteId: place.uniteId, ...place.pose, rang: 0 },
      trouverUnite(place.uniteId, props.unites),
      props.camion,
      props.vue,
    )
    return {
      libelle: place.libelle,
      x: rect.x + rect.largeur / 2,
      y: rect.y + rect.hauteur / 2,
    }
  }),
)

const minuscule = (texte: string) => texte.charAt(0).toLocaleLowerCase('fr') + texte.slice(1)

/**
 * Ce que le nom accessible dit de la pose et de la place de chaque article
 * (cahier technique 6) : orientation, position approximative dans la caisse
 * (`situer`), et ce sur quoi il repose (`decrireEtape`).
 */
const poses = computed(() => {
  const poses = new Map<string, { orientation: string; situation: string; support: string }>()
  for (const p of props.plan) {
    const unite = props.unites.find((u) => u.id === p.uniteId)
    if (!unite) continue
    const s = situer(p, unite, props.camion)
    const { poseSur } = decrireEtape(p, props.plan, props.unites, props.camion)
    poses.set(p.uniteId, {
      orientation: minuscule(textes.orientations[p.orientation]),
      situation: `${t.situation.longueur[s.longueur]} ${t.situation.largeur[s.largeur]}`,
      support: poseSur.length
        ? t.sur(poseSur.map((id) => props.infos.get(id)?.repere ?? id).join(', '))
        : t.description.plancher,
    })
  }
  return poses
})

function nomBloc(b: BlocVue): string {
  const i = info(b)
  const pose = poses.value.get(b.uniteId)
  if (!i || !pose) return b.uniteId
  const morceaux = [
    t.nomBloc({
      repere: i.repere,
      nom: i.nom,
      code: `C${i.code}`,
      destination: i.destination,
      ...pose,
      etape: i.etape,
    }),
  ]
  if (i.malCale) morceaux.push(t.calage.mention)
  if (b.etat === 'enCours') morceaux.push(t.enCours)
  if (b.etat === 'silhouette') morceaux.push(t.pasEncoreCharge)
  return morceaux.join(', ')
}

/** Le rectangle touche-t-il la zone visible du cadrage ? Sinon, rien à poser au calque. */
const dansCadrage = (r: BlocVue['rect']) =>
  r.x < cadrage.value.x + cadrage.value.largeur &&
  r.x + r.largeur > cadrage.value.x &&
  r.y < cadrage.value.y + cadrage.value.hauteur &&
  r.y + r.hauteur > cadrage.value.y

/**
 * Codes de commande (5.1). Ils se posent dans la plus grande partie visible
 * du bloc (`zoneVisible`), si elle mesure au moins 24 px de côté à l'écran,
 * avec le repère A07 s'il a la place. Sinon, le code passe dans une
 * étiquette au-dessus du bloc (au-dessous s'il touche le haut de la vue),
 * reliée à lui par un trait ; deux étiquettes voisines s'empilent au lieu de
 * se chevaucher.
 */
const libelles = computed(() => {
  const exterieures: { x: number; y: number }[] = []
  return visibles.value
    .filter((b) => dansCadrage(b.rect))
    .map((b) => {
      const zone = zones.value.get(b.uniteId) ?? b.rect
      const largeur = zone.largeur * echelle.value
      const hauteur = zone.hauteur * echelle.value
      const interieur = largeur >= SEUIL_CODE_PX && hauteur >= SEUIL_CODE_PX
      const cx = zone.x + zone.largeur / 2
      const dessous = (b.rect.y - cadrage.value.y) * echelle.value < 30
      let palier = 0
      if (!interieur) {
        const ecran = { x: cx * echelle.value, y: (dessous ? 1 : -1) * b.rect.y * echelle.value }
        palier = exterieures.filter(
          (e) => Math.abs(e.x - ecran.x) < 36 && Math.abs(e.y - ecran.y) < 60,
        ).length
        exterieures.push(ecran)
      }
      return {
        bloc: b,
        zone,
        interieur,
        avecRepere: interieur && hauteur >= SEUIL_REPERE_PX && largeur >= SEUIL_REPERE_PX,
        avecForme: interieur && info(b)?.forme !== 'rectangulaire',
        cx,
        dessous,
        palier,
      }
    })
})

const selectionnes = computed(() =>
  visibles.value.filter((b) => props.selection.includes(b.uniteId)),
)
/** L'article sélectionné seul : lui seul reçoit ses cotes. */
const selectionne = computed(() =>
  props.selection.length === 1 ? selectionnes.value[0] : undefined,
)
const enCours = computed(() => props.contenu.blocs.find((b) => b.etat === 'enCours'))

/**
 * Centre de gravité dans la vue de dessus : x à l'horizontale, paroi droite en
 * haut (comme `projeterBoite`). Distance au fond en mètres, deux décimales.
 */
const cg = computed(() => {
  const c = props.centreGravite
  if (!c || props.vue !== 'dessus') return null
  return {
    x: c.x,
    y: props.camion.largeur - c.y,
    distance: metres.format(c.x / 1000),
  }
})

// --- Étape en cours : flèche depuis les portes (5.9) ----------------------------

/** Côté des portes dans la vue, quand elles sont sur un bord : à droite ou à gauche. */
const portes = computed<'droite' | 'gauche' | null>(() => {
  if (props.vue === 'dessus' || props.vue === 'gauche') return 'droite'
  if (props.vue === 'droite') return 'gauche'
  return null
})

const flecheEtape = computed(() => {
  const b = enCours.value
  if (!b || !portes.value) return null
  const y = b.rect.y + b.rect.hauteur / 2
  const pointe = enMm(10)
  if (portes.value === 'droite') {
    const x = b.rect.x + b.rect.largeur
    if (taille.value.largeur - x < pointe * 2) return null
    return {
      trait: { x1: x + pointe, y1: y, x2: taille.value.largeur, y2: y },
      pointe: `${x},${y} ${x + pointe},${y - pointe / 2} ${x + pointe},${y + pointe / 2}`,
    }
  }
  const x = b.rect.x
  if (x < pointe * 2) return null
  return {
    trait: { x1: 0, y1: y, x2: x - pointe, y2: y },
    pointe: `${x},${y} ${x - pointe},${y - pointe / 2} ${x - pointe},${y + pointe / 2}`,
  }
})

// --- Cotes (5.13) ------------------------------------------------------------

const cotesCaisse = computed(() => coterCaisse(props.camion, props.vue))
const mm = (v: number) => `${formaterMillimetres(v)} mm`

/*
 * Taille à l'écran d'un code dans son bloc (« C4 », et « A02 » dessous s'il a
 * la place), et demi-épaisseur d'une cote avec sa valeur : en pixels, puis
 * convertis en mm pour `ordonneeLibre`.
 */
const DEMI_LARGEUR_CODE_PX = 24
const DEMI_HAUTEUR_CODE_PX = { seul: 9, avecRepere: 18 }
const DEMI_EPAISSEUR_COTE_PX = 10

/** Libellés dessinés dans les autres blocs, en mm de vue : ce que les cotes évitent. */
const boitesLibelles = computed(() =>
  libelles.value
    .filter((l) => l.interieur && l.bloc.uniteId !== selectionne.value?.uniteId)
    .map((l) => {
      const demiL = enMm(DEMI_LARGEUR_CODE_PX)
      const demiH = enMm(l.avecRepere ? DEMI_HAUTEUR_CODE_PX.avecRepere : DEMI_HAUTEUR_CODE_PX.seul)
      const cy = l.zone.y + l.zone.hauteur / 2
      return {
        id: l.bloc.uniteId,
        boite: { x: l.cx - demiL, y: cy - demiH, largeur: 2 * demiL, hauteur: 2 * demiH },
      }
    }),
)

/**
 * Cotes de l'article sélectionné. La distance au fond traverse les articles
 * posés entre le fond et lui : elle est tracée à la hauteur la plus proche
 * du milieu qui ne passe sur aucun de leurs libellés (`ordonneeLibre`). S'il
 * n'y en a pas, elle reste au milieu et les libellés traversés sont masqués.
 */
const placementCotes = computed(() => {
  const p = props.plan.find((x) => x.uniteId === selectionne.value?.uniteId)
  const sel = selectionne.value
  if (!p || !sel) return { cotes: [] as Cote[], masques: new Set<string>() }
  const cotes = coter(p, trouverUnite(p.uniteId, props.unites), props.camion, props.vue)
  const masques = new Set<string>()
  const demiEpaisseur = enMm(DEMI_EPAISSEUR_COTE_PX)
  const boites = boitesLibelles.value
  return {
    cotes: cotes.map((c) => {
      if (c.mesure !== 'distanceFond' || !c.segment) return c
      const { debut, fin } = c.segment
      const y = ordonneeLibre(
        { x0: debut.x, x1: fin.x, haut: sel.rect.y, bas: sel.rect.y + sel.rect.hauteur },
        boites.map((b) => b.boite),
        demiEpaisseur,
      )
      if (y === null) {
        const traverses = libellesTraverses(
          { x0: debut.x, x1: fin.x, y: debut.y },
          boites,
          demiEpaisseur,
        )
        traverses.forEach((id) => masques.add(id))
        return c
      }
      return { ...c, segment: { debut: { ...debut, y }, fin: { ...fin, y } } }
    }),
    masques,
  }
})
const cotesArticle = computed(() => placementCotes.value.cotes)
/** Libellés masqués parce qu'une cote ne peut que passer dessus. */
const masquesParCote = computed(() => placementCotes.value.masques)

// --- Quadrillage de 1 m ---------------------------------------------------------

const PAS = 1000
const verticales = computed(() =>
  Array.from({ length: Math.ceil(taille.value.largeur / PAS) - 1 }, (_, i) => (i + 1) * PAS),
)
/** Lignes horizontales mesurées depuis le bas : le plancher, ou la paroi gauche en vue de dessus. */
const horizontales = computed(() =>
  Array.from(
    { length: Math.ceil(taille.value.hauteur / PAS) - 1 },
    (_, i) => taille.value.hauteur - (i + 1) * PAS,
  ),
)
const lateral = computed(() => props.vue !== 'dessus')

// --- Repères (5.8) ------------------------------------------------------------

/**
 * Libellés au-dessus du dessin, de gauche à droite, et au-dessous. La flèche
 * pointe vers le bord nommé : le fond est à gauche, sauf dans la vue en
 * miroir (côté droit). En vues avant et arrière, le fond et les portes ne
 * sont pas sur un bord : le sens de la vue est rappelé dessous.
 */
const r = t.reperes
const REPERES: Record<Vue, { haut: string[]; bas: string[] }> = {
  dessus: { haut: [`◂ ${r.fond}`, r.paroiDroite, `${r.portes} ▸`], bas: [r.paroiGauche] },
  gauche: { haut: [`◂ ${r.fond}`, `${r.portes} ▸`], bas: [] },
  droite: { haut: [`◂ ${r.portes}`, `${r.fond} ▸`], bas: [] },
  avant: { haut: [r.droite, r.gauche], bas: [r.depuisFond] },
  arriere: { haut: [r.gauche, r.droite], bas: [r.depuisPortes] },
}
const reperes = computed(() => REPERES[props.vue])

const description = computed(() =>
  t.dessin(
    props.titre,
    [props.camion.longueur, props.camion.largeur, props.camion.hauteur]
      .map(formaterMillimetres)
      .join(' × '),
    props.contenu.blocs.length,
  ),
)

// --- Déplacement de la zone visible et molette --------------------------------

let glisse: { x: number; y: number; pointeur: number } | null = null

/** Doigts posés sur la vue, pour le pincement (5.11). */
const doigts = new Map<number, { x: number; y: number }>()
let ecartPincement = 0

/** Un point de l'écran, en mm dans la vue. */
function versMm(clientX: number, clientY: number) {
  const boite = toile.value?.getBoundingClientRect()
  if (!boite || boite.width === 0) return centreDe(cadrage.value)
  return {
    x: cadrage.value.x + ((clientX - boite.left) / boite.width) * cadrage.value.largeur,
    y: cadrage.value.y + ((clientY - boite.top) / boite.height) * cadrage.value.hauteur,
  }
}

function ecartDoigts() {
  const [a, b] = [...doigts.values()]
  return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
}

function commencerGlisse(e: PointerEvent) {
  if (e.pointerType === 'touch') {
    doigts.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (doigts.size === 2) {
      // Deux doigts : un pincement commence, le glisser s'arrête.
      ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
      ecartPincement = ecartDoigts()
      glisse = null
      return
    }
  }
  if (!zoomee.value || (e.target as Element).closest('button')) return
  glisse = { x: e.clientX, y: e.clientY, pointeur: e.pointerId }
  ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
}

function glisser(e: PointerEvent) {
  if (doigts.has(e.pointerId)) doigts.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (doigts.size === 2 && ecartPincement > 0) {
    const ecart = ecartDoigts()
    const [a, b] = [...doigts.values()]
    if (ecart > 0 && a && b) {
      const milieu = versMm((a.x + b.x) / 2, (a.y + b.y) / 2)
      cadrage.value = pincer(cadrage.value, taille.value, ecartPincement, ecart, milieu)
      ecartPincement = ecart
    }
    return
  }
  if (!glisse || e.pointerId !== glisse.pointeur) return
  const dx = enMm(glisse.x - e.clientX)
  const dy = enMm(glisse.y - e.clientY)
  glisse = { ...glisse, x: e.clientX, y: e.clientY }
  cadrage.value = deplacerCadrage(cadrage.value, taille.value, dx, dy)
}

function finirGlisse(e: PointerEvent) {
  doigts.delete(e.pointerId)
  if (doigts.size < 2) ecartPincement = 0
  glisse = null
}

const DEPLACEMENTS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

/** Flèches sur la vue zoomée elle-même (pas sur un article) : un dixième de la zone visible. */
function clavier(e: KeyboardEvent) {
  const sens = DEPLACEMENTS[e.key]
  if (!sens || !zoomee.value || e.target !== e.currentTarget) return
  e.preventDefault()
  const pas = e.shiftKey ? 0.5 : 0.1
  cadrage.value = deplacerCadrage(
    cadrage.value,
    taille.value,
    sens[0] * cadrage.value.largeur * pas,
    sens[1] * cadrage.value.hauteur * pas,
  )
}

function molette(e: WheelEvent) {
  // Sans Ctrl, la molette fait défiler la page, comme ailleurs.
  if (!e.ctrlKey || !toile.value) return
  e.preventDefault()
  const point = versMm(e.clientX, e.clientY)
  const apres = Math.min(Math.max(zoom.value * (e.deltaY < 0 ? 1.25 : 0.8), 1), 8)
  cadrage.value = zoomAutour(cadrage.value, taille.value, zoom.value, apres, point)
}

// Un changement de vue rend la main sur le survol.
watch(
  () => props.vue,
  () => {
    survol.value = null
  },
)

const ratio = computed(() => taille.value.largeur / taille.value.hauteur)
</script>

<template>
  <div class="scene">
    <div class="scene__reperes" :class="{ 'scene__reperes--trois': reperes.haut.length === 3 }">
      <span v-for="texte in reperes.haut" :key="texte">{{ texte }}</span>
    </div>

    <div class="scene__grille">
      <div class="scene__cote-verticale" aria-hidden="true">
        <div class="scene__cote-caisse" :style="{ top: pctY(0), height: pctH(taille.hauteur) }">
          <LigneCote :valeur="mm(cotesCaisse[1]?.valeur ?? 0)" sens="vertical" />
        </div>
      </div>

      <div
        ref="toile"
        class="scene__toile"
        :class="{ 'scene__toile--zoomee': zoomee }"
        :tabindex="zoomee ? 0 : undefined"
        :role="zoomee ? 'group' : undefined"
        :aria-label="zoomee ? t.deplacerVue(props.titre) : undefined"
        @keydown="clavier"
        @wheel="molette"
        @pointerdown="commencerGlisse"
        @pointermove="glisser"
        @pointerup="finirGlisse"
        @pointercancel="finirGlisse"
      >
        <svg
          class="scene__dessin"
          :viewBox="`${cadrage.x} ${cadrage.y} ${cadrage.largeur} ${cadrage.hauteur}`"
          preserveAspectRatio="none"
          role="img"
          :aria-label="description"
        >
          <defs>
            <pattern
              v-for="n in 6"
              :id="`${id}-hachure-${n}`"
              :key="n"
              patternUnits="userSpaceOnUse"
              :width="pasHachure"
              :height="pasHachure"
              patternTransform="rotate(45)"
            >
              <rect class="scene__rayure" :width="pasHachure / 2" :height="pasHachure" />
            </pattern>
          </defs>
          <rect class="scene__fond" x="0" y="0" :width="taille.largeur" :height="taille.hauteur" />
          <line
            v-for="x in verticales"
            :key="`v${x}`"
            class="scene__quadrillage"
            :x1="x"
            y1="0"
            :x2="x"
            :y2="taille.hauteur"
          />
          <line
            v-for="y in horizontales"
            :key="`h${y}`"
            class="scene__quadrillage"
            x1="0"
            :y1="y"
            :x2="taille.largeur"
            :y2="y"
          />
          <g
            v-for="b in props.contenu.blocs"
            :key="b.uniteId"
            :class="{ 'bloc--transparent': transparents.has(b.uniteId) }"
          >
            <rect :class="classesBloc(b)" v-bind="dessine(b)" :rx="rayon" :ry="rayon" />
            <rect
              v-if="hachure(b)"
              class="bloc__hachure"
              v-bind="dessine(b)"
              :fill="`url(#${id}-hachure-${teinteCommande(info(b)?.code ?? 1).teinte})`"
            />
          </g>
          <line
            v-if="cg"
            class="scene__axe"
            x1="0"
            :y1="taille.hauteur / 2"
            :x2="taille.largeur"
            :y2="taille.hauteur / 2"
          />
          <template v-if="flecheEtape">
            <line class="scene__fleche-etape" v-bind="flecheEtape.trait" />
            <polygon class="scene__pointe-etape" :points="flecheEtape.pointe" />
          </template>
          <rect
            class="scene__contour"
            :class="{ 'scene__contour--filtre': props.filtreActif }"
            x="0"
            y="0"
            :width="taille.largeur"
            :height="taille.hauteur"
          />
          <line
            v-if="lateral"
            class="scene__plancher"
            x1="0"
            :y1="taille.hauteur"
            :x2="taille.largeur"
            :y2="taille.hauteur"
          />
        </svg>

        <!-- Calque de libellés : taille fixe, position en pourcentage du cadrage. -->
        <div class="calque">
          <template v-for="l in libelles" :key="l.bloc.uniteId">
            <div
              v-if="l.interieur"
              class="calque__code"
              :class="{
                'calque__code--doux': l.bloc.etat === 'silhouette' || attenue(l.bloc),
                'calque__code--transparent':
                  transparents.has(l.bloc.uniteId) || masquesParCote.has(l.bloc.uniteId),
              }"
              :style="{
                left: pctX(l.zone.x),
                top: pctY(l.zone.y),
                width: pctL(l.zone.largeur),
                height: pctH(l.zone.hauteur),
              }"
              aria-hidden="true"
            >
              <span class="calque__commande">C{{ info(l.bloc)?.code }}</span>
              <span v-if="l.avecRepere" class="calque__repere">{{ info(l.bloc)?.repere }}</span>
              <Icone
                v-if="info(l.bloc)?.malCale"
                class="calque__mal-cale"
                nom="alerte"
                :taille="14"
              />
              <Icone
                v-if="l.avecForme"
                class="calque__forme"
                :nom="info(l.bloc)?.forme === 'cylindrique' ? 'cylindre' : 'forme-libre'"
                :taille="14"
              />
            </div>
            <div
              v-else
              class="calque__etiquette"
              :class="{ 'calque__etiquette--dessous': l.dessous }"
              :style="{
                left: pctX(l.cx),
                top: pctY(l.dessous ? l.bloc.rect.y + l.bloc.rect.hauteur : l.bloc.rect.y),
              }"
              aria-hidden="true"
            >
              <span
                class="calque__cartouche"
                :class="[
                  `calque__cartouche--t${teinteCommande(info(l.bloc)?.code ?? 1).teinte}`,
                  {
                    'calque__cartouche--doux': l.bloc.etat === 'silhouette' || attenue(l.bloc),
                  },
                ]"
                >C{{ info(l.bloc)?.code }}</span
              >
              <span class="calque__trait" :style="{ height: `${6 + l.palier * 22}px` }" />
            </div>
          </template>

          <!-- Anneau de sélection : 3 px encre, collé au bloc (5.14). -->
          <div
            v-for="b in selectionnes"
            :key="`selection-${b.uniteId}`"
            class="calque__selection"
            :style="{
              left: pctX(b.rect.x),
              top: pctY(b.rect.y),
              width: pctL(b.rect.largeur),
              height: pctH(b.rect.hauteur),
            }"
          />

          <!-- Centre de gravité (5.17) : décoratif, détaillé dans la carte d'équilibre. -->
          <div
            v-if="cg"
            class="calque__cg"
            :style="{ left: pctX(cg.x), top: pctY(cg.y) }"
            aria-hidden="true"
          >
            <svg class="scene__cg" width="22" height="22" viewBox="0 0 22 22">
              <circle cx="11" cy="11" r="10" />
              <line x1="11" y1="4" x2="11" y2="18" />
              <line x1="4" y1="11" x2="18" y2="11" />
            </svg>
            <span class="calque__cg-nom">{{ t.equilibre.cg }}</span>
            <span class="calque__cg-distance">{{ t.equilibre.cgDistance(cg.distance) }}</span>
          </div>

          <span
            v-if="enCours"
            class="calque__etape"
            :class="{ 'calque__etape--dedans': (enCours.rect.y - cadrage.y) * echelle < 24 }"
            :style="{ left: pctX(enCours.rect.x), top: pctY(enCours.rect.y) }"
            aria-hidden="true"
            >{{ t.etiquetteEtape(enCours.rang) }}</span
          >

          <!-- Cotes de l'article sélectionné, en `action`. -->
          <template v-for="c in cotesArticle" :key="c.mesure">
            <template v-if="c.segment">
              <div
                v-if="c.segment.debut.y === c.segment.fin.y && c.valeur > 0"
                class="calque__cote calque__cote--horizontale"
                :class="{ 'calque__cote--milieu': c.mesure === 'distanceFond' }"
                :style="{
                  left: pctX(Math.min(c.segment.debut.x, c.segment.fin.x)),
                  width: pctL(c.valeur),
                  top: pctY(c.segment.debut.y),
                }"
              >
                <LigneCote :valeur="mm(c.valeur)" ton="action" />
              </div>
              <div
                v-else-if="c.valeur > 0"
                class="calque__cote calque__cote--verticale"
                :style="{
                  left: pctX(c.segment.debut.x),
                  top: pctY(c.segment.debut.y),
                  height: pctH(c.valeur),
                }"
              >
                <LigneCote :valeur="mm(c.valeur)" sens="vertical" ton="action" />
              </div>
            </template>
            <span
              v-else-if="selectionne"
              class="calque__distance"
              :style="{
                left: pctX(selectionne.rect.x + selectionne.rect.largeur / 2),
                top: pctY(selectionne.rect.y + selectionne.rect.hauteur),
              }"
              aria-hidden="true"
              >{{ t.description.distance(formaterMillimetres(c.valeur)) }}</span
            >
          </template>

          <!-- Un bouton par article visible : nom accessible, sélection, survol. -->
          <button
            v-for="b in visibles"
            :key="b.uniteId"
            type="button"
            class="calque__bouton"
            :aria-label="nomBloc(b)"
            :aria-pressed="props.selection.includes(b.uniteId)"
            :data-unite="b.uniteId"
            :style="{
              left: pctX(b.rect.x),
              top: pctY(b.rect.y),
              width: pctL(b.rect.largeur),
              height: pctH(b.rect.hauteur),
            }"
            @click="emit('selectionner', b.uniteId)"
            @keydown="emit('touche', b.uniteId, $event)"
            @mouseenter="survol = b.uniteId"
            @mouseleave="survol = null"
            @focus="survol = b.uniteId"
            @blur="survol = null"
          />

          <!-- Places proposées (5.3) : un clic ou un toucher y pose l'article. -->
          <button
            v-for="(m, rang) in marques"
            :key="`place-${rang}`"
            type="button"
            class="calque__place"
            :aria-label="m.libelle"
            :style="{ left: pctX(m.x), top: pctY(m.y) }"
            @click="emit('choisirPlace', rang)"
          >
            <Icone nom="plus" :taille="16" />
          </button>
        </div>
      </div>

      <div class="scene__cote-horizontale" aria-hidden="true">
        <div class="scene__cote-caisse" :style="{ left: pctX(0), width: pctL(taille.largeur) }">
          <LigneCote :valeur="mm(cotesCaisse[0]?.valeur ?? 0)" />
        </div>
      </div>
    </div>

    <div v-if="reperes.bas.length" class="scene__reperes scene__reperes--bas">
      <span v-for="texte in reperes.bas" :key="texte">{{ texte }}</span>
    </div>
  </div>
</template>

<style scoped>
.scene {
  --largeur-toile: min(
    calc(100% - var(--espace-6) * 2),
    calc(var(--espace-7) * 11 * v-bind(ratio))
  );

  min-width: 0;
}

/* Repères au-dessus et au-dessous du dessin : ils passent à la ligne plutôt que se chevaucher. */
.scene__reperes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espace-1) var(--espace-4);
  justify-content: space-between;
  width: var(--largeur-toile);
  margin: 0 0 var(--espace-1) calc(var(--espace-6) * 2);
  font: var(--typo-repere);
  color: var(--texte-fort);
}

.scene__reperes--bas {
  justify-content: flex-start;
  margin-top: var(--espace-1);
}

.scene__grille {
  display: grid;
  grid-template-areas:
    'verticale toile'
    '. horizontale';
  grid-template-columns: var(--espace-6) var(--largeur-toile);
  gap: var(--espace-6);
}

/* Cotes de la caisse : elles suivent le zoom, coupées au bord de la scène. */
.scene__cote-verticale,
.scene__cote-horizontale {
  position: relative;
  overflow: hidden;
}

.scene__cote-verticale {
  grid-area: verticale;
}

.scene__cote-horizontale {
  grid-area: horizontale;
  height: var(--espace-5);
}

.scene__cote-caisse {
  position: absolute;
}

.scene__cote-verticale .scene__cote-caisse {
  right: 0;
  left: 0;
}

.scene__cote-horizontale .scene__cote-caisse {
  top: 0;
  bottom: 0;
}

/*
 * À 100 %, les étiquettes et cotes posées près d'un bord peuvent dépasser de
 * la caisse ; une vue zoomée coupe tout ce qui sort de la zone visible.
 */
.scene__toile {
  position: relative;
  grid-area: toile;
  aspect-ratio: v-bind(ratio);
  touch-action: pan-y;
}

.scene__toile--zoomee {
  overflow: hidden;
  cursor: grab;
  touch-action: none;
}

.scene__toile:focus-visible {
  outline: var(--focus) solid var(--action);
  outline-offset: var(--focus);
  box-shadow: 0 0 0 var(--focus) var(--surface);
}

.scene__dessin {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.scene__fond {
  fill: var(--camion-fond);
}

.scene__quadrillage {
  stroke: var(--camion-grille);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.scene__contour {
  fill: none;
  stroke: var(--camion-contour);
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}

/* Filtre actif : le contour du camion change d'aspect (5.10). */
.scene__contour--filtre {
  stroke: var(--action);
  stroke-dasharray: 6 4;
}

.scene__plancher {
  stroke: var(--camion-contour);
  stroke-width: 6;
  vector-effect: non-scaling-stroke;
}

.scene__rayure {
  fill: var(--surface);
}

.scene__fleche-etape {
  stroke: var(--action);
  stroke-width: 2;
  stroke-dasharray: 6 4;
  vector-effect: non-scaling-stroke;
}

.scene__pointe-etape {
  fill: var(--action);
}

/* --- Blocs : fond et contour de la commande, contour de 3 px (charte). --- */
.bloc {
  fill: var(--cmd-fond);
  stroke: var(--cmd-bord);
  stroke-width: var(--contour-bloc);
  vector-effect: non-scaling-stroke;
}

.bloc--t1 {
  --cmd-fond: var(--cmd1-fond);
  --cmd-bord: var(--cmd1-bord);
}

.bloc--t2 {
  --cmd-fond: var(--cmd2-fond);
  --cmd-bord: var(--cmd2-bord);
}

.bloc--t3 {
  --cmd-fond: var(--cmd3-fond);
  --cmd-bord: var(--cmd3-bord);
}

.bloc--t4 {
  --cmd-fond: var(--cmd4-fond);
  --cmd-bord: var(--cmd4-bord);
}

.bloc--t5 {
  --cmd-fond: var(--cmd5-fond);
  --cmd-bord: var(--cmd5-bord);
}

.bloc--t6 {
  --cmd-fond: var(--cmd6-fond);
  --cmd-bord: var(--cmd6-bord);
}

.bloc__hachure {
  pointer-events: none;
}

/* Autre commande mise en évidence : gris, jamais d'opacité sur le bloc (5.12). */
.bloc--attenue {
  fill: var(--attenue-fond);
  stroke: var(--attenue-bord);
  stroke-width: var(--contour-attenue);
}

/* Étape à venir : fond blanc, contour pointillé de 2 px (5.9). */
.bloc--silhouette {
  fill: var(--surface);
  stroke: var(--bordure-forte);
  stroke-width: var(--contour-attenue);
  stroke-dasharray: 6 4;
}

/* Étape en cours : contour `action` de 4 px (5.14). */
.bloc--en-cours {
  stroke: var(--action);
  stroke-width: var(--contour-etape);
}

/* Survol d'un article : ceux qui le recouvrent deviennent semi-transparents (5.10). */
.bloc--transparent {
  opacity: 0.25;
}

/* --- Calque de libellés --- */
.calque {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.calque__code {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: var(--espace-1);
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font: var(--typo-code-commande);
  color: var(--encre);
}

.calque__code--doux {
  color: var(--texte-doux);
}

.calque__code--transparent {
  visibility: hidden;
}

.calque__repere {
  font: var(--typo-repere);
}

.calque__forme {
  position: absolute;
  top: var(--espace-1);
  right: var(--espace-1);
  color: var(--texte-fort);
}

/* Petit bloc : le code passe dans une étiquette au-dessus, reliée par un trait `cote`. */
.calque__etiquette {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translate(-50%, -100%);
}

/* Bloc collé au haut de la vue : l'étiquette passe dessous, le trait au-dessus. */
.calque__etiquette--dessous {
  flex-direction: column-reverse;
  transform: translateX(-50%);
}

.calque__cartouche {
  padding: 1px var(--espace-1);
  font: var(--typo-code-commande);
  color: var(--encre);
  background: var(--cmd-fond);
  border: 2px solid var(--cmd-bord);
  border-radius: var(--rayon-code);
}

.calque__cartouche--t1 {
  --cmd-fond: var(--cmd1-fond);
  --cmd-bord: var(--cmd1-bord);
}

.calque__cartouche--t2 {
  --cmd-fond: var(--cmd2-fond);
  --cmd-bord: var(--cmd2-bord);
}

.calque__cartouche--t3 {
  --cmd-fond: var(--cmd3-fond);
  --cmd-bord: var(--cmd3-bord);
}

.calque__cartouche--t4 {
  --cmd-fond: var(--cmd4-fond);
  --cmd-bord: var(--cmd4-bord);
}

.calque__cartouche--t5 {
  --cmd-fond: var(--cmd5-fond);
  --cmd-bord: var(--cmd5-bord);
}

.calque__cartouche--t6 {
  --cmd-fond: var(--cmd6-fond);
  --cmd-bord: var(--cmd6-bord);
}

.calque__cartouche--doux {
  color: var(--texte-doux);
  background: var(--surface);
  border-style: dashed;
  border-color: var(--bordure-forte);
}

.calque__trait {
  width: 1px;
  background: var(--cote);
}

.calque__mal-cale {
  position: absolute;
  top: var(--espace-1);
  left: var(--espace-1);
  color: var(--alerte-icone);
}

/* Axe longitudinal de la caisse, en pointillés `cote` (5.17). */
.scene__axe {
  stroke: var(--cote);
  stroke-width: 1px;
  stroke-dasharray: 6 4;
  vector-effect: non-scaling-stroke;
}

/* Centre de gravité : croix dans un cercle `action` de 22 px, libellé « CG ». */
.calque__cg {
  position: absolute;
  width: 0;
  height: 0;
}

.scene__cg {
  position: absolute;
  top: -11px;
  left: -11px;
  overflow: visible;
  fill: var(--surface);
  stroke: var(--action);
  stroke-width: 2px;
}

.calque__cg-nom {
  position: absolute;
  top: -8px;
  left: 14px;
  font: var(--typo-badge);
  color: var(--action-fonce);
}

.calque__cg-distance {
  position: absolute;
  top: 14px;
  left: 0;
  padding: 0 var(--espace-1);
  font: var(--typo-repere);
  color: var(--texte-fort);
  white-space: nowrap;
  background: var(--surface);
  transform: translateX(-50%);
}

.calque__selection {
  position: absolute;
  outline: var(--anneau-selection) solid var(--encre);
  border-radius: var(--rayon-bloc);
}

.calque__etape {
  position: absolute;
  padding: 0 var(--espace-1);
  font: var(--typo-badge);
  color: var(--action-fonce);
  white-space: nowrap;
  background: var(--surface);
  border: 1px solid var(--action);
  border-radius: var(--rayon-code);
  transform: translateY(calc(-100% - var(--espace-1)));
}

/* Bloc collé au haut de la vue : l'étiquette passe dans son coin, sans mordre sur les repères. */
.calque__etape--dedans {
  transform: translate(var(--espace-2), var(--espace-2));
}

.calque__cote {
  position: absolute;
}

.calque__cote--horizontale {
  transform: translateY(var(--espace-1));
}

.calque__cote--milieu {
  transform: translateY(-50%);
}

.calque__cote--verticale {
  width: var(--espace-5);
  transform: translateX(calc(-100% - var(--espace-1)));
}

.calque__distance {
  position: absolute;
  padding: 0 var(--espace-1);
  font: var(--typo-repere);
  color: var(--action-fonce);
  white-space: nowrap;
  background: var(--surface);
  transform: translate(-50%, var(--espace-1));
}

.calque__bouton {
  position: absolute;
  padding: 0;
  cursor: pointer;
  pointer-events: auto;
  background: none;
  border: 0;
  border-radius: var(--rayon-bloc);
}

.scene__toile--zoomee .calque__bouton {
  cursor: pointer;
}

/* Focus clavier : double anneau décalé de 2 px (5.14), cumulable avec la sélection. */
.calque__bouton:focus-visible {
  z-index: 1;
  outline: var(--focus) solid var(--action);
  outline-offset: var(--focus);
  box-shadow: 0 0 0 var(--focus) var(--surface);
}

/* Place proposée (capture 04h) : une marque « + » au-dessus des articles. */
.calque__place {
  position: absolute;
  z-index: 2;
  display: grid;
  place-items: center;
  width: var(--cible-mini);
  height: var(--cible-mini);
  padding: 0;
  color: var(--action);
  cursor: pointer;
  pointer-events: auto;
  background: var(--surface);
  border: 1px solid var(--action);
  border-radius: var(--rayon-controle);
  transform: translate(-50%, -50%);
}

.calque__place:hover {
  background: var(--info-fond);
}

.calque__place:focus-visible {
  z-index: 3;
  outline: var(--focus) solid var(--action);
  outline-offset: var(--focus);
  box-shadow: 0 0 0 var(--focus) var(--surface);
}
</style>
