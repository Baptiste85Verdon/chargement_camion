<script setup lang="ts">
/**
 * Modèles de camions (capture 09, cahier fonctionnel 4.7).
 *
 * Chaque modèle montre sa caisse à l'échelle, vue de dessus : la plus longue
 * occupe toute la colonne, les autres en proportion. Sous le tableau, la
 * liste des modèles archivés, avec « Réactiver » (RG-21).
 */
import { computed, onMounted, ref } from 'vue'
import { estActif, type ModeleCamion, type Tournee } from '@/domaine/modele'
import { ErreurDonnees } from '@/donnees/erreurs'
import { useAnnonces } from '@/stores/annonces'
import { utiliserDepots } from '@/stores/depots'
import { textes } from '@/textes/fr'
import Annonce from '@/composants/Annonce.vue'
import Bandeau from '@/composants/Bandeau.vue'
import Bouton from '@/composants/Bouton.vue'
import EntetePage from '@/composants/EntetePage.vue'
import LienBouton from '@/composants/LienBouton.vue'
import TableauTriable, { type ColonneTableau } from '@/composants/TableauTriable.vue'
import type { EtatTri } from '@/composants/tri'
import { formaterDate, formaterMillimetres, formaterVolume } from '@/composants/format'

const t = textes.camions
const depots = utiliserDepots()
const annonces = useAnnonces()

const tous = ref<ModeleCamion[]>([])
const tournees = ref<Tournee[]>([])
const chargement = ref(true)
const erreurChargement = ref('')
const annonce = ref('')
const tonAnnonce = ref<'info' | 'alerte'>('info')
const archivesVisibles = ref(false)

const actifs = computed(() => tous.value.filter(estActif))
const archives = computed(() => tous.value.filter((c) => !estActif(c)))
const plusLongue = computed(() => Math.max(1, ...actifs.value.map((c) => c.longueur)))

async function charger() {
  try {
    ;[tous.value, tournees.value] = await Promise.all([
      depots.camions.lister({ avecArchives: true }),
      depots.tournees.lister(),
    ])
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

/** Références des tournées qui utilisent le modèle, ou un tiret. */
const tourneesDe = (camion: ModeleCamion) =>
  tournees.value
    .filter((tr) => tr.modeleCamionId === camion.id)
    .map((tr) => tr.reference)
    .join(', ') || textes.referentiels.aucun

/** Largeur de la caisse dessinée, en pourcentage de la colonne. */
const echelle = (camion: ModeleCamion) => `${(camion.longueur / plusLongue.value) * 100}%`

const dimensions = (c: ModeleCamion) =>
  [c.longueur, c.largeur, c.hauteur].map(formaterMillimetres).join(' × ')

/** Modèles triés par nom par défaut ; un clic sur un en-tête change le tri. */
const tri = ref<EtatTri | null>({ cle: 'nom', sens: 'croissant' })

const colonnes: ColonneTableau<ModeleCamion>[] = [
  { cle: 'nom', libelle: t.colonnes.modele, valeur: (c) => c.nom, classe: 'camions__nom' },
  {
    cle: 'echelle',
    libelle: t.colonnes.echelle,
    valeur: (c) => c.longueur,
    classe: 'camions__echelle',
  },
  {
    cle: 'caisse',
    libelle: t.colonnes.caisse,
    valeur: (c) => [c.longueur, c.largeur, c.hauteur],
    classe: 'donnees',
  },
  {
    cle: 'volume',
    libelle: t.colonnes.volume,
    valeur: (c) => c.longueur * c.largeur * c.hauteur,
    nombre: true,
    classe: 'donnees',
  },
  { cle: 'tournees', libelle: t.colonnes.tournees, valeur: tourneesDe },
  { cle: 'action', libelle: t.colonnes.action, libelleCache: true, classe: 'camions__action' },
]

async function reactiver(camion: ModeleCamion) {
  try {
    await depots.camions.reactiver(camion.id)
    tonAnnonce.value = 'info'
    annonce.value = t.reactive(camion.nom)
    await charger()
  } catch (erreur) {
    tonAnnonce.value = 'alerte'
    annonce.value = erreur instanceof ErreurDonnees ? erreur.message : textes.donnees.reseau
  }
}
</script>

<template>
  <EntetePage :titre="t.titre" :sous-titre="t.intro">
    <template #actions>
      <LienBouton vers="/camions/nouveau" variante="principal" taille="grande" icone="plus">
        {{ t.creer }}
      </LienBouton>
    </template>
  </EntetePage>

  <Annonce :message="annonce" :ton="tonAnnonce" />

  <p v-if="chargement" class="etat">{{ textes.referentiels.chargement }}</p>
  <Bandeau v-else-if="erreurChargement" ton="alerte">{{ erreurChargement }}</Bandeau>

  <template v-else>
    <div class="cadre">
      <TableauTriable
        v-model:tri="tri"
        :colonnes="colonnes"
        :lignes="actifs"
        :cle-ligne="(c) => c.id"
        :legende="t.legende"
        entete-ligne="nom"
      >
        <template #echelle="{ ligne }">
          <div
            class="caisse"
            :style="{ width: echelle(ligne) }"
            role="img"
            :aria-label="t.echelle(formaterMillimetres(ligne.longueur))"
          >
            <span aria-hidden="true">{{ t.fond }}</span>
            <span aria-hidden="true">{{ t.portes }}</span>
          </div>
        </template>
        <template #caisse="{ ligne }">{{ dimensions(ligne) }}</template>
        <template #volume="{ ligne }">{{ formaterVolume(ligne) }}</template>
        <template #tournees="{ ligne }">{{ tourneesDe(ligne) }}</template>
        <template #action="{ ligne }">
          <LienBouton :vers="`/camions/${ligne.id}`" :libelle="t.ouvrir(ligne.nom)">
            {{ textes.referentiels.ouvrirLaFiche }}
          </LienBouton>
        </template>
      </TableauTriable>
    </div>

    <div class="archives">
      <Bouton
        variante="texte"
        :aria-expanded="archivesVisibles"
        aria-controls="camions-archives"
        @click="archivesVisibles = !archivesVisibles"
      >
        {{ archivesVisibles ? t.archives.masquer : t.archives.afficher(archives.length) }}
      </Bouton>
      <section
        v-if="archivesVisibles"
        id="camions-archives"
        class="cadre archives__cadre"
        aria-labelledby="titre-camions-archives"
      >
        <h2 id="titre-camions-archives" class="archives__titre">{{ t.archives.titre }}</h2>
        <p class="archives__intro">{{ t.archives.intro }}</p>
        <p v-if="archives.length === 0" class="etat">{{ t.archives.aucun }}</p>
        <table v-else class="tableau">
          <thead>
            <tr>
              <th scope="col">{{ t.colonnes.modele }}</th>
              <th scope="col">{{ t.colonnes.caisse }}</th>
              <th scope="col">{{ t.colonnes.archiveLe }}</th>
              <th scope="col">{{ t.colonnes.action }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="camion in archives" :key="camion.id">
              <th scope="row" class="camions__nom">
                <RouterLink :to="`/camions/${camion.id}`">{{ camion.nom }}</RouterLink>
              </th>
              <td class="donnees">{{ dimensions(camion) }}</td>
              <td class="donnees">{{ formaterDate(camion.archiveLe ?? '') }}</td>
              <td>
                <Bouton taille="petite" @click="reactiver(camion)">
                  {{ textes.referentiels.reactiver }}
                  <span class="visuellement-cache">{{ camion.nom }}</span>
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

.cadre {
  overflow-x: auto;
  background: var(--surface);
  border: 1px solid var(--bordure);
  border-radius: var(--rayon-carte);
}

/* Cellules dessinées par TableauTriable : `:deep` les atteint. */
:deep(.camions__nom) {
  font: var(--typo-bouton);
  white-space: nowrap;
}

:deep(.camions__nom) a {
  color: var(--encre);
}

:deep(.camions__echelle) {
  width: 32%;
}

/* La caisse vue de dessus, à l'échelle : Fond à gauche, Portes à droite. */
:deep(.caisse) {
  display: flex;
  justify-content: space-between;
  min-width: max-content;
  padding: var(--espace-1) var(--espace-1);
  font: var(--typo-repere);
  color: var(--texte-fort);
  background: var(--camion-fond);
  border: 2px solid var(--camion-contour);
  border-radius: var(--rayon-code);
}

:deep(.camions__action) {
  text-align: right;
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
