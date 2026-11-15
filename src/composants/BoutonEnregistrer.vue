<script setup lang="ts">
/**
 * Bouton d'enregistrement d'un formulaire, avec l'indication des
 * modifications non enregistrées (RG-21, RG-22 ; cahier technique 6.1).
 * À utiliser dans tous les formulaires.
 *
 * - Tant que le formulaire diffère de ce qui est enregistré, le message
 *   « Modifications non enregistrées » s'affiche à côté du bouton, avec une
 *   icône (la couleur n'est jamais seule), et le bouton passe en principal
 *   (fond `encre`) : c'est l'action à faire.
 * - Sans modification, le bouton reste en secondaire, mais toujours actif
 *   (RG-21 : le bouton d'enregistrement n'est jamais désactivé).
 * - Le message est dans une zone `role="status"` présente dès l'affichage :
 *   le lecteur d'écran l'annonce quand il apparaît.
 * - Le bouton est de type `submit` et rattaché au formulaire par son
 *   identifiant (`formulaire`) : il peut être placé hors du `<form>`, dans
 *   l'en-tête de la page.
 */
import { textes } from '@/textes/fr'
import Bouton from './Bouton.vue'
import Icone from './Icone.vue'

const props = defineProps<{
  libelle: string
  modifie: boolean
  /** Identifiant du `<form>` à envoyer. */
  formulaire: string
}>()
</script>

<template>
  <div class="enregistrer">
    <p class="enregistrer__etat" role="status">
      <template v-if="props.modifie">
        <Icone nom="crayon" :taille="16" />
        {{ textes.composants.modificationsNonEnregistrees }}
      </template>
    </p>
    <Bouton
      :variante="props.modifie ? 'principal' : 'secondaire'"
      taille="grande"
      type="submit"
      :form="props.formulaire"
    >
      {{ props.libelle }}
    </Bouton>
  </div>
</template>

<style scoped>
.enregistrer {
  display: flex;
  gap: var(--espace-3);
  align-items: center;
}

.enregistrer__etat {
  display: flex;
  gap: var(--espace-1);
  align-items: center;
  margin: 0;
  font: var(--typo-bouton);
  color: var(--texte-fort);
}

.enregistrer__etat:empty {
  display: none;
}
</style>
