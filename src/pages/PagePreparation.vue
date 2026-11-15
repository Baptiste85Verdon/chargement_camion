<script setup lang="ts">
/**
 * Préparation d'une tournée (captures 02 et 02e ; cahier fonctionnel 4.2 ;
 * RG-07, RG-21, RG-22).
 *
 * Trois cartes, dans l'ordre du parcours :
 * 1. Date et camion : enregistrés dès qu'ils changent (la capture 02 n'a pas
 *    de bouton d'enregistrement). Une tournée en préparation peut attendre sa
 *    date et son camion ; ils deviennent obligatoires au lancement du calcul.
 * 2. Commandes et ordre de livraison : la première est livrée en premier
 *    (RG-07). L'ordre se change aux flèches, ou en glissant une ligne ; les
 *    flèches sont l'alternative au glisser-déposer, pour le clavier. Le
 *    numéro de la commande est le lien vers sa saisie express.
 * 3. Calcul du plan : le résumé de la charge, puis « Lancer le calcul ».
 *    Le plan calculé est enregistré comme nouvelle version, puis sa page
 *    s'ouvre ; « Voir le plan » y ramène sans recalculer.
 */
import { computed, nextTick, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import type { FicheArticle, ModeleCamion, PlanChargement, Tournee } from '@/domaine/modele'
import { resumerLignes } from '@/domaine/saisie-commande'
import { calculerPlan, deplacer } from '@/domaine/tournee'
import { validerTournee } from '@/domaine/validation'
import type { CommandeAvecLignes } from '@/donnees/depots'
import { ErreurDonnees } from '@/donnees/erreurs'
import { useAnnonces } from '@/stores/annonces'
import { useAttente } from '@/stores/attente'
import { utiliserDepots } from '@/stores/depots'
import { textes } from '@/textes/fr'
import Annonce from '@/composants/Annonce.vue'
import Badge from '@/composants/Badge.vue'
import Bandeau from '@/composants/Bandeau.vue'
import Bouton from '@/composants/Bouton.vue'
import Carte from '@/composants/Carte.vue'
import Champ from '@/composants/Champ.vue'
import CodeCommande from '@/composants/CodeCommande.vue'
import ConfirmationDialog from '@/composants/ConfirmationDialog.vue'
import EntetePage from '@/composants/EntetePage.vue'
import Icone from '@/composants/Icone.vue'
import LienBouton from '@/composants/LienBouton.vue'
import ResumeErreurs, { type ErreurResumee } from '@/composants/ResumeErreurs.vue'
import {
  formaterDate,
  formaterDimensions,
  formaterJour,
  formaterMetresCubes,
  formaterMillimetres,
  formaterPoids,
  formaterPourcentage,
  formaterVolume,
  premiereMajuscule,
} from '@/composants/format'
import { utiliserVerification } from '@/composants/verification'

const props = defineProps<{ id: string }>()

const t = textes.preparation
const depots = utiliserDepots()
const annonces = useAnnonces()
const attente = useAttente()
const routeur = useRouter()

// --- Données ------------------------------------------------------------------

const chargement = ref(true)
const erreurChargement = ref('')
const tournee = ref<Tournee | null>(null)
const camions = ref<ModeleCamion[]>([])
const articles = ref<FicheArticle[]>([])
const commandes = ref<CommandeAvecLignes[]>([])
const dernierPlan = ref<PlanChargement | null>(null)

/** Saisie de la carte 1 : enregistrée dès qu'elle change. */
const form = ref({ date: '', modeleCamionId: '' })

const annonce = ref('')
const tonAnnonce = ref<'info' | 'alerte'>('info')

function alerter(e: unknown) {
  tonAnnonce.value = 'alerte'
  annonce.value = e instanceof ErreurDonnees ? e.message : textes.donnees.reseau
}

function informer(message: string) {
  tonAnnonce.value = 'info'
  annonce.value = message
}

async function chargerCommandes() {
  commandes.value = await depots.commandes.listerParTournee(props.id)
}

async function charger() {
  try {
    const [tr, actifs, catalogue, plan] = await Promise.all([
      depots.tournees.obtenir(props.id),
      depots.camions.lister(),
      // Avec les archivés : une commande garde ses articles archivés (RG-21).
      depots.articles.lister({ avecArchives: true }),
      depots.plans.obtenirDernier(props.id),
      chargerCommandes(),
      attente.actualiser(depots),
    ])
    if (!tr) {
      erreurChargement.value = t.introuvable
      return
    }
    tournee.value = tr
    articles.value = catalogue
    dernierPlan.value = plan?.plan ?? null
    // Un camion archivé reste affiché pour la tournée qui l'a déjà choisi.
    const sien = tr.modeleCamionId && !actifs.some((c) => c.id === tr.modeleCamionId)
    const archive = sien ? await depots.camions.obtenir(tr.modeleCamionId ?? '') : null
    camions.value = archive ? [...actifs, archive] : actifs
    form.value = { date: tr.date ?? '', modeleCamionId: tr.modeleCamionId ?? '' }
    camionCoche.value = form.value.modeleCamionId
  } catch (e) {
    erreurChargement.value = e instanceof ErreurDonnees ? e.message : textes.donnees.reseau
  } finally {
    chargement.value = false
  }
}

onMounted(async () => {
  await charger()
  annonce.value = annonces.reprendre()
})

const camion = computed(() => camions.value.find((c) => c.id === form.value.modeleCamionId))
/** Camion coché mais pas encore confirmé (fenêtre de changement de camion). */
const camionPropose = computed(() => camions.value.find((c) => c.id === camionCoche.value))
const dateAffichee = computed(() =>
  tournee.value?.date ? formaterJour(tournee.value.date) : t.dateAFixer,
)
const ariane = computed(() => [
  { libelle: textes.navigation.accueil, vers: '/' },
  { libelle: tournee.value?.date ? t.ariane(dateAffichee.value) : t.nouvelle },
])

// --- Vérification (RG-21) -------------------------------------------------------

/** Vrai après un clic sur « Lancer le calcul » : la règle « au moins une commande » s'applique. */
const lancement = ref(false)
const verification = utiliserVerification(() =>
  validerTournee(form.value, {
    nombreCommandes: commandes.value.length,
    lancement: lancement.value,
  }),
)
const { erreur, quitter } = verification

const CHAMPS: Record<string, string> = {
  date: 'tournee-date',
  modeleCamionId: 'tournee-camion-0',
  commandes: 'tournee-commandes',
}
const erreursResumees = computed<ErreurResumee[]>(() =>
  verification.erreursResumees.value.map((p) => ({
    champId: CHAMPS[p.champ] ?? p.champ,
    libelle: t.champs[p.champ as keyof typeof t.champs] ?? p.champ,
    message: p.message,
  })),
)
const resume = ref<InstanceType<typeof ResumeErreurs> | null>(null)

// --- Date et camion : enregistrés aussitôt ---------------------------------------

/** Ce qui vient d'être enregistré, pour le retour « Enregistré » (aria-live). */
const enregistre = ref<'date' | 'camion' | null>(null)

/**
 * Enregistre la date et le camion tels que saisis. Une date vide ou
 * illisible n'est pas enregistrée : la tournée garde « Date à fixer », et
 * l'erreur reste affichée sous le champ.
 */
async function enregistrerDateCamion(quoi: 'date' | 'camion') {
  const tr = tournee.value
  if (!tr) return
  const dateLisible = /^\d{4}-\d{2}-\d{2}$/.test(form.value.date) ? form.value.date : null
  enregistre.value = null
  try {
    tournee.value = await depots.tournees.enregistrer({
      ...tr,
      date: dateLisible,
      modeleCamionId: form.value.modeleCamionId || null,
    })
    enregistre.value = quoi
  } catch (e) {
    alerter(e)
  }
}

async function changerDate() {
  quitter('date')
  await enregistrerDateCamion('date')
}

/** Camion coché à l'écran ; il revient en arrière si le changement est annulé. */
const camionCoche = ref('')

/**
 * Un plan déjà calculé l'a été pour la caisse du camion actuel : en changer
 * demande confirmation (RG-22), puis le plan est marqué « à recalculer ».
 * Un plan déjà marqué ne redemande rien.
 */
const confirmationCamion = ref(false)

async function choisirCamion() {
  if (camionCoche.value === form.value.modeleCamionId) return
  if (dernierPlan.value && !dernierPlan.value.aRecalculer && form.value.modeleCamionId) {
    confirmationCamion.value = true
    return
  }
  await appliquerCamion()
}

async function appliquerCamion() {
  confirmationCamion.value = false
  const plan = dernierPlan.value
  try {
    if (plan && !plan.aRecalculer) {
      await depots.plans.marquerARecalculer(plan.id)
      dernierPlan.value = { ...plan, aRecalculer: true }
    }
  } catch (e) {
    alerter(e)
    camionCoche.value = form.value.modeleCamionId
    return
  }
  form.value.modeleCamionId = camionCoche.value
  quitter('modeleCamionId')
  await enregistrerDateCamion('camion')
}

function annulerCamion() {
  confirmationCamion.value = false
  camionCoche.value = form.value.modeleCamionId
}

// --- Commandes ----------------------------------------------------------------

const articleDe = (id: string) => articles.value.find((a) => a.id === id)

/** « 2 × Poutre lamellé-collé 200 × 400 · 1 × Carton de quincaillerie » */
const articlesDe = (c: CommandeAvecLignes) =>
  c.lignes.map((l) => `${l.quantite} × ${articleDe(l.articleId)?.nom ?? ''}`).join(' · ')
const resumeDe = (c: CommandeAvecLignes) => resumerLignes(c.lignes, articles.value)
const aDesDimensionsPropres = (c: CommandeAvecLignes) => c.lignes.some((l) => l.dimsPropres)
const codeDe = (c: CommandeAvecLignes) => `C${c.commande.rangLivraison ?? 0}`

/** Enregistre un nouvel ordre de livraison, puis relit les commandes. */
async function reordonner(ids: string[], deplacee?: CommandeAvecLignes) {
  try {
    await depots.commandes.reordonner(props.id, ids)
    await chargerCommandes()
    if (deplacee) {
      const rang = ids.indexOf(deplacee.commande.id) + 1
      informer(t.ordreChange(deplacee.commande.destination, t.rang(rang)))
    }
  } catch (e) {
    alerter(e)
    await chargerCommandes()
  }
}

async function decaler(index: number, decalage: number) {
  const ids = deplacer(
    commandes.value.map((c) => c.commande.id),
    index,
    decalage,
  )
  await reordonner(ids, commandes.value[index])
}

// Glisser-déposer d'une ligne : l'alternative au clavier, ce sont les flèches.
const glissee = ref<number | null>(null)
const survolee = ref<number | null>(null)

function commencerGlisser(index: number, evenement: DragEvent) {
  glissee.value = index
  evenement.dataTransfer?.setData('text/plain', String(index))
  if (evenement.dataTransfer) evenement.dataTransfer.effectAllowed = 'move'
}

function finirGlisser() {
  glissee.value = null
  survolee.value = null
}

async function deposer(index: number) {
  const depuis = glissee.value
  glissee.value = null
  survolee.value = null
  if (depuis === null || depuis === index) return
  await decaler(depuis, index - depuis)
}

// Supprimer une commande (RG-22).
const aSupprimer = ref<CommandeAvecLignes | null>(null)

async function supprimerCommande() {
  const c = aSupprimer.value
  aSupprimer.value = null
  if (!c) return
  try {
    await depots.commandes.supprimer(c.commande.id)
    const restantes = commandes.value
      .filter((x) => x.commande.id !== c.commande.id)
      .map((x) => x.commande.id)
    // Les rangs restent continus : C1, C2, C3…
    await depots.commandes.reordonner(props.id, restantes)
    await chargerCommandes()
    informer(t.commandeSupprimee(c.commande.destination))
  } catch (e) {
    alerter(e)
  }
}

// --- Supprimer la tournée (RG-22) --------------------------------------------------

const confirmationTournee = ref(false)

async function supprimerTournee() {
  confirmationTournee.value = false
  const tr = tournee.value
  if (!tr) return
  try {
    await depots.tournees.supprimer(tr.id)
    annonces.deposer(t.supprimee(tr.reference))
    await routeur.push('/')
  } catch (e) {
    alerter(e)
  }
}

// --- Calcul du plan -------------------------------------------------------------

const charge = computed(() =>
  resumerLignes(
    commandes.value.flatMap((c) => c.lignes),
    articles.value,
  ),
)
const volumeCaisse = computed(() =>
  camion.value ? (camion.value.longueur * camion.value.largeur * camion.value.hauteur) / 1e9 : 0,
)
const volumeAffiche = computed(() =>
  camion.value
    ? t.volumeSur(
        formaterMetresCubes(charge.value.volume),
        formaterVolume(camion.value),
        formaterPourcentage(charge.value.volume / volumeCaisse.value),
      )
    : formaterMetresCubes(charge.value.volume),
)

const calcul = ref(false)

async function lancer() {
  lancement.value = true
  if (!verification.soumettre()) {
    await nextTick()
    resume.value?.focaliser()
    return
  }
  const c = camion.value
  if (!c || calcul.value) return
  calcul.value = true
  try {
    const { placements, enTrop } = calculerPlan(commandes.value, articles.value, c)
    const { plan } = await depots.plans.enregistrerVersion(props.id, placements)
    dernierPlan.value = plan
    const rangs = new Map(commandes.value.map((x) => [x.commande.id, x.commande.rangLivraison]))
    const codes = [...new Set(enTrop.map((u) => `C${rangs.get(u.commandeId) ?? 0}`))].join(', ')
    annonces.deposer(
      [
        t.planCalcule(plan.version, placements.length),
        enTrop.length > 0 ? t.planEnTrop(enTrop.length, codes) : '',
      ]
        .filter(Boolean)
        .join(' '),
    )
    await routeur.push(`/tournees/${props.id}/plan`)
  } catch (e) {
    alerter(e)
  } finally {
    calcul.value = false
  }
}
</script>

<template>
  <EntetePage
    :titre="t.titre"
    :ariane="ariane"
    :sous-titre="tournee ? `${tournee.reference} · ${dateAffichee}` : undefined"
  >
    <template v-if="tournee" #apres-titre>
      <Badge class="preparation__statut">{{
        premiereMajuscule(textes.statutsTournee[tournee.statut])
      }}</Badge>
    </template>
    <template v-if="tournee" #actions>
      <Bouton @click="confirmationTournee = true">{{ t.supprimer }}</Bouton>
    </template>
  </EntetePage>

  <Annonce :message="annonce" :ton="tonAnnonce" />

  <p v-if="chargement" class="etat">{{ textes.referentiels.chargement }}</p>
  <Bandeau v-else-if="erreurChargement" ton="alerte">{{ erreurChargement }}</Bandeau>

  <div v-else-if="tournee" class="preparation">
    <ResumeErreurs ref="resume" class="preparation__large" :erreurs="erreursResumees" />

    <div class="preparation__principal">
      <!-- 1. Date et camion -->
      <Carte :titre="t.dateCamion">
        <template #actions>
          <RouterLink to="/camions" class="lien">{{ t.gererCamions }}</RouterLink>
        </template>
        <div class="date">
          <Champ
            id="tournee-date"
            v-model="form.date"
            type="date"
            :libelle="t.date"
            obligatoire
            donnees
            :erreur="erreur('date')"
            @blur="quitter('date')"
            @change="changerDate"
          />
        </div>
        <fieldset
          class="camions"
          :class="{ 'camions--erreur': erreur('modeleCamionId') }"
          role="radiogroup"
          aria-required="true"
          :aria-invalid="erreur('modeleCamionId') ? 'true' : undefined"
          :aria-describedby="erreur('modeleCamionId') ? 'tournee-camion-erreur' : undefined"
        >
          <legend class="camions__legende">
            {{ t.camion }}
            <span class="camions__mention">{{ textes.composants.obligatoire }}</span>
          </legend>
          <div class="camions__choix">
            <label
              v-for="(c, i) in camions"
              :key="c.id"
              class="camion"
              :class="{ 'camion--choisi': c.id === form.modeleCamionId }"
            >
              <input
                :id="`tournee-camion-${i}`"
                type="radio"
                name="tournee-camion"
                class="camion__radio"
                v-model="camionCoche"
                :value="c.id"
                @change="choisirCamion"
              />
              <span class="camion__nom">
                {{ c.nom }}
                <Badge v-if="c.archiveLe">{{ textes.referentiels.archive }}</Badge>
              </span>
              <span class="camion__dims donnees"
                >{{ formaterDimensions({ l: c.longueur, w: c.largeur, h: c.hauteur }) }} mm</span
              >
              <span class="camion__volume">{{ t.caisseDe(formaterVolume(c)) }}</span>
            </label>
          </div>
        </fieldset>
        <p v-if="erreur('modeleCamionId')" id="tournee-camion-erreur" class="message-erreur">
          <Icone nom="erreur" :taille="16" />
          <span>
            <span class="visuellement-cache">{{ textes.composants.prefixeErreur }} </span>
            {{ erreur('modeleCamionId') }}
          </span>
        </p>
        <p class="note">{{ t.enregistreAuto }}</p>
        <!-- Zone présente dès l'affichage : le lecteur d'écran annonce le retour. -->
        <p role="status" class="enregistre">
          <template v-if="enregistre">
            <Icone nom="coche" :taille="16" />
            {{ t.enregistre }}
            <span class="visuellement-cache">{{ enregistre === 'date' ? t.date : t.camion }}</span>
          </template>
        </p>
      </Carte>

      <!-- 2. Commandes et ordre de livraison -->
      <Carte :titre="t.commandes">
        <template #actions>
          <LienBouton :vers="`/attente?tournee=${tournee.id}`">
            {{ t.ajouterAttente }}
            <Badge v-if="attente.nombre">{{ attente.nombre }}</Badge>
          </LienBouton>
          <LienBouton :vers="`/tournees/${tournee.id}/commandes/nouvelle`" icone="plus">
            {{ t.saisir }}
          </LienBouton>
        </template>
        <p class="note note--haut">{{ t.explicationOrdre }}</p>
        <p v-if="erreur('commandes')" id="tournee-commandes" class="message-erreur" tabindex="-1">
          <Icone nom="erreur" :taille="16" />
          <span>
            <span class="visuellement-cache">{{ textes.composants.prefixeErreur }} </span>
            {{ erreur('commandes') }}
          </span>
        </p>

        <div class="tableau-cadre">
          <table class="commandes">
            <caption class="visuellement-cache">
              {{
                t.legende
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  <span class="visuellement-cache">{{ t.colonnes.poignee }}</span>
                </th>
                <th scope="col">{{ t.colonnes.livraison }}</th>
                <th scope="col">{{ t.colonnes.commande }}</th>
                <th scope="col">{{ t.colonnes.articles }}</th>
                <th scope="col" class="nombre">{{ t.colonnes.nombre }}</th>
                <th scope="col" class="nombre">{{ t.colonnes.poids }}</th>
                <th scope="col" class="nombre">{{ t.colonnes.actions }}</th>
                <th scope="col">
                  <span class="visuellement-cache">{{ t.colonnes.ouvrir }}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(c, i) in commandes"
                :key="c.commande.id"
                class="commande"
                :class="{
                  'commande--glissee': glissee === i,
                  'commande--survolee': survolee === i && glissee !== i,
                }"
                draggable="true"
                @dragstart="commencerGlisser(i, $event)"
                @dragend="finirGlisser"
                @dragover.prevent="survolee = i"
                @drop.prevent="deposer(i)"
              >
                <td class="commande__poignee" :title="t.glisser(codeDe(c))">
                  <span aria-hidden="true">⠿</span>
                </td>
                <td class="donnees commande__rang">{{ t.rang(i + 1) }}</td>
                <th scope="row" class="commande__nom">
                  <span class="commande__identite">
                    <CodeCommande :numero="c.commande.rangLivraison ?? i + 1" />
                    <span>
                      <RouterLink
                        :to="`/tournees/${tournee.id}/commandes/${c.commande.id}`"
                        class="commande__lien"
                        >{{ c.commande.destination }}</RouterLink
                      >
                      <span class="commande__detail">
                        {{ [c.commande.ville, c.commande.numero].filter(Boolean).join(' · ') }}
                      </span>
                    </span>
                  </span>
                </th>
                <td class="commande__articles">
                  {{ articlesDe(c) }}
                  <span v-if="aDesDimensionsPropres(c)" class="commande__propres">{{
                    t.dimensionsPropres
                  }}</span>
                </td>
                <td class="nombre donnees">{{ resumeDe(c).articles }}</td>
                <td class="nombre donnees">{{ formaterPoids(resumeDe(c).poids) }}</td>
                <td class="nombre">
                  <span class="commande__actions">
                    <Bouton
                      taille="petite"
                      icone="chevron-haut"
                      seulement-icone
                      :libelle="t.monter(codeDe(c))"
                      :desactive="i === 0"
                      @click="decaler(i, -1)"
                    />
                    <Bouton
                      taille="petite"
                      icone="chevron-bas"
                      seulement-icone
                      :libelle="t.descendre(codeDe(c))"
                      :desactive="i === commandes.length - 1"
                      @click="decaler(i, 1)"
                    />
                    <Bouton taille="petite" variante="texte" @click="aSupprimer = c">
                      {{ t.supprimerCommande }}
                      <span class="visuellement-cache">{{ c.commande.destination }}</span>
                    </Bouton>
                  </span>
                </td>
                <td class="commande__chevron">
                  <Icone nom="chevron-droite" :taille="16" />
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="commandes.length === 0" class="vide">
            <p class="vide__titre">{{ t.aucuneCommande }}</p>
            <p class="vide__aide">{{ t.aucuneCommandeAide }}</p>
          </div>
        </div>
      </Carte>
    </div>

    <!-- 3. Calcul du plan -->
    <Carte :titre="t.calcul" class="calcul">
      <dl class="calcul__resume">
        <dt>{{ t.resume.camion }}</dt>
        <dd class="calcul__fort">{{ camion?.nom ?? t.aChoisir }}</dd>
        <dt>{{ t.resume.caisse }}</dt>
        <dd class="donnees">
          {{
            camion
              ? `${[camion.longueur, camion.largeur, camion.hauteur].map(formaterMillimetres).join(' × ')} mm`
              : textes.referentiels.aucun
          }}
        </dd>
        <dt>{{ t.resume.commandes }}</dt>
        <dd class="donnees">{{ commandes.length }}</dd>
        <dt>{{ t.resume.articles }}</dt>
        <dd class="donnees">{{ charge.articles }}</dd>
        <dt>{{ t.resume.volume }}</dt>
        <dd class="donnees">{{ volumeAffiche }}</dd>
        <dt>{{ t.resume.poids }}</dt>
        <dd class="donnees">{{ formaterPoids(charge.poids) }}</dd>
      </dl>
      <p class="note">{{ t.noteCalcul }}</p>
      <Bouton variante="principal" taille="grande" class="calcul__bouton" @click="lancer">
        {{ calcul ? t.calculEnCours : t.lancer }}
      </Bouton>
      <p class="note">{{ t.apresCalcul }}</p>
      <p v-if="dernierPlan" class="note">
        {{ t.dernierPlan(dernierPlan.version, formaterDate(dernierPlan.calculeLe)) }}
      </p>
      <LienBouton v-if="dernierPlan" :vers="`/tournees/${props.id}/plan`" class="calcul__bouton">
        {{ t.voirPlan }}
      </LienBouton>
      <p v-if="dernierPlan?.aRecalculer" class="a-recalculer">
        <Icone nom="alerte" :taille="16" />
        <span>
          <span class="a-recalculer__titre">{{ t.aRecalculer }}</span>
          {{ t.aRecalculerAide }}
        </span>
      </p>
    </Carte>
  </div>

  <ConfirmationDialog
    :ouvert="confirmationCamion"
    :titre="t.changerCamionTitre"
    :consequence="
      t.changerCamionConsequence(
        dernierPlan?.version ?? 0,
        camion?.nom ?? '',
        camionPropose?.nom ?? '',
      )
    "
    :libelle-action="t.changerCamionAction"
    ton="neutre"
    @confirmer="appliquerCamion"
    @annuler="annulerCamion"
  />
  <ConfirmationDialog
    :ouvert="confirmationTournee"
    :titre="t.supprimerTitre(tournee?.reference ?? '')"
    :consequence="t.supprimerConsequence(commandes.length)"
    :libelle-action="t.supprimer"
    ton="danger"
    @confirmer="supprimerTournee"
    @annuler="confirmationTournee = false"
  />
  <ConfirmationDialog
    :ouvert="aSupprimer !== null"
    :titre="
      aSupprimer
        ? t.supprimerCommandeTitre(codeDe(aSupprimer), aSupprimer.commande.destination)
        : ''
    "
    :consequence="t.supprimerCommandeConsequence"
    :libelle-action="t.supprimerCommandeAction"
    ton="danger"
    @confirmer="supprimerCommande"
    @annuler="aSupprimer = null"
  />
</template>

<style scoped>
.etat {
  margin: 0;
  font: var(--typo-interface);
  color: var(--texte-doux);
}

.preparation {
  display: grid;
  grid-template-columns: minmax(0, 2.6fr) minmax(0, 1fr);
  gap: var(--espace-5);
  align-items: start;
}

.preparation__large {
  grid-column: 1 / -1;
}

.preparation__principal {
  display: flex;
  flex-direction: column;
  gap: var(--espace-5);
}

@media (width <= 1100px) {
  .preparation {
    grid-template-columns: minmax(0, 1fr);
  }
}

:deep(.preparation__statut) {
  margin-left: var(--espace-3);
  vertical-align: middle;
}

.lien {
  font: var(--typo-bouton);
  color: var(--action);
  text-decoration: none;
}

.lien:hover,
.lien:focus-visible {
  text-decoration: underline;
}

.note {
  margin: var(--espace-3) 0 0;
  font: var(--typo-legende);
  color: var(--texte-doux);
}

.note--haut {
  margin-top: 0;
}

.message-erreur {
  display: flex;
  gap: var(--espace-1);
  align-items: flex-start;
  margin: var(--espace-2) 0 0;
  font: var(--typo-legende);
  color: var(--erreur-texte);
}

/* --- Date et camion --- */

.date {
  max-width: calc(var(--espace-7) * 9);
  margin-bottom: var(--espace-4);
}

.camions {
  min-width: 0;
  padding: 0;
  margin: 0;
  border: 0;
}

.camions__legende {
  padding: 0;
  margin-bottom: var(--espace-2);
  font: var(--typo-bouton);
}

.camions__mention {
  /* Graisse normale, mais hauteur de ligne du libellé : la mention n’agrandit
     pas la ligne, et les champs d’une même rangée restent alignés. */
  font-weight: 400;
  color: var(--texte-doux);
}

.camions__choix {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(calc(var(--espace-7) * 8), 1fr));
  gap: var(--espace-2);
}

.camions--erreur .camions__choix {
  padding: var(--espace-1);
  border: 2px solid var(--erreur);
  border-radius: var(--rayon-carte);
}

.camion {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--espace-1) var(--espace-2);
  padding: var(--espace-3);
  cursor: pointer;
  background: var(--surface);
  border: 1px solid var(--bordure-controle);
  border-radius: var(--rayon-controle);
}

.camion:hover {
  background: var(--surface-survol);
}

/* Camion choisi : contour épais `encre`, en plus du bouton radio coché. */
.camion--choisi {
  border: 2px solid var(--encre);
}

.camion__radio {
  grid-row: 1;
  margin: 0;
  accent-color: var(--action);
}

.camion__nom {
  display: inline-flex;
  gap: var(--espace-2);
  align-items: center;
  font: var(--typo-bouton);
}

.camion__dims,
.camion__volume {
  grid-column: 1 / -1;
  color: var(--texte-doux);
}

.camion__volume {
  font: var(--typo-legende);
}

/* --- Commandes --- */

.tableau-cadre {
  margin: var(--espace-3) calc(var(--espace-4) * -1) calc(var(--espace-4) * -1);
  overflow-x: auto;
  border-top: 1px solid var(--bordure);
}

.commandes {
  width: 100%;
  border-collapse: collapse;
}

.commandes th,
.commandes td {
  padding: var(--espace-3);
  font: var(--typo-interface);
  text-align: left;
  vertical-align: middle;
  border-bottom: 1px solid var(--bordure);
}

.commandes thead th {
  font: var(--typo-legende);
  color: var(--texte-doux);
}

.commandes .nombre {
  text-align: right;
  white-space: nowrap;
}

/* Lien étiré : toute la ligne ouvre la commande, un seul lien au clavier. */
.commande {
  position: relative;
}

.commande:hover {
  background: var(--surface-survol);
}

.commande--glissee {
  background: var(--surface-survol);
}

.commande--survolee {
  outline: 2px dashed var(--action);
  outline-offset: -2px;
}

.commande__poignee {
  color: var(--texte-doux);
  cursor: grab;
}

.commande__rang {
  white-space: nowrap;
}

.commande__identite {
  display: flex;
  gap: var(--espace-2);
  align-items: flex-start;
}

.commande__lien {
  display: block;
  font: var(--typo-bouton);
  color: var(--action);
  text-decoration: none;
}

.commande__lien::after {
  position: absolute;
  inset: 0;
  content: '';
}

.commande__lien:hover,
.commande__lien:focus-visible {
  text-decoration: underline;
}

.commande__detail {
  font: var(--typo-legende);
  color: var(--texte-doux);
}

.commande__articles {
  max-width: calc(var(--espace-7) * 9);
}

.commande__propres {
  display: block;
  font: var(--typo-legende);
  color: var(--texte-doux);
}

/* Les autres boutons de la ligne passent au-dessus du lien étiré. */
.commande__actions {
  position: relative;
  z-index: 1;
  display: inline-flex;
  gap: var(--espace-1);
  align-items: center;
}

.commande__poignee,
.commande__chevron {
  position: relative;
  z-index: 1;
  width: var(--espace-5);
  color: var(--texte-doux);
}

.commande__chevron {
  z-index: auto;
}

.vide {
  padding: var(--espace-5) var(--espace-4);
}

.vide__titre {
  margin: 0;
  font: var(--typo-bouton);
}

.vide__aide {
  margin: var(--espace-1) 0 0;
  font: var(--typo-interface);
  color: var(--texte-doux);
}

/* --- Calcul --- */

.calcul__resume {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--espace-2) var(--espace-4);
  margin: 0;
  font: var(--typo-interface);
}

.calcul__resume dt {
  color: var(--texte-doux);
}

.calcul__resume dd {
  margin: 0;
}

.calcul__fort {
  font: var(--typo-bouton);
}

.enregistre {
  display: flex;
  gap: var(--espace-1);
  align-items: center;
  min-height: var(--espace-5);
  margin: var(--espace-2) 0 0;
  font: var(--typo-legende);
  color: var(--texte-fort);
}

.a-recalculer {
  display: flex;
  gap: var(--espace-2);
  align-items: flex-start;
  padding: var(--espace-2) var(--espace-3);
  margin: var(--espace-3) 0 0;
  font: var(--typo-legende);
  border: 1px solid var(--alerte-bordure);
  border-radius: var(--rayon-controle);
}

.a-recalculer__titre {
  display: block;
  font: var(--typo-bouton);
  color: var(--alerte-texte);
}

.calcul__bouton {
  width: 100%;
  margin-top: var(--espace-4);
}
</style>
