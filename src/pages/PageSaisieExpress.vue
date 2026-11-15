<script setup lang="ts">
/**
 * Saisie express d'une commande (captures 03, 03b, 03e ; cahier fonctionnel
 * 4.3 ; RG-02, RG-03, RG-10, RG-21, RG-22). Sert à la création
 * (/tournees/:tourneeId/commandes/nouvelle) et à la modification
 * (/tournees/:tourneeId/commandes/:commandeId).
 *
 * - À gauche, le catalogue avec sa recherche : « Ajouter », ou Entrée pour
 *   le premier résultat. Les articles archivés n'y sont pas (RG-21).
 * - À droite, les lignes : quantité, emballé ou nu, dimensions propres à la
 *   commande. Quand les trois dimensions sont saisies, le poids est proposé
 *   au prorata du volume et marqué « estimé » (RG-03) ; le changer à la main
 *   retire la marque. « Rétablir le catalogue » efface les valeurs propres.
 * - En bas, le résumé de la commande et l'enregistrement.
 *
 * Enregistrer ne vide pas le plan : seules les lignes ajoutées ou vraiment
 * changées perdent leur place, et un message le dit au retour à la tournée.
 */
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { chercherArticles } from '@/domaine/catalogue'
import {
  estActif,
  type Commande,
  type FicheArticle,
  type ModeleCamion,
  type Tournee,
} from '@/domaine/modele'
import {
  commandeDepuisFormulaire,
  dimensionsCatalogue,
  formulaireDepuisCommande,
  formulaireVideCommande,
  ligneDepuisArticle,
  numeroSuivant,
  proposerPoids,
  resumerLignes,
} from '@/domaine/saisie-commande'
import {
  lireDimensions,
  lireKilogrammes,
  lireMillimetres,
  validerCommande,
  type SaisieCommande,
  type SaisieLigne,
} from '@/domaine/validation'
import { ErreurDonnees } from '@/donnees/erreurs'
import { useAnnonces } from '@/stores/annonces'
import { utiliserDepots } from '@/stores/depots'
import { textes } from '@/textes/fr'
import Annonce from '@/composants/Annonce.vue'
import Badge from '@/composants/Badge.vue'
import Bandeau from '@/composants/Bandeau.vue'
import Bouton from '@/composants/Bouton.vue'
import BoutonEnregistrer from '@/composants/BoutonEnregistrer.vue'
import Carte from '@/composants/Carte.vue'
import Champ from '@/composants/Champ.vue'
import CodeCommande from '@/composants/CodeCommande.vue'
import ConfirmationDialog from '@/composants/ConfirmationDialog.vue'
import EntetePage from '@/composants/EntetePage.vue'
import Icone from '@/composants/Icone.vue'
import ResumeErreurs, { type ErreurResumee } from '@/composants/ResumeErreurs.vue'
import {
  formaterDimensions,
  formaterJour,
  formaterMetresCubes,
  formaterPoids,
} from '@/composants/format'
import { utiliserConfirmationSortie } from '@/composants/sortie'
import { utiliserVerification } from '@/composants/verification'

const props = withDefaults(defineProps<{ tourneeId: string; commandeId?: string }>(), {
  commandeId: undefined,
})

const t = textes.saisieExpress
const depots = utiliserDepots()
const annonces = useAnnonces()
const routeur = useRouter()
const creation = props.commandeId === undefined

// --- Données ------------------------------------------------------------------

const chargement = ref(true)
const erreurChargement = ref('')
const tournee = ref<Tournee | null>(null)
const camion = ref<ModeleCamion | null>(null)
/** Tout le catalogue, archivés compris : une ligne peut citer un article archivé. */
const articles = ref<FicheArticle[]>([])
const commandesDeLaTournee = ref<Commande[]>([])
const origine = ref<Commande | null>(null)
const avecPlan = ref(false)

const form = ref<SaisieCommande>(formulaireVideCommande(''))
const reference = ref(JSON.stringify(form.value))
const modifie = computed(() => JSON.stringify(form.value) !== reference.value)

const annonce = ref('')
const tonAnnonce = ref<'info' | 'alerte'>('info')

async function charger() {
  try {
    const [tr, catalogue, commandes, enAttente, existante, plan] = await Promise.all([
      depots.tournees.obtenir(props.tourneeId),
      depots.articles.lister({ avecArchives: true }),
      depots.commandes.listerParTournee(props.tourneeId),
      depots.commandes.listerSansTournee(),
      props.commandeId ? depots.commandes.obtenir(props.commandeId) : Promise.resolve(null),
      depots.plans.obtenirDernier(props.tourneeId),
    ])
    if (!tr || (props.commandeId && existante?.commande.tourneeId !== props.tourneeId)) {
      erreurChargement.value = tr ? t.introuvable : textes.preparation.introuvable
      return
    }
    tournee.value = tr
    articles.value = catalogue
    commandesDeLaTournee.value = commandes.map((c) => c.commande)
    avecPlan.value = plan !== null
    camion.value = tr.modeleCamionId ? await depots.camions.obtenir(tr.modeleCamionId) : null
    if (existante) {
      origine.value = existante.commande
      form.value = formulaireDepuisCommande(existante.commande, existante.lignes)
      // Un poids estimé se signale dès l'ouverture (capture 03b).
      form.value.lignes.forEach((l, i) => {
        if (l.poidsEstime) quitter(`lignes.${i}.poids`)
      })
    } else {
      const numeros = [...commandes, ...enAttente].map((c) => c.commande.numero)
      form.value = formulaireVideCommande(numeroSuivant(numeros, new Date().getFullYear()))
    }
    reference.value = JSON.stringify(form.value)
  } catch (e) {
    erreurChargement.value = e instanceof ErreurDonnees ? e.message : textes.donnees.reseau
  } finally {
    chargement.value = false
  }
}

onMounted(charger)

/** Rang de livraison : le sien, ou le dernier pour une nouvelle commande. */
const rang = computed(() => origine.value?.rangLivraison ?? commandesDeLaTournee.value.length + 1)
const articleDe = (id: string) => articles.value.find((a) => a.id === id)
const nomDe = (ligne: SaisieLigne) => articleDe(ligne.articleId)?.nom ?? ''

const titre = computed(() => (creation ? t.titre : t.titreModification(`C${rang.value}`)))
const ariane = computed(() => [
  { libelle: textes.navigation.accueil, vers: '/' },
  {
    libelle: tournee.value?.date
      ? textes.preparation.ariane(formaterJour(tournee.value.date))
      : textes.preparation.nouvelle,
    vers: `/tournees/${props.tourneeId}`,
  },
  { libelle: t.ariane },
])

// --- Vérification (RG-21) -------------------------------------------------------

const verification = utiliserVerification(() =>
  validerCommande(form.value, {
    commandesDeLaTournee: commandesDeLaTournee.value,
    catalogue: articles.value,
    camion: camion.value ?? undefined,
  }),
)
const { erreur, avertissement, quitter } = verification

/** Identifiant du champ cible d'un problème, et son libellé dans le résumé. */
function cibleDe(champ: string): { champId: string; libelle: string } {
  const ligne = /^lignes\.(\d+)\.(\w+)$/.exec(champ)
  if (ligne) {
    const i = Number(ligne[1])
    const nature = ligne[2] as 'quantite' | 'dimsPropres' | 'poids'
    const suffixe = nature === 'dimsPropres' ? 'l' : nature
    const l = form.value.lignes[i]
    return {
      champId: `ligne-${i}-${suffixe}`,
      libelle: t.champLigne(i + 1, l ? nomDe(l) : '', t.champs[nature]),
    }
  }
  const ids: Record<string, string> = {
    numero: 'commande-numero',
    destination: 'commande-destination',
    lignes: 'catalogue-recherche',
  }
  return {
    champId: ids[champ] ?? champ,
    libelle: t.champs[champ as keyof typeof t.champs] ?? champ,
  }
}

const erreursResumees = computed<ErreurResumee[]>(() =>
  verification.erreursResumees.value.map((p) => ({ ...cibleDe(p.champ), message: p.message })),
)
const resume = ref<InstanceType<typeof ResumeErreurs> | null>(null)

// --- Catalogue ------------------------------------------------------------------

const recherche = ref('')
const resultats = computed(() => chercherArticles(articles.value.filter(estActif), recherche.value))

function ajouter(article: FicheArticle) {
  form.value.lignes.push(ligneDepuisArticle(article))
  // L'avertissement « ne rentre pas dans le camion » s'affiche tout de suite.
  quitter(`lignes.${form.value.lignes.length - 1}`)
  tonAnnonce.value = 'info'
  annonce.value = t.ligneAjoutee(article.nom)
}

function ajouterPremier() {
  const premier = resultats.value[0]
  if (premier) ajouter(premier)
}

// --- Lignes -----------------------------------------------------------------------

function changerQuantite(ligne: SaisieLigne, decalage: number) {
  const actuelle = lireMillimetres(ligne.quantite) ?? 0
  ligne.quantite = String(Math.max(1, actuelle + decalage))
}

/**
 * Après un changement des dimensions ou du choix nu / emballé (RG-03) : trois
 * dimensions lisibles → poids estimé proposé ; plus aucune dimension → le
 * poids estimé est retiré, celui du catalogue s'applique de nouveau.
 */
function apresDimensions(i: number) {
  const ligne = form.value.lignes[i]
  const article = ligne && articleDe(ligne.articleId)
  if (!ligne || !article) return
  const lecture = lireDimensions(ligne.dimsPropres)
  if (lecture.etat === 'ok') {
    form.value.lignes[i] = proposerPoids(ligne, article)
    quitter(`lignes.${i}.poids`)
  } else if (lecture.etat === 'vide' && ligne.poidsEstime) {
    ligne.poids = ''
    ligne.poidsEstime = false
  }
}

function choisirNu(i: number, nu: boolean) {
  const ligne = form.value.lignes[i]
  if (!ligne || ligne.nu === nu) return
  ligne.nu = nu
  apresDimensions(i)
}

/** Le poids changé à la main n'est plus une estimation. */
function saisirPoids(ligne: SaisieLigne, valeur: string) {
  ligne.poids = valeur
  ligne.poidsEstime = false
}

function retablir(ligne: SaisieLigne) {
  ligne.dimsPropres = { l: '', w: '', h: '' }
  ligne.poids = ''
  ligne.poidsEstime = false
}

const aDesValeursPropres = (ligne: SaisieLigne) =>
  lireDimensions(ligne.dimsPropres).etat !== 'vide' || ligne.poids.trim() !== ''

function retirer(i: number) {
  const [ligne] = form.value.lignes.splice(i, 1)
  tonAnnonce.value = 'info'
  annonce.value = t.ligneRetiree(ligne ? nomDe(ligne) : '')
}

/** Dimensions affichées en indication : celles du catalogue pour la livraison choisie. */
const indication = (ligne: SaisieLigne, cle: 'l' | 'w' | 'h') => {
  const article = articleDe(ligne.articleId)
  return article ? String(dimensionsCatalogue(article, ligne.nu)[cle]) : ''
}

const DIMS = [
  { cle: 'l', libelle: t.longueur },
  { cle: 'w', libelle: t.largeur },
  { cle: 'h', libelle: t.hauteur },
] as const

// --- Résumé --------------------------------------------------------------------

const resumeCommande = computed(() =>
  resumerLignes(
    form.value.lignes.map((l) => {
      const dims = lireDimensions(l.dimsPropres)
      const poids = lireKilogrammes(l.poids)
      return {
        articleId: l.articleId,
        quantite: lireMillimetres(l.quantite) ?? 0,
        nu: l.nu,
        ...(dims.etat === 'ok' ? { dimsPropres: dims.dims } : {}),
        ...(poids === null ? {} : { poidsPropre: poids }),
      }
    }),
    articles.value,
  ),
)
const texteResume = computed(() => {
  const r = resumeCommande.value
  const c = camion.value
  return (
    t.resume(r.lignes, r.articles, formaterMetresCubes(r.volume), formaterPoids(r.poids)) +
    (c ? t.caisse(c.nom, formaterDimensions({ l: c.longueur, w: c.largeur, h: c.hauteur })) : '')
  )
})

// --- Enregistrer ---------------------------------------------------------------

const sortie = utiliserConfirmationSortie(modifie)

async function enregistrer() {
  if (!verification.soumettre()) {
    await nextTick()
    resume.value?.focaliser()
    return
  }
  try {
    const { commande, lignes } = commandeDepuisFormulaire(form.value, {
      tourneeId: props.tourneeId,
      rangLivraison: rang.value,
    })
    const enregistree = await depots.commandes.enregistrer(commande, lignes)
    const changees = enregistree.lignesChangees.length
    annonces.deposer(
      [
        t.enregistree(enregistree.commande.destination),
        avecPlan.value && changees > 0 ? t.aReplacer(changees) : '',
      ]
        .filter(Boolean)
        .join(' '),
    )
    sortie.permettre()
    await routeur.push(`/tournees/${props.tourneeId}`)
  } catch (e) {
    if (e instanceof ErreurDonnees && e.champ === 'numero') {
      verification.signalerErreurServeur({ champ: 'numero', code: 'doublon', message: e.message })
      await nextTick()
      resume.value?.focaliser()
      return
    }
    tonAnnonce.value = 'alerte'
    annonce.value = e instanceof ErreurDonnees ? e.message : textes.donnees.reseau
  }
}

async function annuler() {
  await routeur.push(`/tournees/${props.tourneeId}`)
}
</script>

<template>
  <EntetePage :titre="titre" :ariane="ariane">
    <template v-if="tournee" #apres-titre>
      <span class="code-titre">
        <CodeCommande :numero="rang" />
        <span class="code-titre__texte">{{ t.codeDansTournee(tournee.reference) }}</span>
      </span>
    </template>
  </EntetePage>

  <Annonce :message="annonce" :ton="tonAnnonce" />

  <p v-if="chargement" class="etat">{{ textes.referentiels.chargement }}</p>
  <Bandeau v-else-if="erreurChargement" ton="alerte">{{ erreurChargement }}</Bandeau>

  <form v-else id="formulaire-commande" class="saisie" novalidate @submit.prevent="enregistrer">
    <ResumeErreurs ref="resume" class="saisie__large" :erreurs="erreursResumees" />

    <Carte :titre="t.commande" class="saisie__large">
      <div class="identite">
        <Champ
          id="commande-numero"
          v-model="form.numero"
          :libelle="t.numero"
          obligatoire
          donnees
          :erreur="erreur('numero')"
          @blur="quitter('numero')"
        />
        <Champ
          id="commande-destination"
          v-model="form.destination"
          :libelle="t.destination"
          :aide="t.destinationAide"
          obligatoire
          autocomplete="organization"
          :erreur="erreur('destination')"
          @blur="quitter('destination')"
        />
        <Champ id="commande-ville" v-model="form.ville" :libelle="t.ville" />
      </div>
    </Carte>

    <!-- Catalogue -->
    <section class="catalogue" aria-labelledby="titre-catalogue">
      <h2 id="titre-catalogue" class="catalogue__titre">{{ t.catalogue }}</h2>
      <label for="catalogue-recherche" class="catalogue__libelle">{{ t.recherche }}</label>
      <div class="catalogue__recherche">
        <Icone nom="recherche" :taille="16" />
        <input
          id="catalogue-recherche"
          v-model="recherche"
          type="search"
          class="catalogue__saisie"
          :placeholder="t.recherchePlaceholder"
          aria-describedby="catalogue-aide catalogue-nombre"
          autocomplete="off"
          @keydown.enter.prevent="ajouterPremier"
        />
      </div>
      <p id="catalogue-aide" class="catalogue__aide">{{ t.rechercheAide }}</p>
      <p id="catalogue-nombre" class="visuellement-cache" aria-live="polite">
        {{ t.resultats(resultats.length) }}
      </p>
      <p v-if="erreur('lignes')" class="message message--erreur">
        <Icone nom="erreur" :taille="16" />
        <span>
          <span class="visuellement-cache">{{ textes.composants.prefixeErreur }} </span>
          {{ erreur('lignes') }}
        </span>
      </p>
      <ul class="catalogue__liste">
        <li v-for="article in resultats" :key="article.id" class="resultat">
          <span class="resultat__texte">
            <span class="resultat__nom">{{ article.nom }}</span>
            <span class="resultat__detail">
              <span v-if="article.reference" class="donnees">{{ article.reference }}</span>
              · {{ article.famille }}<template v-if="article.fragile"> · {{ t.fragile }}</template>
            </span>
            <span class="resultat__dims donnees">
              {{ formaterDimensions(article.dimsEmballees) }} mm<template v-if="article.dimsNues">
                · {{ t.nu(formaterDimensions(article.dimsNues)) }}</template
              >
            </span>
          </span>
          <Bouton taille="petite" @click="ajouter(article)">
            {{ t.ajouter }}<span class="visuellement-cache"> {{ article.nom }}</span>
          </Bouton>
        </li>
        <li v-if="resultats.length === 0" class="resultat resultat--vide">{{ t.aucunResultat }}</li>
      </ul>
    </section>

    <!-- Lignes de la commande -->
    <section class="lignes" aria-labelledby="titre-lignes">
      <div class="lignes__entete">
        <h2 id="titre-lignes" class="lignes__titre">{{ t.lignes }}</h2>
        <p class="lignes__unites">{{ t.unites }}</p>
      </div>
      <div class="lignes__cadre">
        <table class="tableau-lignes">
          <caption class="visuellement-cache">
            {{
              t.legende
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ t.colonnes.article }}</th>
              <th scope="col">{{ t.colonnes.quantite }}</th>
              <th scope="col">{{ t.colonnes.livraison }}</th>
              <th scope="col">{{ t.colonnes.dimensions }}</th>
              <th scope="col">{{ t.colonnes.source }}</th>
              <th scope="col">{{ t.colonnes.poids }}</th>
              <th scope="col">
                <span class="visuellement-cache">{{ t.colonnes.actions }}</span>
              </th>
            </tr>
          </thead>
          <tbody v-for="(ligne, i) in form.lignes" :key="`${i}-${ligne.articleId}`">
            <tr class="ligne">
              <th scope="row" class="ligne__article">
                <span class="ligne__nom">{{ nomDe(ligne) }}</span>
                <span class="ligne__detail">
                  <span v-if="articleDe(ligne.articleId)?.reference" class="donnees">{{
                    articleDe(ligne.articleId)?.reference
                  }}</span>
                  <Badge v-if="articleDe(ligne.articleId)?.archiveLe">{{ t.archive }}</Badge>
                </span>
              </th>
              <td>
                <span
                  class="quantite"
                  :class="{ 'quantite--erreur': erreur(`lignes.${i}.quantite`) }"
                >
                  <Bouton
                    taille="petite"
                    icone="moins"
                    seulement-icone
                    :libelle="t.moins(nomDe(ligne))"
                    :desactive="(lireMillimetres(ligne.quantite) ?? 0) <= 1"
                    @click="changerQuantite(ligne, -1)"
                  />
                  <input
                    :id="`ligne-${i}-quantite`"
                    v-model="ligne.quantite"
                    class="quantite__saisie donnees"
                    inputmode="numeric"
                    :aria-label="t.quantite(nomDe(ligne))"
                    :aria-invalid="erreur(`lignes.${i}.quantite`) ? 'true' : undefined"
                    :aria-describedby="
                      erreur(`lignes.${i}.quantite`) ? `ligne-${i}-messages` : undefined
                    "
                    @blur="quitter(`lignes.${i}.quantite`)"
                  />
                  <Bouton
                    taille="petite"
                    icone="plus"
                    seulement-icone
                    :libelle="t.plus(nomDe(ligne))"
                    @click="changerQuantite(ligne, 1)"
                  />
                </span>
              </td>
              <td>
                <span class="livraison" role="group" :aria-label="t.livraison(nomDe(ligne))">
                  <Bouton taille="petite" :presse="!ligne.nu" @click="choisirNu(i, false)">
                    {{ t.emballe }}
                  </Bouton>
                  <Bouton
                    taille="petite"
                    :presse="ligne.nu"
                    :desactive="!articleDe(ligne.articleId)?.dimsNues"
                    @click="choisirNu(i, true)"
                  >
                    {{ t.nuLibelle }}
                  </Bouton>
                </span>
              </td>
              <td>
                <fieldset
                  class="dimensions"
                  :class="{ 'dimensions--erreur': erreur(`lignes.${i}.dimsPropres`) }"
                  :aria-describedby="
                    erreur(`lignes.${i}.dimsPropres`) ? `ligne-${i}-messages` : undefined
                  "
                >
                  <legend class="visuellement-cache">{{ t.dimensions(nomDe(ligne)) }}</legend>
                  <template v-for="(d, k) in DIMS" :key="d.cle">
                    <span v-if="k > 0" class="dimensions__fois" aria-hidden="true">×</span>
                    <label class="visuellement-cache" :for="`ligne-${i}-${d.cle}`">{{
                      d.libelle
                    }}</label>
                    <input
                      :id="`ligne-${i}-${d.cle}`"
                      v-model="ligne.dimsPropres[d.cle]"
                      class="dimensions__saisie donnees"
                      :class="{ 'dimensions__saisie--propre': ligne.dimsPropres[d.cle] !== '' }"
                      inputmode="numeric"
                      :placeholder="indication(ligne, d.cle)"
                      :aria-invalid="erreur(`lignes.${i}.dimsPropres`) ? 'true' : undefined"
                      @change="apresDimensions(i)"
                      @blur="quitter(`lignes.${i}.dimsPropres`)"
                    />
                  </template>
                </fieldset>
              </td>
              <td>
                <template v-if="aDesValeursPropres(ligne)">
                  <span class="source source--propre">{{ t.sourcePropre }}</span>
                  <Bouton
                    taille="petite"
                    variante="texte"
                    class="source__retablir"
                    @click="retablir(ligne)"
                  >
                    {{ t.retablir }}<span class="visuellement-cache"> {{ nomDe(ligne) }}</span>
                  </Bouton>
                </template>
                <span v-else class="source">{{ t.sourceCatalogue(ligne.nu) }}</span>
              </td>
              <td>
                <span class="poids">
                  <input
                    :id="`ligne-${i}-poids`"
                    :value="ligne.poids"
                    class="poids__saisie donnees"
                    :class="{ 'poids__saisie--propre': ligne.poids !== '' }"
                    inputmode="decimal"
                    :placeholder="String(articleDe(ligne.articleId)?.poids ?? '').replace('.', ',')"
                    :aria-label="t.poids(nomDe(ligne))"
                    aria-describedby="unite-kg"
                    :aria-invalid="erreur(`lignes.${i}.poids`) ? 'true' : undefined"
                    @input="saisirPoids(ligne, ($event.target as HTMLInputElement).value)"
                    @blur="quitter(`lignes.${i}.poids`)"
                  />
                  <span class="poids__unite" aria-hidden="true">kg</span>
                </span>
                <Badge v-if="ligne.poidsEstime" class="poids__estime">{{ t.estime }}</Badge>
              </td>
              <td>
                <Bouton
                  taille="petite"
                  variante="texte"
                  icone="corbeille"
                  seulement-icone
                  :libelle="t.retirer(nomDe(ligne))"
                  @click="retirer(i)"
                />
              </td>
            </tr>
            <tr
              v-if="
                erreur(`lignes.${i}.quantite`) ||
                erreur(`lignes.${i}.dimsPropres`) ||
                erreur(`lignes.${i}.poids`) ||
                avertissement(`lignes.${i}.poids`) ||
                avertissement(`lignes.${i}`)
              "
              class="ligne__messages"
            >
              <td :id="`ligne-${i}-messages`" colspan="7">
                <p
                  v-for="message in [
                    erreur(`lignes.${i}.quantite`),
                    erreur(`lignes.${i}.dimsPropres`),
                    erreur(`lignes.${i}.poids`),
                  ].filter(Boolean)"
                  :key="message"
                  class="message message--erreur"
                >
                  <Icone nom="erreur" :taille="16" />
                  <span>
                    <span class="visuellement-cache">{{ textes.composants.prefixeErreur }} </span>
                    {{ message }}
                  </span>
                </p>
                <p
                  v-for="message in [
                    avertissement(`lignes.${i}.poids`),
                    avertissement(`lignes.${i}`),
                  ].filter(Boolean)"
                  :key="message"
                  class="message message--avertissement"
                >
                  <Icone nom="alerte" :taille="16" />
                  <span>
                    <span class="visuellement-cache"
                      >{{ textes.composants.prefixeAvertissement }}
                    </span>
                    {{ message }}
                  </span>
                </p>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="form.lignes.length === 0" class="lignes__vide">{{ t.aucuneLigne }}</p>
        <span id="unite-kg" class="visuellement-cache">kg</span>
      </div>
      <p class="lignes__note">{{ t.note }}</p>
    </section>

    <div class="pied saisie__large">
      <p class="pied__resume">{{ texteResume }}</p>
      <div class="pied__actions">
        <Bouton @click="annuler">{{ t.annuler }}</Bouton>
        <BoutonEnregistrer
          :libelle="t.enregistrer"
          :modifie="modifie"
          formulaire="formulaire-commande"
        />
      </div>
    </div>
  </form>

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

.code-titre {
  display: inline-flex;
  gap: var(--espace-2);
  align-items: center;
  margin-left: var(--espace-3);
  vertical-align: middle;
}

.code-titre__texte {
  font: var(--typo-legende);
  color: var(--texte-doux);
}

.saisie {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 3fr);
  gap: var(--espace-4);
  align-items: start;
}

.saisie__large {
  grid-column: 1 / -1;
}

@media (width <= 1100px) {
  .saisie {
    grid-template-columns: minmax(0, 1fr);
  }
}

.identite {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr) minmax(0, 2fr);
  gap: var(--espace-4);
  align-items: start;
}

@media (width <= 800px) {
  .identite {
    grid-template-columns: minmax(0, 1fr);
  }
}

.message {
  display: flex;
  gap: var(--espace-1);
  align-items: flex-start;
  margin: var(--espace-1) 0 0;
  font: var(--typo-legende);
}

.message--erreur {
  color: var(--erreur-texte);
}

.message--avertissement {
  color: var(--alerte-texte);
}

/* --- Catalogue --- */

.catalogue,
.lignes {
  min-width: 0;
  background: var(--surface);
  border: 1px solid var(--bordure);
  border-radius: var(--rayon-carte);
}

.catalogue {
  display: flex;
  flex-direction: column;
  max-height: calc(var(--espace-7) * 22);
  padding: var(--espace-4) 0 0;
}

.catalogue > :not(.catalogue__liste) {
  margin-right: var(--espace-4);
  margin-left: var(--espace-4);
}

.catalogue__titre,
.lignes__titre {
  margin: 0;
  font: var(--typo-titre-section);
}

.catalogue__libelle {
  margin-top: var(--espace-2);
  margin-bottom: var(--espace-2);
  font: var(--typo-bouton);
}

.catalogue__recherche {
  display: flex;
  gap: var(--espace-2);
  align-items: center;
  padding: 0 var(--espace-3);
  color: var(--texte-doux);
  border: 1px solid var(--bordure-controle);
  border-radius: var(--rayon-controle);
}

.catalogue__recherche:focus-within {
  border-color: var(--action);
}

.catalogue__saisie {
  flex: 1;
  min-width: 0;
  min-height: var(--cible-compacte);
  font: var(--typo-interface);
  color: var(--encre);
  background: transparent;
  border: 0;
  outline: none;
}

.catalogue__aide {
  margin-top: var(--espace-2);
  margin-bottom: var(--espace-3);
  font: var(--typo-legende);
  color: var(--texte-doux);
}

.catalogue__liste {
  padding: 0;
  margin: 0;
  overflow-y: auto;
  list-style: none;
  border-top: 1px solid var(--bordure);
}

.resultat {
  display: flex;
  gap: var(--espace-2);
  align-items: center;
  justify-content: space-between;
  padding: var(--espace-2) var(--espace-4);
  border-bottom: 1px solid var(--bordure);
}

.resultat--vide {
  font: var(--typo-interface);
  color: var(--texte-doux);
}

.resultat__texte {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.resultat__nom {
  font: var(--typo-bouton);
}

.resultat__detail {
  font: var(--typo-legende);
  color: var(--texte-doux);
}

/* Les dimensions gardent IBM Plex Mono (classe donnees). */
.resultat__dims {
  color: var(--texte-doux);
}

/* --- Lignes --- */

.lignes__entete {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espace-2);
  align-items: baseline;
  justify-content: space-between;
  padding: var(--espace-4);
}

.lignes__unites,
.lignes__note,
.lignes__vide {
  margin: 0;
  font: var(--typo-legende);
  color: var(--texte-doux);
}

.lignes__cadre {
  overflow-x: auto;
  border-top: 1px solid var(--bordure);
}

.lignes__vide {
  padding: var(--espace-4);
  font: var(--typo-interface);
}

.lignes__note {
  padding: var(--espace-3) var(--espace-4) var(--espace-4);
  border-top: 1px solid var(--bordure);
}

.tableau-lignes {
  width: 100%;
  border-collapse: collapse;
}

.tableau-lignes th,
.tableau-lignes td {
  padding: var(--espace-2) var(--espace-2);
  font: var(--typo-interface);
  text-align: left;
  vertical-align: top;
}

.tableau-lignes thead th {
  font: var(--typo-legende);
  color: var(--texte-doux);
  border-bottom: 1px solid var(--bordure);
}

.ligne__messages td {
  padding-top: 0;
}

.tableau-lignes th:first-child,
.tableau-lignes td:first-child {
  padding-left: var(--espace-4);
}

.tableau-lignes tbody {
  border-bottom: 1px solid var(--bordure);
}

.ligne__article {
  min-width: calc(var(--espace-7) * 5);
}

.ligne__nom {
  display: block;
  font: var(--typo-bouton);
}

.ligne__detail {
  display: inline-flex;
  gap: var(--espace-2);
  align-items: center;
  font: var(--typo-legende);
  color: var(--texte-doux);
}

.quantite,
.livraison,
.poids {
  display: inline-flex;
  gap: var(--espace-1);
  align-items: center;
}

.quantite__saisie,
.dimensions__saisie,
.poids__saisie {
  min-height: var(--cible-compacte);
  padding: 0 var(--espace-2);
  color: var(--encre);
  background: var(--surface);
  border: 1px solid var(--bordure-controle);
  border-radius: var(--rayon-controle);
}

.quantite__saisie {
  width: calc(var(--espace-7) * 1.5);
  text-align: center;
}

.dimensions__saisie {
  width: calc(var(--espace-7) * 2);
}

.quantite--erreur .quantite__saisie,
.dimensions--erreur .dimensions__saisie {
  border: 2px solid var(--erreur);
}

.dimensions {
  display: inline-flex;
  gap: var(--espace-1);
  align-items: center;
  min-width: 0;
  padding: 0;
  margin: 0;
  border: 0;
}

/* Une valeur propre à la commande se distingue du catalogue (fond info). */
.dimensions__saisie--propre,
.poids__saisie--propre {
  background: var(--info-fond);
}

.dimensions__fois {
  color: var(--texte-doux);
}

.source {
  display: block;
  font: var(--typo-legende);
  color: var(--texte-doux);
}

.source--propre {
  font: var(--typo-bouton);
  color: var(--action-fonce);
}

.poids__saisie {
  width: calc(var(--espace-7) * 2);
}

.poids__unite {
  font: var(--typo-legende);
  color: var(--texte-doux);
}

:deep(.poids__estime) {
  margin-top: var(--espace-1);
}

/* --- Pied --- */

.pied {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espace-3);
  align-items: center;
  justify-content: space-between;
  padding: var(--espace-4);
  background: var(--surface);
  border: 1px solid var(--bordure);
  border-radius: var(--rayon-carte);
}

.pied__resume {
  margin: 0;
  font: var(--typo-interface);
  color: var(--texte-doux);
}

.pied__actions {
  display: flex;
  gap: var(--espace-2);
}
</style>
