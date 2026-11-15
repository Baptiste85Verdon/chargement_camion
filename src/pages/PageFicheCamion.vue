<script setup lang="ts">
/**
 * Fiche camion (captures 09b et 09e ; cahier fonctionnel 4.7 ; RG-21, RG-22).
 * Sert à la création (/camions/nouveau) et à la modification (/camions/:id).
 *
 * Règles propres au camion (RG-21) :
 * - utilisé par une tournée en préparation, prête ou en chargement : ni
 *   suppression ni archivage, avec un message qui cite ces tournées ;
 * - utilisé seulement par des tournées chargées : il s'archive ;
 * - enregistrer un modèle utilisé par une tournée en cours demande
 *   confirmation (RG-22) : ses plans seront à recalculer.
 */
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { ModeleCamion, Tournee } from '@/domaine/modele'
import {
  camionDepuisFormulaire,
  formulaireDepuisCamion,
  formulaireVideCamion,
  tourneesDuCamion,
} from '@/domaine/saisie-camion'
import {
  lireMillimetres,
  validerCamion,
  validerSuppressionCamion,
  type SaisieCamion,
} from '@/domaine/validation'
import { ErreurDonnees } from '@/donnees/erreurs'
import { useAnnonces } from '@/stores/annonces'
import { utiliserDepots } from '@/stores/depots'
import { textes } from '@/textes/fr'
import Annonce from '@/composants/Annonce.vue'
import Badge from '@/composants/Badge.vue'
import Bandeau from '@/composants/Bandeau.vue'
import Bouton from '@/composants/Bouton.vue'
import Carte from '@/composants/Carte.vue'
import Champ from '@/composants/Champ.vue'
import ConfirmationDialog from '@/composants/ConfirmationDialog.vue'
import EntetePage from '@/composants/EntetePage.vue'
import PlanCaisse from '@/composants/PlanCaisse.vue'
import ResumeErreurs, { type ErreurResumee } from '@/composants/ResumeErreurs.vue'
import { formaterVolume } from '@/composants/format'
import { utiliserConfirmationSortie } from '@/composants/sortie'
import { utiliserVerification } from '@/composants/verification'

const props = withDefaults(defineProps<{ id?: string }>(), { id: undefined })

const t = textes.ficheCamion
const depots = utiliserDepots()
const annonces = useAnnonces()
const routeur = useRouter()
const creation = props.id === undefined

// --- Données ------------------------------------------------------------------

const chargement = ref(true)
const erreurChargement = ref('')
const origine = ref<ModeleCamion | null>(null)
const tournees = ref<Tournee[]>([])

const form = ref<SaisieCamion>(formulaireVideCamion())
const reference = ref(JSON.stringify(form.value))
const modifie = computed(() => JSON.stringify(form.value) !== reference.value)

const annonce = ref('')
const tonAnnonce = ref<'info' | 'alerte'>('info')

async function charger() {
  try {
    const [camion, toutes] = await Promise.all([
      props.id ? depots.camions.obtenir(props.id) : Promise.resolve(null),
      depots.tournees.lister(),
    ])
    tournees.value = toutes
    if (props.id && !camion) {
      erreurChargement.value = t.introuvable
      return
    }
    if (camion) {
      origine.value = camion
      form.value = formulaireDepuisCamion(camion)
      reference.value = JSON.stringify(form.value)
    }
  } catch (erreur) {
    erreurChargement.value =
      erreur instanceof ErreurDonnees ? erreur.message : textes.donnees.reseau
  } finally {
    chargement.value = false
  }
}

onMounted(async () => {
  await charger()
  annonce.value = annonces.reprendre()
})

const siennes = computed(() =>
  origine.value
    ? tourneesDuCamion(origine.value.id, tournees.value)
    : { enCours: [], chargees: [] },
)
const listeTournees = computed(() =>
  [...siennes.value.enCours, ...siennes.value.chargees]
    .map((tr) => t.tournee(tr.reference, textes.statutsTournee[tr.statut]))
    .join(', '),
)

// --- Vérification (RG-21) -----------------------------------------------------

const verification = utiliserVerification(() => validerCamion(form.value))
const { erreur, quitter } = verification

const CHAMPS: Record<string, { id: string; libelle: string }> = {
  nom: { id: 'camion-nom', libelle: t.nom },
  longueur: { id: 'camion-longueur', libelle: t.longueur },
  largeur: { id: 'camion-largeur', libelle: t.largeur },
  hauteur: { id: 'camion-hauteur', libelle: t.hauteur },
}

const erreursResumees = computed<ErreurResumee[]>(() =>
  verification.erreursResumees.value.map((p) => ({
    champId: CHAMPS[p.champ]?.id ?? p.champ,
    libelle: CHAMPS[p.champ]?.libelle ?? p.champ,
    message: p.message,
  })),
)
const resume = ref<InstanceType<typeof ResumeErreurs> | null>(null)

// --- Valeurs lisibles, pour le volume et le plan --------------------------------

const longueur = computed(() => lireMillimetres(form.value.longueur))
const largeur = computed(() => lireMillimetres(form.value.largeur))
const hauteur = computed(() => lireMillimetres(form.value.hauteur))
const volume = computed(() =>
  longueur.value && largeur.value && hauteur.value
    ? formaterVolume({ longueur: longueur.value, largeur: largeur.value, hauteur: hauteur.value })
    : textes.referentiels.aucun,
)

const titre = computed(() => form.value.nom.trim() || origine.value?.nom || t.nouveau)
const ariane = computed(() => [
  { libelle: textes.navigation.accueil, vers: '/' },
  { libelle: textes.camions.titre, vers: '/camions' },
  { libelle: origine.value?.nom ?? t.nouveau },
])

// --- Enregistrer ---------------------------------------------------------------

const sortie = utiliserConfirmationSortie(modifie)
const fenetre = ref<'enregistrer' | 'supprimer' | 'archiver' | null>(null)

async function enregistrer() {
  if (!verification.soumettre()) {
    await nextTick()
    resume.value?.focaliser()
    return
  }
  // RG-22 : un modèle utilisé par une tournée en cours se modifie après confirmation.
  if (!creation && modifie.value && siennes.value.enCours.length > 0) {
    fenetre.value = 'enregistrer'
    return
  }
  await ecrire()
}

async function ecrire() {
  fenetre.value = null
  try {
    const camion = await depots.camions.enregistrer(
      camionDepuisFormulaire(form.value, origine.value ?? undefined),
    )
    if (creation) {
      annonces.deposer(t.enregistre(camion.nom))
      sortie.permettre()
      await routeur.replace(`/camions/${camion.id}`)
      return
    }
    origine.value = camion
    form.value = formulaireDepuisCamion(camion)
    reference.value = JSON.stringify(form.value)
    tonAnnonce.value = 'info'
    annonce.value = t.enregistre(camion.nom)
  } catch (e) {
    alerter(e)
  }
}

function alerter(e: unknown) {
  tonAnnonce.value = 'alerte'
  annonce.value = e instanceof ErreurDonnees ? e.message : textes.donnees.reseau
}

// --- Supprimer, archiver, réactiver (RG-21, RG-22) --------------------------------

/**
 * Refus de RG-21 : le modèle sert à une tournée en cours. Le message cite
 * ces tournées ; c'est une information, pas une fenêtre de confirmation.
 */
function refuserSiEnCours(): boolean {
  if (!origine.value) return true
  const { erreurs } = validerSuppressionCamion(origine.value, tournees.value)
  if (erreurs.length === 0) return false
  tonAnnonce.value = 'alerte'
  annonce.value = erreurs.map((p) => p.message).join(' ')
  return true
}

async function actualiserTournees() {
  try {
    tournees.value = await depots.tournees.lister()
  } catch (e) {
    alerter(e)
  }
}

async function demanderSuppression() {
  await actualiserTournees()
  if (refuserSiEnCours()) return
  fenetre.value = siennes.value.chargees.length > 0 ? 'archiver' : 'supprimer'
}

async function demanderArchivage() {
  await actualiserTournees()
  if (refuserSiEnCours()) return
  await archiver()
}

async function revenirALaListe(message: string) {
  annonces.deposer(message)
  sortie.permettre()
  await routeur.push('/camions')
}

async function supprimer() {
  const camion = origine.value
  if (!camion) return
  try {
    await depots.camions.supprimer(camion.id)
    fenetre.value = null
    await revenirALaListe(textes.camions.supprime(camion.nom))
  } catch (e) {
    if (e instanceof ErreurDonnees && e.code === 'utilise') {
      fenetre.value = 'archiver'
      return
    }
    fenetre.value = null
    alerter(e)
  }
}

async function archiver() {
  const camion = origine.value
  if (!camion) return
  try {
    await depots.camions.archiver(camion.id)
    fenetre.value = null
    await revenirALaListe(textes.camions.archive(camion.nom))
  } catch (e) {
    fenetre.value = null
    if (e instanceof ErreurDonnees && e.code === 'utilise') {
      // Une tournée a pris ce camion entre-temps : on relit et on explique.
      await actualiserTournees()
      if (refuserSiEnCours()) return
    }
    alerter(e)
  }
}

async function reactiver() {
  const camion = origine.value
  if (!camion) return
  try {
    await depots.camions.reactiver(camion.id)
    const actif = { ...camion }
    delete actif.archiveLe
    origine.value = actif
    tonAnnonce.value = 'info'
    annonce.value = textes.camions.reactive(camion.nom)
  } catch (e) {
    alerter(e)
  }
}
</script>

<template>
  <EntetePage :titre="titre" :ariane="ariane">
    <template v-if="!chargement && !erreurChargement" #actions>
      <template v-if="origine">
        <Bouton v-if="origine.archiveLe" @click="reactiver">{{ t.reactiver }}</Bouton>
        <template v-else>
          <Bouton @click="demanderSuppression">{{ t.supprimer }}</Bouton>
          <Bouton @click="demanderArchivage">{{ t.archiver }}</Bouton>
        </template>
      </template>
      <Bouton variante="principal" taille="grande" type="submit" form="formulaire-camion">
        {{ t.enregistrer }}
      </Bouton>
    </template>
  </EntetePage>

  <Annonce :message="annonce" :ton="tonAnnonce" />

  <p v-if="chargement" class="etat">{{ textes.referentiels.chargement }}</p>
  <Bandeau v-else-if="erreurChargement" ton="alerte">{{ erreurChargement }}</Bandeau>

  <div v-else class="fiche">
    <ResumeErreurs ref="resume" class="fiche__large" :erreurs="erreursResumees" />

    <Bandeau v-if="origine?.archiveLe" ton="info" class="fiche__large">
      <Badge>{{ textes.referentiels.archive }}</Badge>
      {{ t.archiveBandeau }}
    </Bandeau>

    <form id="formulaire-camion" novalidate @submit.prevent="enregistrer">
      <Carte :titre="t.caisse">
        <div class="champs">
          <Champ
            id="camion-nom"
            v-model="form.nom"
            :libelle="t.nom"
            obligatoire
            :erreur="erreur('nom')"
            @blur="quitter('nom')"
          />
          <div
            v-for="champ in ['longueur', 'largeur', 'hauteur'] as const"
            :key="champ"
            class="champs__mm"
          >
            <Champ
              :id="`camion-${champ}`"
              v-model="form[champ]"
              :libelle="t[champ]"
              unite="mm"
              inputmode="numeric"
              donnees
              obligatoire
              :erreur="erreur(champ)"
              @blur="quitter(champ)"
            />
          </div>
        </div>
        <dl class="resume-caisse">
          <dt>{{ t.volume }}</dt>
          <dd class="donnees">{{ volume }}</dd>
          <dt>{{ t.tournees }}</dt>
          <dd>{{ listeTournees || t.aucune }}</dd>
        </dl>
        <p class="note">{{ t.note }}</p>
      </Carte>
    </form>

    <Carte :titre="t.plan">
      <div class="plans">
        <PlanCaisse :titre="t.vueDessus" :longueur="longueur" :travers="largeur" />
        <PlanCaisse :titre="t.vueCote" :longueur="longueur" :travers="hauteur" plancher />
      </div>
    </Carte>
  </div>

  <ConfirmationDialog
    :ouvert="fenetre === 'enregistrer'"
    :titre="t.enregistrerTitre(origine?.nom ?? '')"
    :consequence="t.enregistrerConsequence(siennes.enCours.map((tr) => tr.reference).join(', '))"
    :libelle-action="t.enregistrer"
    ton="neutre"
    @confirmer="ecrire"
    @annuler="fenetre = null"
  />
  <ConfirmationDialog
    :ouvert="fenetre === 'supprimer'"
    :titre="t.supprimerTitre(origine?.nom ?? '')"
    :consequence="t.supprimerConsequence"
    :libelle-action="t.supprimer"
    ton="danger"
    @confirmer="supprimer"
    @annuler="fenetre = null"
  />
  <ConfirmationDialog
    :ouvert="fenetre === 'archiver'"
    :titre="t.archiverTitre(origine?.nom ?? '')"
    :consequence="t.archiverConsequence(Math.max(1, siennes.chargees.length))"
    :libelle-action="t.archiver"
    ton="neutre"
    @confirmer="archiver"
    @annuler="fenetre = null"
  />
  <ConfirmationDialog
    :ouvert="sortie.ouverte.value"
    :titre="textes.referentiels.quitterTitre"
    :consequence="textes.referentiels.quitterConsequence"
    :libelle-action="textes.referentiels.quitterAction"
    ton="danger"
    @confirmer="sortie.confirmer"
    @annuler="sortie.annuler"
  />
</template>

<style scoped>
.etat {
  margin: 0;
  font: var(--typo-interface);
  color: var(--texte-doux);
}

.fiche {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2.5fr);
  gap: var(--espace-5);
  align-items: start;
}

.fiche__large {
  grid-column: 1 / -1;
}

@media (width <= 960px) {
  .fiche {
    grid-template-columns: minmax(0, 1fr);
  }
}

.champs {
  display: flex;
  flex-direction: column;
  gap: var(--espace-4);
}

.champs__mm {
  max-width: calc(var(--espace-7) * 7);
}

.resume-caisse {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--espace-2) var(--espace-6);
  padding-top: var(--espace-4);
  margin: var(--espace-4) 0 0;
  font: var(--typo-interface);
  border-top: 1px solid var(--bordure);
}

.resume-caisse dt {
  font: var(--typo-bouton);
}

.resume-caisse dd {
  margin: 0;
}

.note {
  margin: var(--espace-4) 0 0;
  font: var(--typo-legende);
  color: var(--texte-doux);
}

.plans {
  display: flex;
  flex-direction: column;
  gap: var(--espace-6);
  max-width: calc(var(--espace-7) * 22);
}
</style>
