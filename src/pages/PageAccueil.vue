<script setup lang="ts">
/**
 * Accueil · tournées (capture 01, cahier fonctionnel 4.1).
 *
 * - le tableau des tournées : date, référence, camion, commandes (codes C1,
 *   C2… et leur nombre) et statut. Comme dans tous les tableaux, la date est
 *   le lien vers la tournée et toute la ligne est cliquable (écart validé à
 *   l'étape 8b : pas de bouton « Préparer la tournée » séparé) ;
 * - « Créer une tournée » crée tout de suite une tournée en préparation, avec
 *   la référence suivante, puis ouvre sa préparation : la date et le camion
 *   s'y choisissent ;
 * - les accès au catalogue, aux modèles de camions et à la liste d'attente.
 */
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import type { FicheArticle, ModeleCamion, Tournee } from '@/domaine/modele'
import { referenceSuivante } from '@/domaine/tournee'
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
import CodeCommande from '@/composants/CodeCommande.vue'
import EntetePage from '@/composants/EntetePage.vue'
import TableauTriable, { type ColonneTableau } from '@/composants/TableauTriable.vue'
import type { EtatTri } from '@/composants/tri'
import { formaterJour, formaterMillimetres, premiereMajuscule } from '@/composants/format'

const t = textes.accueil
const depots = utiliserDepots()
const annonces = useAnnonces()
const attente = useAttente()
const routeur = useRouter()

const tournees = ref<Tournee[]>([])
const camions = ref<ModeleCamion[]>([])
const articles = ref<FicheArticle[]>([])
const commandesPar = ref(new Map<string, CommandeAvecLignes[]>())
const chargement = ref(true)
const erreurChargement = ref('')
const annonce = ref('')
const tonAnnonce = ref<'info' | 'alerte'>('info')

async function charger() {
  try {
    ;[tournees.value, camions.value, articles.value] = await Promise.all([
      depots.tournees.lister(),
      // Avec les archivés : une ancienne tournée garde son camion.
      depots.camions.lister({ avecArchives: true }),
      depots.articles.lister(),
    ])
    const listes = await Promise.all(
      tournees.value.map((tr) => depots.commandes.listerParTournee(tr.id)),
    )
    commandesPar.value = new Map(tournees.value.map((tr, i) => [tr.id, listes[i] ?? []]))
    await attente.actualiser(depots)
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

const enPreparation = computed(
  () => tournees.value.filter((tr) => tr.statut === 'enPreparation').length,
)
const familles = computed(() => new Set(articles.value.map((a) => a.famille)).size)

const camionDe = (tr: Tournee) => camions.value.find((c) => c.id === tr.modeleCamionId)
const commandesDe = (tr: Tournee) => commandesPar.value.get(tr.id) ?? []
const dateDe = (tr: Tournee) => (tr.date ? formaterJour(tr.date) : t.dateAFixer)
const dimensions = (c: ModeleCamion) =>
  [c.longueur, c.largeur, c.hauteur].map(formaterMillimetres).join(' × ')

// L'ordre reçu (les plus récentes d'abord) est l'ordre de départ.
const tri = ref<EtatTri | null>(null)
const colonnes: ColonneTableau<Tournee>[] = [
  { cle: 'date', libelle: t.colonnes.date, valeur: (tr) => tr.date ?? '', classe: 'accueil__date' },
  { cle: 'tournee', libelle: t.colonnes.tournee, valeur: (tr) => tr.reference, classe: 'donnees' },
  { cle: 'camion', libelle: t.colonnes.camion, valeur: (tr) => camionDe(tr)?.nom ?? '' },
  { cle: 'commandes', libelle: t.colonnes.commandes, valeur: (tr) => commandesDe(tr).length },
  { cle: 'statut', libelle: t.colonnes.statut, valeur: (tr) => textes.statutsTournee[tr.statut] },
]

// --- Créer une tournée ---------------------------------------------------------

const creation = ref(false)

async function creer() {
  if (creation.value) return
  creation.value = true
  try {
    const tournee = await depots.tournees.enregistrer({
      reference: referenceSuivante(
        tournees.value.map((tr) => tr.reference),
        new Date().getFullYear(),
      ),
      date: null,
      modeleCamionId: null,
      statut: 'enPreparation',
    })
    await routeur.push(`/tournees/${tournee.id}`)
  } catch (erreur) {
    tonAnnonce.value = 'alerte'
    annonce.value = erreur instanceof ErreurDonnees ? erreur.message : textes.donnees.reseau
  } finally {
    creation.value = false
  }
}
</script>

<template>
  <EntetePage
    :titre="t.titre"
    :sous-titre="chargement ? undefined : t.resume(tournees.length, enPreparation)"
  >
    <template #actions>
      <Bouton variante="principal" taille="grande" icone="plus" @click="creer">
        {{ t.creer }}
      </Bouton>
    </template>
  </EntetePage>

  <Annonce :message="annonce" :ton="tonAnnonce" />

  <p v-if="chargement" class="etat">{{ textes.referentiels.chargement }}</p>
  <Bandeau v-else-if="erreurChargement" ton="alerte">{{ erreurChargement }}</Bandeau>

  <template v-else>
    <p v-if="tournees.length === 0" class="etat cadre cadre--vide">{{ t.vide }}</p>
    <div v-else class="cadre">
      <TableauTriable
        v-model:tri="tri"
        :colonnes="colonnes"
        :lignes="tournees"
        :cle-ligne="(tr) => tr.id"
        :legende="t.legende"
        entete-ligne="date"
        :lien="(tr) => `/tournees/${tr.id}`"
      >
        <template #date="{ ligne }">{{ dateDe(ligne) }}</template>
        <template #camion="{ ligne }">
          <template v-if="camionDe(ligne)">
            {{ camionDe(ligne)?.nom }}
            <span class="donnees accueil__caisse">{{
              dimensions(camionDe(ligne) as ModeleCamion)
            }}</span>
          </template>
          <span v-else class="accueil__doux">{{ t.camionAChoisir }}</span>
        </template>
        <template #commandes="{ ligne }">
          <span class="accueil__commandes">
            <CodeCommande
              v-for="c in commandesDe(ligne)"
              :key="c.commande.id"
              :numero="c.commande.rangLivraison ?? 0"
            />
            <span>{{ t.nombreCommandes(commandesDe(ligne).length) }}</span>
          </span>
        </template>
        <template #statut="{ ligne }">
          <Badge>{{ premiereMajuscule(textes.statutsTournee[ligne.statut]) }}</Badge>
        </template>
      </TableauTriable>
    </div>

    <nav class="raccourcis" :aria-label="t.raccourcis">
      <RouterLink to="/catalogue" class="raccourci">
        <span class="raccourci__titre">{{ t.catalogue }}</span>
        <span class="raccourci__resume">{{ t.catalogueResume(articles.length, familles) }}</span>
      </RouterLink>
      <RouterLink to="/camions" class="raccourci">
        <span class="raccourci__titre">{{ t.camions }}</span>
        <span class="raccourci__resume">{{
          t.camionsResume(camions.filter((c) => !c.archiveLe).length)
        }}</span>
      </RouterLink>
      <RouterLink to="/attente" class="raccourci">
        <span class="raccourci__titre">{{ t.attente }}</span>
        <span class="raccourci__resume">{{ t.attenteResume(attente.nombre ?? 0) }}</span>
      </RouterLink>
    </nav>
  </template>
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

:deep(.accueil__date) {
  font: var(--typo-bouton);
  white-space: nowrap;
}

.accueil__caisse {
  margin-left: var(--espace-2);
  color: var(--texte-doux);
  white-space: nowrap;
}

.accueil__doux {
  color: var(--texte-doux);
}

.accueil__commandes {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--espace-1);
  align-items: center;
}

.accueil__commandes > span:last-child {
  margin-left: var(--espace-2);
  color: var(--texte-doux);
}

.raccourcis {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--espace-4);
  margin-top: var(--espace-5);
}

@media (width <= 960px) {
  .raccourcis {
    grid-template-columns: minmax(0, 1fr);
  }
}

.raccourci {
  display: flex;
  flex-direction: column;
  gap: var(--espace-2);
  padding: var(--espace-4);
  color: var(--texte-fort);
  text-decoration: none;
  background: var(--surface);
  border: 1px solid var(--bordure);
  border-radius: var(--rayon-carte);
}

.raccourci:hover {
  background: var(--surface-survol);
}

.raccourci__titre {
  font: var(--typo-titre-section);
  color: var(--encre);
}

.raccourci:hover .raccourci__titre,
.raccourci:focus-visible .raccourci__titre {
  color: var(--action);
  text-decoration: underline;
}

.raccourci__resume {
  font: var(--typo-interface);
  color: var(--texte-doux);
}
</style>
