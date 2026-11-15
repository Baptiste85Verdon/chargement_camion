<script setup lang="ts">
/**
 * Liste d'attente (capture 10 ; cahier fonctionnel 4.8 ; RG-11, RG-22).
 *
 * Chaque élément est une commande entière ou des articles reportés (une
 * ligne de commande), avec sa tournée d'origine et son motif. Il s'affecte
 * à une tournée en préparation, où il est livré en dernier ; ou il se
 * supprime, après confirmation (RG-22).
 *
 * `tournee` (dans l'adresse, `?tournee=<id>`) : la tournée proposée d'avance,
 * quand on arrive depuis « Ajouter depuis la liste d'attente ».
 */
import { computed, onMounted, ref } from 'vue'
import type {
  Commande,
  ElementAttente,
  FicheArticle,
  LigneDeCommande,
  ModeleCamion,
  MotifAttente,
  Tournee,
} from '@/domaine/modele'
import { dimensionsCatalogue } from '@/domaine/saisie-commande'
import { ErreurDonnees } from '@/donnees/erreurs'
import { useAttente } from '@/stores/attente'
import { utiliserDepots } from '@/stores/depots'
import { textes } from '@/textes/fr'
import Annonce from '@/composants/Annonce.vue'
import Bandeau from '@/composants/Bandeau.vue'
import Bouton from '@/composants/Bouton.vue'
import CodeCommande from '@/composants/CodeCommande.vue'
import ConfirmationDialog from '@/composants/ConfirmationDialog.vue'
import EntetePage from '@/composants/EntetePage.vue'
import Selecteur from '@/composants/Selecteur.vue'
import { formaterDate, formaterDimensions, formaterJour } from '@/composants/format'

const props = withDefaults(defineProps<{ tournee?: string }>(), { tournee: undefined })

const t = textes.attente
const depots = utiliserDepots()
const compteur = useAttente()

/** Un élément et tout ce qu'il faut pour l'afficher. */
interface Ligne {
  element: ElementAttente
  commande: Commande
  /** Les lignes concernées : toutes pour une commande entière, une sinon. */
  lignes: LigneDeCommande[]
  origine: Tournee | undefined
}

const chargement = ref(true)
const erreurChargement = ref('')
const elements = ref<Ligne[]>([])
const tournees = ref<Tournee[]>([])
const camions = ref<ModeleCamion[]>([])
const articles = ref<FicheArticle[]>([])
/** Tournée choisie pour chaque élément, par identifiant d'élément. */
const choix = ref<Record<string, string>>({})

const annonce = ref('')
const tonAnnonce = ref<'info' | 'alerte'>('info')

async function charger() {
  try {
    const [liste, toutes, lesCamions, catalogue] = await Promise.all([
      depots.attente.lister(),
      depots.tournees.lister(),
      depots.camions.lister({ avecArchives: true }),
      depots.articles.lister({ avecArchives: true }),
    ])
    tournees.value = toutes
    camions.value = lesCamions
    articles.value = catalogue
    const commandes = await Promise.all(liste.map((e) => depots.commandes.obtenir(e.commandeId)))
    elements.value = liste.flatMap((element, i) => {
      const c = commandes[i]
      if (!c) return []
      return [
        {
          element,
          commande: c.commande,
          lignes:
            element.ligneCommandeId === null
              ? c.lignes
              : c.lignes.filter((l) => l.id === element.ligneCommandeId),
          origine: toutes.find((tr) => tr.id === element.tourneeOrigineId),
        },
      ]
    })
    const parDefaut = props.tournee ?? enPreparation.value[0]?.id ?? ''
    choix.value = Object.fromEntries(
      elements.value.map((e) => [e.element.id, choix.value[e.element.id] ?? parDefaut]),
    )
    await compteur.actualiser(depots)
  } catch (e) {
    erreurChargement.value = e instanceof ErreurDonnees ? e.message : textes.donnees.reseau
  } finally {
    chargement.value = false
  }
}

onMounted(charger)

const enPreparation = computed(() => tournees.value.filter((tr) => tr.statut === 'enPreparation'))

// --- Filtre par motif ---------------------------------------------------------------

const filtre = ref<'tous' | MotifAttente>('tous')
const options = computed(() => [
  { valeur: 'tous', libelle: t.tous(elements.value.length) },
  { valeur: 'depassement', libelle: t.depassement },
  { valeur: 'signalement', libelle: t.signalement },
])
const affiches = computed(() =>
  filtre.value === 'tous'
    ? elements.value
    : elements.value.filter((e) => e.element.motif === filtre.value),
)

// --- Affichage --------------------------------------------------------------------

const articleDe = (id: string) => articles.value.find((a) => a.id === id)
const camionDe = (tr: Tournee | undefined) => camions.value.find((c) => c.id === tr?.modeleCamionId)
const nomElement = (e: Ligne) => `${e.commande.destination} ${e.commande.numero}`
const dimsDe = (l: LigneDeCommande) => {
  const article = articleDe(l.articleId)
  return l.dimsPropres ?? (article ? dimensionsCatalogue(article, l.nu) : undefined)
}
const libelleTournee = (tr: Tournee) =>
  t.optionTournee(
    tr.reference,
    tr.date ? formaterJour(tr.date) : textes.preparation.dateAFixer,
    camionDe(tr)?.nom ?? '',
  )

function informer(message: string, ton: 'info' | 'alerte' = 'info') {
  tonAnnonce.value = ton
  annonce.value = message
}

// --- Affecter ----------------------------------------------------------------------

async function affecter(e: Ligne) {
  const cible = tournees.value.find((tr) => tr.id === choix.value[e.element.id])
  if (!cible) return
  try {
    await depots.attente.affecter(e.element.id, cible.id)
    informer(t.affecte(nomElement(e), cible.reference))
    await charger()
  } catch (erreur) {
    informer(erreur instanceof ErreurDonnees ? erreur.message : textes.donnees.reseau, 'alerte')
  }
}

// --- Supprimer (RG-22) ---------------------------------------------------------------

const aSupprimer = ref<Ligne | null>(null)

async function supprimer() {
  const e = aSupprimer.value
  aSupprimer.value = null
  if (!e) return
  try {
    await depots.attente.supprimer(e.element.id)
    informer(t.supprime(nomElement(e)))
    await charger()
  } catch (erreur) {
    informer(erreur instanceof ErreurDonnees ? erreur.message : textes.donnees.reseau, 'alerte')
  }
}
</script>

<template>
  <EntetePage :titre="t.titre" :sous-titre="t.intro">
    <template v-if="!chargement && !erreurChargement" #actions>
      <Selecteur v-model="filtre" :legende="t.filtre" :legende-visible="false" :options="options" />
    </template>
  </EntetePage>

  <Annonce :message="annonce" :ton="tonAnnonce" />

  <p v-if="chargement" class="etat">{{ textes.referentiels.chargement }}</p>
  <Bandeau v-else-if="erreurChargement" ton="alerte">{{ erreurChargement }}</Bandeau>

  <p v-else-if="elements.length === 0" class="etat cadre cadre--vide">{{ t.vide }}</p>

  <div v-else class="cadre">
    <table class="attente">
      <caption class="visuellement-cache">
        {{
          t.legende
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col">{{ t.colonnes.element }}</th>
          <th scope="col">{{ t.colonnes.type }}</th>
          <th scope="col">{{ t.colonnes.origine }}</th>
          <th scope="col">{{ t.colonnes.motif }}</th>
          <th scope="col">{{ t.colonnes.affectation }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="e in affiches" :key="e.element.id">
          <th scope="row" class="element">
            <span class="element__entete">
              <CodeCommande v-if="e.element.rangOrigine" :numero="e.element.rangOrigine" />
              <span>
                <span class="element__nom">{{ e.commande.destination }}</span>
                <span v-if="e.commande.ville" class="element__ville">
                  · {{ e.commande.ville }}</span
                >
                <span class="element__numero donnees">{{ e.commande.numero }}</span>
              </span>
            </span>
            <ul class="element__lignes">
              <li v-for="l in e.lignes" :key="l.id">
                {{ l.quantite }} × {{ articleDe(l.articleId)?.nom }}
                <span v-if="dimsDe(l)" class="donnees element__dims"
                  >{{ formaterDimensions(dimsDe(l)!) }} mm</span
                >
              </li>
            </ul>
          </th>
          <td>{{ e.element.ligneCommandeId === null ? t.commandeEntiere : t.articlesReportes }}</td>
          <td>
            <template v-if="e.origine">
              <span class="donnees">{{ e.origine.reference }}</span>
              <span v-if="e.origine.date" class="doux">{{ formaterJour(e.origine.date) }}</span>
            </template>
            <span v-else class="doux">{{ t.origineInconnue }}</span>
          </td>
          <td class="motif">
            <span class="motif__titre">{{
              e.element.motif === 'depassement' ? t.depassement : t.signalement
            }}</span>
            <span>{{
              e.element.motif === 'depassement'
                ? t.motifDepassement(camionDe(e.origine)?.nom ?? '')
                : t.motifSignalement
            }}</span>
            <span class="doux">{{ t.reporteLe(formaterDate(e.element.reporteLe)) }}</span>
          </td>
          <td>
            <span class="affectation">
              <label class="visuellement-cache" :for="`affectation-${e.element.id}`">{{
                t.choisirTournee(nomElement(e))
              }}</label>
              <select
                :id="`affectation-${e.element.id}`"
                v-model="choix[e.element.id]"
                class="affectation__liste"
                :disabled="enPreparation.length === 0"
              >
                <option v-if="enPreparation.length === 0" value="">{{ t.aucuneTournee }}</option>
                <option v-for="tr in enPreparation" :key="tr.id" :value="tr.id">
                  {{ libelleTournee(tr) }}
                </option>
              </select>
              <Bouton variante="principal" :desactive="!choix[e.element.id]" @click="affecter(e)">
                {{ t.affecter }}<span class="visuellement-cache"> {{ nomElement(e) }}</span>
              </Bouton>
              <Bouton
                icone="corbeille"
                seulement-icone
                :libelle="t.supprimer(nomElement(e))"
                @click="aSupprimer = e"
              />
            </span>
          </td>
        </tr>
        <tr v-if="affiches.length === 0">
          <td colspan="5" class="doux">{{ t.videFiltre }}</td>
        </tr>
      </tbody>
    </table>
    <p class="note">{{ t.note }}</p>
  </div>

  <ConfirmationDialog
    :ouvert="aSupprimer !== null"
    :titre="aSupprimer ? t.supprimerTitre(nomElement(aSupprimer)) : ''"
    :consequence="
      aSupprimer?.element.ligneCommandeId === null
        ? t.supprimerCommandeConsequence
        : t.supprimerArticlesConsequence
    "
    :libelle-action="t.supprimerAction"
    ton="danger"
    @confirmer="supprimer"
    @annuler="aSupprimer = null"
  />
</template>

<style scoped>
.etat {
  margin: 0;
  font: var(--typo-interface);
  color: var(--texte-doux);
}

.cadre {
  overflow-x: auto;
  background: var(--surface);
  border: 1px solid var(--bordure);
  border-radius: var(--rayon-carte);
}

.cadre--vide {
  padding: var(--espace-5);
}

.attente {
  width: 100%;
  border-collapse: collapse;
}

.attente th,
.attente td {
  padding: var(--espace-3) var(--espace-4);
  font: var(--typo-interface);
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid var(--bordure);
}

.attente thead th {
  font: var(--typo-legende);
  color: var(--texte-doux);
}

.doux {
  display: block;
  font: var(--typo-legende);
  color: var(--texte-doux);
}

.element__entete {
  display: flex;
  gap: var(--espace-2);
  align-items: flex-start;
}

.element__nom {
  font: var(--typo-bouton);
}

.element__ville {
  color: var(--texte-doux);
}

.element__numero {
  display: block;
  color: var(--texte-doux);
}

.element__lignes {
  padding: 0;
  margin: var(--espace-1) 0 0;
  font-weight: normal;
  list-style: none;
}

.element__dims {
  color: var(--texte-doux);
}

.motif {
  display: flex;
  flex-direction: column;
  gap: var(--espace-1);
}

.motif__titre {
  font: var(--typo-bouton);
}

.affectation {
  display: flex;
  gap: var(--espace-2);
  align-items: center;
}

.affectation__liste {
  min-width: 0;
  max-width: calc(var(--espace-7) * 11);
  min-height: var(--cible-principale);
  padding: 0 var(--espace-2);
  font: var(--typo-interface);
  color: var(--encre);
  background: var(--surface);
  border: 1px solid var(--bordure-controle);
  border-radius: var(--rayon-controle);
}

.note {
  padding: var(--espace-3) var(--espace-4);
  margin: 0;
  font: var(--typo-legende);
  color: var(--texte-doux);
}
</style>
