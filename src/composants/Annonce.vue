<script setup lang="ts">
/**
 * Zone d'annonce d'une page (cahier technique 6, « Messages »).
 *
 * La zone `role="status"` (aria-live poli) existe dès l'affichage de la page,
 * vide : un lecteur d'écran n'annonce un texte que s'il apparaît dans une
 * zone déjà présente. Le message s'affiche dans un bandeau ; `ton` « alerte »
 * pour un refus (réactivation impossible), « info » sinon.
 */
import Bandeau from './Bandeau.vue'

const props = withDefaults(defineProps<{ message: string; ton?: 'info' | 'alerte' }>(), {
  ton: 'info',
})
</script>

<template>
  <div class="annonce" role="status">
    <Bandeau v-if="props.message" :ton="props.ton">{{ props.message }}</Bandeau>
  </div>
</template>

<style scoped>
.annonce:empty {
  display: none;
}
</style>
