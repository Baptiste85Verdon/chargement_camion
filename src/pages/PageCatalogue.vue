<script setup lang="ts">
/**
 * Catalogue des articles (capture 07, cahier fonctionnel 4.6).
 *
 * - recherche par nom ou référence, filtre par famille (`domaine/catalogue.ts`) ;
 * - dimensions affichées « à plat », comme elles sont enregistrées (écart
 *   connu des captures 07 et 08) ;
 * - sous le tableau, la liste des articles archivés, avec « Réactiver » (RG-21).
 */
import { computed, onMounted, ref } from 'vue'
import { compterParFamille, filtrerCatalogue } from '@/domaine/catalogue'
import { FAMILLES, estActif, type Famille, type FicheArticle } from '@/domaine/modele'
import { ErreurDonnees } from '@/donnees/erreurs'
import { useAnnonces } from '@/stores/annonces'
import { utiliserDepots } from '@/stores/depots'
import { textes } from '@/textes/fr'
import Annonce from '@/composants/Annonce.vue'
import Bandeau from '@/composants/Bandeau.vue'
import Bouton from '@/composants/Bouton.vue'
import EntetePage from '@/composants/EntetePage.vue'
import TableauTriable, { type ColonneTableau } from '@/composants/TableauTriable.vue'
import type { EtatTri } from '@/composants/tri'
import Icone from '@/composants/Icone.vue'
import LienBouton from '@/composants/LienBouton.vue'
import { formaterDate, formaterDimensions, formaterPoids } from '@/composants/format'

const t = textes.catalogue
const depots = utiliserDepots()
const annonces = useAnnonces()

/** Tous les articles, archivés compris : on les sépare ensuite. */
const tous = ref<FicheArticle[]>([])
const chargement = ref(true)
const erreurChargement = ref('')
const annonce = ref('')
const tonAnnonce = ref<'info' | 'alerte'>('info')

const recherche = ref('')
const famille = ref<Famille | null>(null)
const archivesVisibles = ref(false)

/** Rangés par famille, dans l'ordre des familles, puis par nom (capture 07). */
const parFamille = (a: FicheArticle, b: FicheArticle) =>
  FAMILLES.indexOf(a.famille) - FAMILLES.indexOf(b.famille) || a.nom.localeCompare(b.nom, 'fr')

const actifs = computed(() => tous.value.filter(estActif).sort(parFamille))
const archives = computed(() => tous.value.filter((a) => !estActif(a)))
const affiches = computed(() =>
  filtrerCatalogue(actifs.value, { recherche: recherche.value, famille: famille.value }),
)
const comptes = computed(() => compterParFamille(actifs.value))

async function charger() {
  try {
    tous.value = await depots.articles.lister({ avecArchives: true })
  } catch (erreur) {
    erreurChargement.value =
      erreur instanceof ErreurDonnees ? erreur.message : textes.donnees.reseau
  } finally {
    chargement.value = false
  }
}

onMounted(async () => {
  await charger()
  // Message laissé par la fiche (archivage, suppression), affiché une fois.
  annonce.value = annonces.reprendre()
})

const orientations = (a: FicheArticle) =>
  a.orientations.map((o) => textes.orientations[o]).join(', ')

/** Tri choisi par un clic sur un en-tête ; sans tri, l'ordre par famille. */
const tri = ref<EtatTri | null>(null)

const dims = (d: FicheArticle['dimsEmballees'] | undefined) => (d ? [d.l, d.w, d.h] : [])

/** Colonnes du catalogue : chacune dit comment trier (valeur) et s'aligne. */
const colonnes: ColonneTableau<FicheArticle>[] = [
  {
    cle: 'reference',
    libelle: t.colonnes.reference,
    valeur: (a) => a.reference ?? '',
    classe: 'donnees catalogue__doux',
  },
  { cle: 'nom', libelle: t.colonnes.article, valeur: (a) => a.nom, classe: 'catalogue__nom' },
  { cle: 'famille', libelle: t.colonnes.famille, valeur: (a) => FAMILLES.indexOf(a.famille) },
  // Dimensions : la longueur d'abord, puis la largeur, puis la hauteur.
  {
    cle: 'emballee',
    libelle: t.colonnes.tailleEmballee,
    valeur: (a) => dims(a.dimsEmballees),
    classe: 'donnees',
  },
  { cle: 'nue', libelle: t.colonnes.tailleNue, valeur: (a) => dims(a.dimsNues), classe: 'donnees' },
  {
    cle: 'poids',
    libelle: t.colonnes.poids,
    valeur: (a) => a.poids,
    nombre: true,
    classe: 'donnees',
  },
  { cle: 'fragile', libelle: t.colonnes.fragile, valeur: (a) => a.fragile },
  { cle: 'forme', libelle: t.colonnes.forme, valeur: (a) => textes.formes[a.forme] },
  { cle: 'orientations', libelle: t.colonnes.orientations, valeur: orientations },
]

async function reactiver(article: FicheArticle) {
  try {
    await depots.articles.reactiver(article.id)
    tonAnnonce.value = 'info'
    annonce.value = t.reactive(article.nom)
    await charger()
  } catch (erreur) {
    tonAnnonce.value = 'alerte'
    if (erreur instanceof ErreurDonnees && erreur.code === 'doublon') {
      const autre = actifs.value.find((a) => a.reference === article.reference)
      annonce.value = t.referenceReprise(article.nom, article.reference ?? '', autre?.nom ?? '')
    } else {
      annonce.value = erreur instanceof ErreurDonnees ? erreur.message : textes.donnees.reseau
    }
  }
}
</script>

<template>
  <EntetePage :titre="t.titre" :sous-titre="t.intro">
    <template #actions>
      <LienBouton vers="/catalogue/nouveau" variante="principal" taille="grande" icone="plus">
        {{ t.creer }}
      </LienBouton>
    </template>
  </EntetePage>

  <Annonce :message="annonce" :ton="tonAnnonce" />

  <p v-if="chargement" class="etat">{{ textes.referentiels.chargement }}</p>
  <Bandeau v-else-if="erreurChargement" ton="alerte">{{ erreurChargement }}</Bandeau>

  <template v-else>
    <section class="catalogue" :aria-label="t.legende">
      <div class="catalogue__outils">
        <div class="catalogue__recherche">
          <label for="recherche-catalogue" class="visuellement-cache">{{ t.recherche }}</label>
          <Icone nom="recherche" class="catalogue__loupe" />
          <input
            id="recherche-catalogue"
            v-model="recherche"
            class="catalogue__saisie"
            type="search"
            :placeholder="t.recherche"
            autocomplete="off"
          />
          <!-- Le nombre change à chaque frappe : il est annoncé poliment. -->
          <p class="catalogue__compte" role="status">
            {{ t.compte(affiches.length, actifs.length) }}
          </p>
        </div>
        <div class="catalogue__familles" role="group" :aria-label="t.familles">
          <Bouton taille="petite" :presse="famille === null" @click="famille = null">
            {{ t.toutes }} <span class="catalogue__nombre">{{ actifs.length }}</span>
          </Bouton>
          <Bouton
            v-for="f in FAMILLES"
            :key="f"
            taille="petite"
            :presse="famille === f"
            @click="famille = f"
          >
            {{ f }} <span class="catalogue__nombre">{{ comptes.get(f) }}</span>
          </Bouton>
        </div>
      </div>

      <TableauTriable
        v-model:tri="tri"
        :colonnes="colonnes"
        :lignes="affiches"
        :cle-ligne="(a) => a.id"
        :legende="t.legende"
        entete-ligne="nom"
      >
        <template #reference="{ ligne }">{{
          ligne.reference ?? textes.referentiels.aucun
        }}</template>
        <template #nom="{ ligne }">
          <RouterLink :to="`/catalogue/${ligne.id}`">{{ ligne.nom }}</RouterLink>
        </template>
        <template #emballee="{ ligne }">{{ formaterDimensions(ligne.dimsEmballees) }}</template>
        <template #nue="{ ligne }">
          {{ ligne.dimsNues ? formaterDimensions(ligne.dimsNues) : textes.referentiels.aucun }}
        </template>
        <template #poids="{ ligne }">{{ formaterPoids(ligne.poids) }}</template>
        <template #fragile="{ ligne }">{{ ligne.fragile ? t.oui : t.non }}</template>
        <template #forme="{ ligne }">{{ textes.formes[ligne.forme] }}</template>
      </TableauTriable>
      <p v-if="affiches.length === 0" class="etat catalogue__vide">{{ t.aucunResultat }}</p>
    </section>

    <div class="archives">
      <Bouton
        variante="texte"
        :aria-expanded="archivesVisibles"
        aria-controls="articles-archives"
        @click="archivesVisibles = !archivesVisibles"
      >
        {{ archivesVisibles ? t.archives.masquer : t.archives.afficher(archives.length) }}
      </Bouton>
      <section
        v-if="archivesVisibles"
        id="articles-archives"
        class="archives__cadre"
        aria-labelledby="titre-archives"
      >
        <h2 id="titre-archives" class="archives__titre">{{ t.archives.titre }}</h2>
        <p class="archives__intro">{{ t.archives.intro }}</p>
        <p v-if="archives.length === 0" class="etat">{{ t.archives.aucun }}</p>
        <table v-else class="tableau">
          <thead>
            <tr>
              <th scope="col">{{ t.colonnes.reference }}</th>
              <th scope="col">{{ t.colonnes.article }}</th>
              <th scope="col">{{ t.colonnes.famille }}</th>
              <th scope="col">{{ t.colonnes.archiveLe }}</th>
              <th scope="col">{{ t.colonnes.action }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="article in archives" :key="article.id">
              <td class="donnees catalogue__doux">
                {{ article.reference ?? textes.referentiels.aucun }}
              </td>
              <th scope="row" class="catalogue__nom">
                <RouterLink :to="`/catalogue/${article.id}`">{{ article.nom }}</RouterLink>
              </th>
              <td>{{ article.famille }}</td>
              <td class="donnees">{{ formaterDate(article.archiveLe ?? '') }}</td>
              <td>
                <Bouton taille="petite" @click="reactiver(article)">
                  {{ textes.referentiels.reactiver }}
                  <span class="visuellement-cache">{{ article.nom }}</span>
                </Bouton>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </template>
</template>

<style scoped>
.etat {
  font: var(--typo-interface);
  color: var(--texte-doux);
}

.catalogue,
.archives__cadre {
  overflow-x: auto;
  background: var(--surface);
  border: 1px solid var(--bordure);
  border-radius: var(--rayon-carte);
}

.catalogue__outils {
  display: flex;
  flex-direction: column;
  gap: var(--espace-3);
  padding: var(--espace-4);
  border-bottom: 1px solid var(--bordure);
}

.catalogue__recherche {
  position: relative;
  display: flex;
  gap: var(--espace-3);
  align-items: center;
}

.catalogue__loupe {
  position: absolute;
  left: var(--espace-3);
  color: var(--texte-doux);
  pointer-events: none;
}

.catalogue__saisie {
  width: min(360px, 100%);
  min-height: var(--cible-compacte);
  padding: 0 var(--espace-3) 0 calc(var(--espace-7) + var(--espace-1));
  font: var(--typo-interface);
  color: var(--encre);
  background: var(--surface);
  border: 1px solid var(--bordure-forte);
  border-radius: var(--rayon-controle);
}

.catalogue__compte {
  margin: 0;
  font: var(--typo-legende);
  color: var(--texte-doux);
}

.catalogue__familles {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espace-2);
}

.catalogue__nombre {
  font: var(--typo-legende);
  color: var(--texte-doux);
}

/* Cellules dessinées par TableauTriable : `:deep` les atteint. */
:deep(.catalogue__doux) {
  color: var(--texte-doux);
}

:deep(.catalogue__nom) {
  font: var(--typo-bouton);
}

:deep(.catalogue__nom) a {
  color: var(--encre);
  text-decoration: none;
}

:deep(.catalogue__nom) a:hover {
  color: var(--action);
  text-decoration: underline;
}

.catalogue__vide {
  padding: 0 var(--espace-4) var(--espace-4);
}

.archives {
  margin-top: var(--espace-4);
}

.archives__cadre {
  padding: var(--espace-4);
  margin-top: var(--espace-2);
}

.archives__titre {
  margin: 0;
  font: var(--typo-titre-section);
}

.archives__intro {
  margin: var(--espace-1) 0 var(--espace-3);
  font: var(--typo-legende);
  color: var(--texte-doux);
}
</style>
