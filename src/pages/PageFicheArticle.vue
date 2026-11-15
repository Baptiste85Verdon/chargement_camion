<script setup lang="ts">
/**
 * Fiche article (captures 08 et 08e ; cahier fonctionnel 4.6 ; RG-02, RG-04,
 * RG-18, RG-21, RG-22). Sert à la création (/catalogue/nouveau) et à la
 * modification (/catalogue/:id).
 *
 * Écarts connus de la maquette, corrigés ici :
 * - dimensions enregistrées et affichées à plat, avec la mention « à plat » ;
 * - pas de champ « Poids nu » : le poids retenu est le poids maximal (RG-05) ;
 * - « Dessus porteur » désactivé, avec une explication, quand « Fragile » est
 *   coché : un article fragile ne supporte rien (RG-04) ;
 * - orientations en erreur : contour standard de 2 px, coins `rayon-controle`.
 */
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  FAMILLES,
  estActif,
  type FicheArticle,
  type ModeleCamion,
  type Tournee,
} from '@/domaine/modele'
import {
  articleDepuisFormulaire,
  formulaireDepuisArticle,
  formulaireVide,
  porteurParDefaut,
  type FormulaireArticle,
} from '@/domaine/saisie-article'
import type { Orientation } from '@/domaine/types'
import { ORIENTATIONS_PAR_DEFAUT, lireMillimetres, validerArticle } from '@/domaine/validation'
import type { CommandeAvecLignes } from '@/donnees/depots'
import { ErreurDonnees } from '@/donnees/erreurs'
import { useAnnonces } from '@/stores/annonces'
import { utiliserDepots } from '@/stores/depots'
import { textes } from '@/textes/fr'
import Annonce from '@/composants/Annonce.vue'
import ApercuArticle from '@/composants/ApercuArticle.vue'
import Badge from '@/composants/Badge.vue'
import Bandeau from '@/composants/Bandeau.vue'
import Bouton from '@/composants/Bouton.vue'
import Carte from '@/composants/Carte.vue'
import CaseACocher from '@/composants/CaseACocher.vue'
import Champ from '@/composants/Champ.vue'
import ChampDimensions from '@/composants/ChampDimensions.vue'
import ChampListe from '@/composants/ChampListe.vue'
import ConfirmationDialog from '@/composants/ConfirmationDialog.vue'
import EntetePage from '@/composants/EntetePage.vue'
import Icone from '@/composants/Icone.vue'
import ResumeErreurs, { type ErreurResumee } from '@/composants/ResumeErreurs.vue'
import { utiliserConfirmationSortie } from '@/composants/sortie'
import { utiliserVerification } from '@/composants/verification'

const props = withDefaults(defineProps<{ id?: string }>(), { id: undefined })

const t = textes.ficheArticle
const depots = utiliserDepots()
const annonces = useAnnonces()
const routeur = useRouter()
const creation = props.id === undefined

// --- Données ------------------------------------------------------------------

const chargement = ref(true)
const erreurChargement = ref('')
/** La fiche telle qu'enregistrée ; `null` pour un nouvel article. */
const origine = ref<FicheArticle | null>(null)
const catalogue = ref<FicheArticle[]>([])
const camions = ref<ModeleCamion[]>([])
const commandes = ref<CommandeAvecLignes[]>([])
const tournees = ref<Tournee[]>([])

const form = ref<FormulaireArticle>(formulaireVide())
/** Le formulaire tel qu'au chargement ou au dernier enregistrement. */
const reference = ref(JSON.stringify(form.value))
const modifie = computed(() => JSON.stringify(form.value) !== reference.value)

const annonce = ref('')
const tonAnnonce = ref<'info' | 'alerte'>('info')

async function charger() {
  try {
    const [article, tous, modeles] = await Promise.all([
      props.id ? depots.articles.obtenir(props.id) : Promise.resolve(null),
      depots.articles.lister({ avecArchives: true }),
      depots.camions.lister({ avecArchives: true }),
    ])
    catalogue.value = tous
    camions.value = modeles
    if (props.id && !article) {
      erreurChargement.value = t.introuvable
      return
    }
    if (article) {
      origine.value = article
      form.value = formulaireDepuisArticle(article)
      reference.value = JSON.stringify(form.value)
      ;[commandes.value, tournees.value] = await Promise.all([
        depots.commandes.listerParArticle(article.id),
        depots.tournees.lister(),
      ])
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

// --- Vérification (RG-21) -----------------------------------------------------

const verification = utiliserVerification(() =>
  validerArticle(form.value, { catalogue: catalogue.value, camions: camions.value }),
)
const { erreur, avertissement, quitter } = verification

/** Où mène chaque lien du résumé, et sous quel libellé. */
const CHAMPS: Record<string, { id: string; libelle: string }> = {
  nom: { id: 'article-nom', libelle: t.nom },
  reference: { id: 'article-reference', libelle: t.reference },
  famille: { id: 'article-famille', libelle: t.famille },
  dimsEmballees: { id: 'article-emballe-l', libelle: t.tailleEmballee },
  poids: { id: 'article-poids', libelle: t.poids },
  dimsNues: { id: 'article-nu-l', libelle: t.tailleNue },
  orientations: { id: 'article-orientation-aPlat', libelle: t.orientations },
}

const erreursResumees = computed<ErreurResumee[]>(() =>
  verification.erreursResumees.value.map((p) => ({
    champId: CHAMPS[p.champ]?.id ?? p.champ,
    libelle: CHAMPS[p.champ]?.libelle ?? p.champ,
    message: p.message,
  })),
)
const resume = ref<InstanceType<typeof ResumeErreurs> | null>(null)

// --- Valeurs proposées par défaut ----------------------------------------------

/** L'utilisateur a-t-il touché aux orientations ou au dessus porteur ? */
const orientationsTouchees = ref(false)
const porteurTouche = ref(false)
/** Famille dont les orientations viennent d'être proposées, pour le dire. */
const famillePropose = ref('')

// CF 4.6 : à la création, les orientations sont proposées selon la famille
// (RG-04), tant que l'utilisateur ne les a pas choisies lui-même.
watch(
  () => form.value.famille,
  (famille) => {
    if (!creation || orientationsTouchees.value) return
    const proposees = ORIENTATIONS_PAR_DEFAUT[famille as keyof typeof ORIENTATIONS_PAR_DEFAUT]
    form.value.orientations = proposees ? [...proposees] : []
    famillePropose.value = proposees ? famille : ''
  },
)

// RG-18 : dessus non porteur par défaut pour une forme non rectangulaire.
watch(
  () => form.value.forme,
  (forme) => {
    if (!porteurTouche.value) form.value.porteur = porteurParDefaut(forme)
  },
)

const ORIENTATIONS: Orientation[] = ['aPlat', 'debout', 'contreParoi']

function basculerOrientation(orientation: Orientation, cochee: boolean) {
  orientationsTouchees.value = true
  famillePropose.value = ''
  const autres = form.value.orientations.filter((o) => o !== orientation)
  // On garde l'ordre à plat, debout, contre une paroi.
  form.value.orientations = cochee
    ? ORIENTATIONS.filter((o) => o === orientation || autres.includes(o))
    : autres
  quitter('orientations')
}

/** « Dessus porteur » affiché : jamais coché pour un article fragile (RG-04). */
const porteurAffiche = computed({
  get: () => form.value.porteur && !form.value.fragile,
  set: (valeur: boolean) => {
    porteurTouche.value = true
    form.value.porteur = valeur
  },
})

const aidePorteur = computed(() => {
  if (form.value.fragile) return t.porteurFragile
  return form.value.forme === 'rectangulaire' ? t.porteurAide : t.porteurNonRectangulaire
})

// --- Aperçu ------------------------------------------------------------------

/** Dimensions lisibles d'un groupe, pour l'aperçu ; rien tant qu'il en manque. */
function dimsLisibles(d: FormulaireArticle['dimsEmballees']) {
  const [l, w, h] = [d.l, d.w, d.h].map(lireMillimetres)
  return l && w && h ? { l, w, h } : undefined
}
const apercuEmballe = computed(() => dimsLisibles(form.value.dimsEmballees))
const apercuNu = computed(() =>
  form.value.livrableNu ? dimsLisibles(form.value.dimsNues) : undefined,
)

// --- Commandes en cours -------------------------------------------------------

/** Commandes qui ne sont pas encore livrées : en attente, ou dans une tournée non chargée. */
const commandesEnCours = computed(() =>
  commandes.value
    .map(({ commande }) => ({
      commande,
      tournee: tournees.value.find((tr) => tr.id === commande.tourneeId),
    }))
    .filter(
      ({ commande, tournee }) => commande.tourneeId === null || tournee?.statut !== 'chargee',
    ),
)

// --- Titre ---------------------------------------------------------------------

const titre = computed(() => form.value.nom.trim() || origine.value?.nom || t.nouveau)
const ariane = computed(() => [
  { libelle: textes.navigation.accueil, vers: '/' },
  { libelle: textes.navigation.catalogue, vers: '/catalogue' },
  { libelle: origine.value?.nom ?? t.nouveau },
])

// --- Enregistrer ---------------------------------------------------------------

const sortie = utiliserConfirmationSortie(modifie)

async function enregistrer() {
  if (!verification.soumettre()) {
    await nextTick()
    resume.value?.focaliser()
    return
  }
  try {
    const article = await depots.articles.enregistrer(
      articleDepuisFormulaire(form.value, origine.value ?? undefined),
    )
    if (creation) {
      annonces.deposer(t.enregistre(article.nom))
      sortie.permettre()
      await routeur.replace(`/catalogue/${article.id}`)
      return
    }
    origine.value = article
    form.value = formulaireDepuisArticle(article)
    reference.value = JSON.stringify(form.value)
    tonAnnonce.value = 'info'
    annonce.value = t.enregistre(article.nom)
  } catch (e) {
    if (e instanceof ErreurDonnees && e.champ && CHAMPS[e.champ]) {
      // La base refuse une valeur (référence prise entre-temps) : sous le champ.
      const autre = catalogue.value.find(
        (a) =>
          estActif(a) && a.id !== origine.value?.id && a.reference === form.value.reference.trim(),
      )
      verification.signalerErreurServeur({
        champ: e.champ,
        code: 'doublon',
        message:
          e.code === 'doublon' && e.champ === 'reference' && autre
            ? textes.validation.article.referenceDejaPrise(autre.nom)
            : e.message,
      })
      await nextTick()
      resume.value?.focaliser()
    } else {
      tonAnnonce.value = 'alerte'
      annonce.value = e instanceof ErreurDonnees ? e.message : textes.donnees.reseau
    }
  }
}

// --- Supprimer, archiver, réactiver (RG-21, RG-22) --------------------------------

/** Fenêtre ouverte : suppression d'un article inutilisé, ou proposition d'archiver. */
const fenetre = ref<'supprimer' | 'archiver' | null>(null)
const utilisations = ref(0)

async function demanderSuppression() {
  if (!origine.value) return
  try {
    utilisations.value = (await depots.commandes.listerParArticle(origine.value.id)).length
    fenetre.value = utilisations.value > 0 ? 'archiver' : 'supprimer'
  } catch (e) {
    tonAnnonce.value = 'alerte'
    annonce.value = e instanceof ErreurDonnees ? e.message : textes.donnees.reseau
  }
}

/** Revient au catalogue, qui affichera le message. */
async function revenirAuCatalogue(message: string) {
  annonces.deposer(message)
  sortie.permettre()
  await routeur.push('/catalogue')
}

async function supprimer() {
  const article = origine.value
  if (!article) return
  try {
    await depots.articles.supprimer(article.id)
    fenetre.value = null
    await revenirAuCatalogue(textes.catalogue.supprime(article.nom))
  } catch (e) {
    if (e instanceof ErreurDonnees && e.code === 'utilise') {
      // Utilisé entre-temps : on propose l'archivage à la place.
      utilisations.value = Math.max(1, utilisations.value)
      fenetre.value = 'archiver'
      return
    }
    fenetre.value = null
    tonAnnonce.value = 'alerte'
    annonce.value = e instanceof ErreurDonnees ? e.message : textes.donnees.reseau
  }
}

async function archiver() {
  const article = origine.value
  if (!article) return
  try {
    await depots.articles.archiver(article.id)
    fenetre.value = null
    await revenirAuCatalogue(textes.catalogue.archive(article.nom))
  } catch (e) {
    fenetre.value = null
    tonAnnonce.value = 'alerte'
    annonce.value = e instanceof ErreurDonnees ? e.message : textes.donnees.reseau
  }
}

async function reactiver() {
  const article = origine.value
  if (!article) return
  try {
    await depots.articles.reactiver(article.id)
    const actif = { ...article }
    delete actif.archiveLe
    origine.value = actif
    tonAnnonce.value = 'info'
    annonce.value = textes.catalogue.reactive(article.nom)
  } catch (e) {
    tonAnnonce.value = 'alerte'
    const autre = catalogue.value.find(
      (a) => estActif(a) && a.id !== article.id && a.reference === article.reference,
    )
    annonce.value =
      e instanceof ErreurDonnees && e.code === 'doublon'
        ? textes.catalogue.referenceReprise(article.nom, article.reference ?? '', autre?.nom ?? '')
        : e instanceof ErreurDonnees
          ? e.message
          : textes.donnees.reseau
  }
}
</script>

<template>
  <EntetePage :titre="titre" :mention="form.reference.trim() || undefined" :ariane="ariane">
    <template v-if="!chargement && !erreurChargement" #actions>
      <template v-if="origine">
        <Bouton v-if="origine.archiveLe" @click="reactiver">{{ t.reactiver }}</Bouton>
        <template v-else>
          <Bouton @click="demanderSuppression">{{ t.supprimer }}</Bouton>
          <Bouton @click="archiver">{{ t.archiver }}</Bouton>
        </template>
      </template>
      <Bouton variante="principal" taille="grande" type="submit" form="formulaire-article">
        {{ t.enregistrer }}
      </Bouton>
    </template>
  </EntetePage>

  <Annonce :message="annonce" :ton="tonAnnonce" />

  <p v-if="chargement" class="etat">{{ textes.referentiels.chargement }}</p>
  <Bandeau v-else-if="erreurChargement" ton="alerte">{{ erreurChargement }}</Bandeau>

  <div v-else class="fiche">
    <ResumeErreurs ref="resume" class="fiche__resume" :erreurs="erreursResumees" />

    <Bandeau v-if="origine?.archiveLe" ton="info" class="fiche__resume">
      <Badge>{{ textes.referentiels.archive }}</Badge>
      {{ t.archiveBandeau }}
    </Bandeau>

    <form id="formulaire-article" class="fiche__principal" novalidate @submit.prevent="enregistrer">
      <Carte :titre="t.identification">
        <div class="grille grille--identification">
          <Champ
            id="article-nom"
            v-model="form.nom"
            :libelle="t.nom"
            obligatoire
            :erreur="erreur('nom')"
            :avertissement="avertissement('nom')"
            @blur="quitter('nom')"
          />
          <Champ
            id="article-reference"
            v-model="form.reference"
            :libelle="t.reference"
            :erreur="erreur('reference')"
            @blur="quitter('reference')"
          />
          <ChampListe
            id="article-famille"
            v-model="form.famille"
            :libelle="t.famille"
            :options="FAMILLES"
            :invite="t.choisirFamille"
            obligatoire
            :erreur="erreur('famille')"
            @blur="quitter('famille')"
          />
        </div>
      </Carte>

      <Carte :titre="t.taillesEtPoids">
        <template #actions>
          <span class="fiche__ordre">{{ t.ordreDimensions }}</span>
        </template>
        <div class="grille grille--tailles">
          <div class="groupe">
            <ChampDimensions
              id="article-emballe"
              v-model="form.dimsEmballees"
              :legende="t.tailleEmballee"
              obligatoire
              :erreur="erreur('dimsEmballees')"
              :avertissement="avertissement('dimsEmballees')"
              @quitter="quitter('dimsEmballees')"
            />
            <div class="groupe__poids">
              <Champ
                id="article-poids"
                v-model="form.poids"
                :libelle="t.poids"
                unite="kg"
                inputmode="decimal"
                donnees
                obligatoire
                :erreur="erreur('poids')"
                @blur="quitter('poids')"
              />
            </div>
          </div>
          <div class="groupe">
            <CaseACocher
              id="article-livrable-nu"
              v-model="form.livrableNu"
              :libelle="t.livrableNu"
            />
            <!-- Case décochée : les champs nus sont masqués (RG-21). -->
            <ChampDimensions
              v-if="form.livrableNu"
              id="article-nu"
              v-model="form.dimsNues"
              :legende="t.tailleNue"
              obligatoire
              :erreur="erreur('dimsNues')"
              @quitter="quitter('dimsNues')"
            />
          </div>
        </div>
        <p class="fiche__note">{{ t.noteBoite }}</p>
        <p class="fiche__note fiche__note--doux">{{ t.noteDefaut }}</p>
      </Carte>

      <Carte :titre="t.reglesPlacement">
        <div class="regles">
          <CaseACocher
            id="article-fragile"
            v-model="form.fragile"
            :libelle="t.fragile"
            :aide="t.fragileAide"
          />

          <fieldset class="regles__groupe">
            <legend class="regles__legende">{{ t.forme }}</legend>
            <div class="regles__options">
              <label v-for="(libelle, forme) in textes.formes" :key="forme" class="regles__option">
                <input v-model="form.forme" type="radio" name="forme" :value="forme" />
                {{ libelle }}
              </label>
            </div>
          </fieldset>

          <CaseACocher
            id="article-porteur"
            v-model="porteurAffiche"
            :libelle="t.porteur"
            :aide="aidePorteur"
            :desactive="form.fragile"
          />

          <fieldset
            class="regles__groupe"
            :aria-describedby="
              erreur('orientations') || avertissement('orientations') || famillePropose
                ? 'article-orientations-message'
                : undefined
            "
          >
            <legend class="regles__legende">
              {{ t.orientations }}
              <span class="regles__mention">{{ textes.composants.obligatoire }}</span>
            </legend>
            <div
              class="regles__options regles__options--cadre"
              :class="{ 'regles__options--erreur': erreur('orientations') }"
            >
              <label v-for="o in ORIENTATIONS" :key="o" class="regles__option">
                <input
                  :id="`article-orientation-${o}`"
                  type="checkbox"
                  :checked="form.orientations.includes(o)"
                  :aria-invalid="erreur('orientations') ? 'true' : undefined"
                  @change="basculerOrientation(o, ($event.target as HTMLInputElement).checked)"
                />
                {{ textes.orientations[o] }}
              </label>
            </div>
            <p
              v-if="erreur('orientations')"
              id="article-orientations-message"
              class="message message--erreur"
            >
              <Icone nom="erreur" :taille="16" />
              <span>
                <span class="visuellement-cache">{{ textes.composants.prefixeErreur }} </span>
                {{ erreur('orientations') }}
              </span>
            </p>
            <p
              v-else-if="avertissement('orientations')"
              id="article-orientations-message"
              class="message message--avertissement"
            >
              <Icone nom="alerte" :taille="16" />
              <span>
                <span class="visuellement-cache"
                  >{{ textes.composants.prefixeAvertissement }}
                </span>
                {{ avertissement('orientations') }}
              </span>
            </p>
            <p v-else-if="famillePropose" id="article-orientations-message" class="message">
              <Icone nom="info" :taille="16" />
              <span>{{ t.orientationsParDefaut(famillePropose) }}</span>
            </p>
          </fieldset>
        </div>
      </Carte>
    </form>

    <aside class="fiche__cote">
      <Carte :titre="t.apercu">
        <template #actions>
          <span class="fiche__ordre">{{ t.apercuVue }}</span>
        </template>
        <ApercuArticle :emballe="apercuEmballe" :nu="apercuNu" />
      </Carte>
      <Carte :titre="t.commandesEnCours">
        <p v-if="commandesEnCours.length === 0" class="etat">{{ t.aucuneCommande }}</p>
        <ul v-else class="commandes">
          <li v-for="{ commande, tournee } in commandesEnCours" :key="commande.id">
            <span class="donnees">{{ t.commande(commande.numero, commande.destination) }}</span>
            <span class="commandes__tournee">
              {{ tournee ? tournee.reference : t.enAttente }}
            </span>
          </li>
        </ul>
      </Carte>
    </aside>
  </div>

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
    :consequence="t.archiverConsequence(utilisations)"
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
  grid-template-columns: minmax(0, 2.5fr) minmax(0, 1fr);
  gap: var(--espace-5);
  align-items: start;
}

.fiche__resume {
  grid-column: 1 / -1;
}

.fiche__principal,
.fiche__cote {
  display: flex;
  flex-direction: column;
  gap: var(--espace-4);
}

@media (width <= 960px) {
  .fiche {
    grid-template-columns: minmax(0, 1fr);
  }
}

.grille {
  display: grid;
  gap: var(--espace-4);
}

.grille--identification {
  grid-template-columns: 2fr 1fr 1fr;
}

.grille--tailles {
  grid-template-columns: 1fr 1fr;
  align-items: start;
}

@media (width <= 720px) {
  .grille--identification,
  .grille--tailles {
    grid-template-columns: 1fr;
  }
}

.groupe {
  display: flex;
  flex-direction: column;
  gap: var(--espace-3);
  padding: var(--espace-3) var(--espace-4);
  border: 1px solid var(--bordure);
  border-radius: var(--rayon-controle);
}

.groupe__poids {
  max-width: calc(var(--espace-7) * 4);
}

.fiche__ordre {
  font: var(--typo-legende);
  color: var(--texte-doux);
}

.fiche__note {
  margin: var(--espace-4) 0 0;
  font: var(--typo-interface);
}

.fiche__note--doux {
  margin-top: var(--espace-2);
  font: var(--typo-legende);
  color: var(--texte-doux);
}

.regles {
  display: flex;
  flex-direction: column;
  gap: var(--espace-4);
}

.regles__groupe {
  min-width: 0;
  padding: 0;
  margin: 0;
  border: 0;
}

.regles__legende {
  padding: 0;
  margin-bottom: var(--espace-2);
  font: var(--typo-bouton);
  color: var(--encre);
}

.regles__mention {
  font: var(--typo-interface);
  color: var(--texte-doux);
}

.regles__options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espace-5);
}

/* Cadre transparent : il prend le contour d'erreur sans décaler les cases. */
.regles__options--cadre {
  padding: var(--espace-1) var(--espace-2);
  margin: calc(-1 * var(--espace-1)) calc(-1 * var(--espace-2));
  border: 2px solid transparent;
  border-radius: var(--rayon-controle);
}

.regles__options--erreur {
  border-color: var(--erreur);
}

.regles__option {
  display: inline-flex;
  gap: var(--espace-2);
  align-items: center;
  min-height: var(--cible-mini);
  font: var(--typo-interface);
  cursor: pointer;
}

.regles__option input {
  width: var(--espace-5);
  height: var(--espace-5);
  margin: 0;
  accent-color: var(--action);
  cursor: pointer;
}

.message {
  display: flex;
  gap: var(--espace-1);
  align-items: flex-start;
  margin: var(--espace-2) 0 0;
  font: var(--typo-legende);
  color: var(--texte-doux);
}

.message .icone {
  margin-top: 1px;
}

.message--erreur {
  color: var(--erreur-texte);
}

.message--erreur .icone {
  color: var(--erreur);
}

.message--avertissement {
  color: var(--alerte-texte);
}

.message--avertissement .icone {
  color: var(--alerte-icone);
}

.commandes {
  display: flex;
  flex-direction: column;
  gap: var(--espace-2);
  padding: 0;
  margin: 0;
  font: var(--typo-interface);
  list-style: none;
}

.commandes li {
  display: flex;
  gap: var(--espace-2);
  justify-content: space-between;
}

.commandes__tournee {
  color: var(--texte-doux);
}
</style>
