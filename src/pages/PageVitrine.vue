<script setup lang="ts">
/**
 * Vitrine des composants de base (étape 7) : chaque composant avec ses états,
 * pour la relecture et pour le contrôle axe-core (tests/e2e/vitrine.spec.ts).
 * Page hors navigation, à l'adresse /vitrine.
 */
import { nextTick, ref } from 'vue'
import Badge from '@/composants/Badge.vue'
import Bandeau from '@/composants/Bandeau.vue'
import Bouton from '@/composants/Bouton.vue'
import Carte from '@/composants/Carte.vue'
import Champ from '@/composants/Champ.vue'
import CodeCommande from '@/composants/CodeCommande.vue'
import ConfirmationDialog from '@/composants/ConfirmationDialog.vue'
import Interrupteur from '@/composants/Interrupteur.vue'
import ResumeErreurs, { type ErreurResumee } from '@/composants/ResumeErreurs.vue'
import Selecteur from '@/composants/Selecteur.vue'
import Touche from '@/composants/Touche.vue'
import { textes } from '@/textes/fr'

const t = textes.vitrine
const s = t.selecteurs

// Sélecteurs : « Gauche » est affichée dans l'autre cadre, donc indisponible ici.
const vue = ref('dessus')
const vues = [
  { valeur: 'dessus', libelle: s.dessus },
  { valeur: 'gauche', libelle: s.gauche, desactive: true },
  { valeur: 'droite', libelle: s.droite },
  { valeur: 'avant', libelle: s.avant },
  { valeur: 'arriere', libelle: s.arriere },
]
const profondeur = ref('tout')
const profondeurs = [
  { valeur: 'tout', libelle: s.tout },
  { valeur: 'moins1', libelle: s.unCouche },
  { valeur: 'moins2', libelle: s.deuxCouches },
]
const mode = ref('complet')
const modes = [
  { valeur: 'complet', libelle: s.planComplet },
  { valeur: 'etape', libelle: s.parEtape },
]
const aimantation = ref(true)
const aimantationDesactivee = ref(false)
const commandePressee = ref(true)

// Champs : un exemple de chaque état. Les messages viennent du fichier de textes.
const c = t.champs
const nom = ref('Poutre lamellé-collé')
const reference = ref('')
const longueur = ref('12,5')
const poids = ref('22,5')
const famille = ref('')
const poidsNu = ref('')

const resume = ref<InstanceType<typeof ResumeErreurs> | null>(null)
const erreursResumees = ref<ErreurResumee[]>([])

/** Démonstration du résumé : en vrai, la page appelle domaine/validation.ts. */
async function enregistrer() {
  erreursResumees.value = [
    { champId: 'vitrine-famille', libelle: c.famille, message: textes.validation.article.famille },
    {
      champId: 'vitrine-longueur',
      libelle: c.longueur,
      message: textes.validation.nombre.entierPositif,
    },
  ]
  await nextTick()
  resume.value?.focaliser()
}

// Fenêtres de confirmation (RG-22).
const f = t.fenetres
const fenetreOuverte = ref<'danger' | 'neutre' | null>(null)
const annonce = ref('')

function confirmer(action: string) {
  fenetreOuverte.value = null
  annonce.value = f.resultatConfirme(action)
}

function annuler() {
  fenetreOuverte.value = null
  annonce.value = f.resultatAnnule
}

const numerosCommandes = Array.from({ length: 12 }, (_, i) => i + 1)
</script>

<template>
  <div class="vitrine">
    <h1>{{ t.titre }}</h1>
    <p class="vitrine__intro">{{ t.intro }}</p>

    <Carte :titre="t.boutons.titre">
      <div class="vitrine__ligne">
        <Bouton variante="principal" taille="grande">{{ t.boutons.principal }}</Bouton>
        <Bouton>{{ t.boutons.secondaire }}</Bouton>
        <Bouton icone="clavier">{{ t.boutons.raccourcis }}</Bouton>
        <Bouton :presse="commandePressee" @click="commandePressee = !commandePressee">
          {{ t.boutons.presse }}
        </Bouton>
        <Bouton variante="texte" icone="chevron-droite">{{ t.boutons.texte }}</Bouton>
        <Bouton variante="danger">{{ t.boutons.danger }}</Bouton>
        <Bouton taille="petite">{{ t.boutons.petit }}</Bouton>
        <Bouton desactive>{{ t.boutons.desactive }}</Bouton>
        <Bouton icone="moins" seulement-icone :libelle="t.boutons.dezoomer" />
        <Bouton icone="plus" seulement-icone :libelle="t.boutons.zoomer" />
      </div>
    </Carte>

    <Carte :titre="s.titre">
      <div class="vitrine__ligne">
        <Selecteur v-model="profondeur" :legende="s.profondeur" :options="profondeurs" ton="info" />
        <Selecteur v-model="vue" :legende="s.vue" :options="vues" :legende-visible="false" />
        <Selecteur v-model="mode" :legende="s.mode" :options="modes" :legende-visible="false" />
      </div>
      <div class="vitrine__ligne">
        <Interrupteur v-model="aimantation" :libelle="s.aimantation" />
        <span class="donnees vitrine__complement">{{ s.pas }}</span>
        <Interrupteur
          v-model="aimantationDesactivee"
          :libelle="s.interrupteurDesactive"
          desactive
        />
      </div>
    </Carte>

    <Carte :titre="t.bandeaux.titre">
      <div class="vitrine__pile">
        <Bandeau ton="alerte" :titre="t.bandeaux.alerteTitre">
          <span class="donnees">{{ t.bandeaux.alerteCorps }}</span>
          <template #actions>
            <Bouton>{{ t.bandeaux.alerteAction }}</Bouton>
          </template>
        </Bandeau>
        <Bandeau ton="info">
          {{ t.bandeaux.infoCorps }}
          <template #actions>
            <Bouton variante="texte">{{ t.bandeaux.infoAction }}</Bouton>
          </template>
        </Bandeau>
      </div>
    </Carte>

    <Carte :titre="t.codes.titre" :sous-titre="t.codes.sousTitre">
      <ul class="vitrine__ligne vitrine__liste">
        <li v-for="numero in numerosCommandes" :key="numero">
          <CodeCommande :numero="numero" />
        </li>
      </ul>
    </Carte>

    <Carte :titre="t.cartes.titre">
      <div class="vitrine__grille">
        <Carte :titre="t.cartes.zone" :niveau="3" variante="zone">
          <template #actions><span class="donnees">0</span></template>
          <p class="vitrine__texte-doux">{{ t.cartes.zoneVide }}</p>
        </Carte>
        <div class="vitrine__ligne">
          <Badge>{{ t.cartes.badge }}</Badge>
          <span class="vitrine__touches">
            <Touche>R</Touche>
            <span>{{ t.cartes.touches }}</span>
          </span>
        </div>
      </div>
    </Carte>

    <Carte :titre="c.titre">
      <form class="vitrine__pile" novalidate @submit.prevent="enregistrer">
        <ResumeErreurs ref="resume" :erreurs="erreursResumees" />
        <div class="vitrine__grille">
          <Champ
            id="vitrine-nom"
            v-model="nom"
            :libelle="c.nom"
            obligatoire
            :avertissement="textes.validation.article.nomDejaUtilise('FEN-PVC-1V')"
          />
          <Champ id="vitrine-reference" v-model="reference" :libelle="c.reference" :aide="c.aide" />
          <Champ
            id="vitrine-famille"
            v-model="famille"
            :libelle="c.famille"
            obligatoire
            :erreur="textes.validation.article.famille"
          />
          <Champ
            id="vitrine-longueur"
            v-model="longueur"
            :libelle="c.longueur"
            obligatoire
            unite="mm"
            inputmode="numeric"
            donnees
            :erreur="textes.validation.nombre.entierPositif"
          />
          <Champ
            id="vitrine-poids"
            v-model="poids"
            :libelle="c.poids"
            obligatoire
            unite="kg"
            inputmode="decimal"
            donnees
          />
          <Champ
            id="vitrine-poids-nu"
            v-model="poidsNu"
            :libelle="c.desactive"
            unite="kg"
            donnees
            desactive
          />
        </div>
        <div>
          <Bouton variante="principal" type="submit">{{ c.enregistrer }}</Bouton>
        </div>
      </form>
    </Carte>

    <Carte :titre="f.titre">
      <div class="vitrine__ligne">
        <Bouton @click="fenetreOuverte = 'danger'">{{ f.ouvrirDanger }}</Bouton>
        <Bouton @click="fenetreOuverte = 'neutre'">{{ f.ouvrirNeutre }}</Bouton>
        <p class="vitrine__annonce" aria-live="polite">{{ annonce }}</p>
      </div>
      <ConfirmationDialog
        :ouvert="fenetreOuverte === 'danger'"
        :titre="f.dangerTitre"
        :consequence="f.dangerConsequence"
        :libelle-action="f.dangerAction"
        ton="danger"
        @confirmer="confirmer(f.dangerAction)"
        @annuler="annuler"
      />
      <ConfirmationDialog
        :ouvert="fenetreOuverte === 'neutre'"
        :titre="f.neutreTitre"
        :consequence="f.neutreConsequence"
        :libelle-action="f.neutreAction"
        ton="neutre"
        @confirmer="confirmer(f.neutreAction)"
        @annuler="annuler"
      />
    </Carte>
  </div>
</template>

<style scoped>
.vitrine {
  display: flex;
  flex-direction: column;
  gap: var(--espace-4);
}

.vitrine__intro {
  margin: 0;
  font: var(--typo-interface);
  color: var(--texte-doux);
}

.vitrine__ligne {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espace-3);
  align-items: center;
}

.vitrine__ligne + .vitrine__ligne {
  margin-top: var(--espace-4);
}

.vitrine__liste {
  padding: 0;
  margin: 0;
  list-style: none;
}

.vitrine__pile {
  display: flex;
  flex-direction: column;
  gap: var(--espace-4);
}

.vitrine__grille {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--espace-4);
  align-items: start;
}

.vitrine__complement,
.vitrine__texte-doux {
  margin: 0;
  font: var(--typo-legende);
  color: var(--texte-doux);
}

.vitrine__touches {
  display: inline-flex;
  gap: var(--espace-2);
  align-items: center;
  font: var(--typo-interface);
}

.vitrine__annonce {
  margin: 0;
  font: var(--typo-interface);
}
</style>
