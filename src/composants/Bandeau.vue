<script setup lang="ts">
/**
 * Bandeau posé au-dessus ou au-dessous d'une vue.
 *
 * - alerte : fond `surface`, contour ambre de 1 px sur tout le pourtour, icône
 *   triangle et titre en `alerte-texte` ; corps en `encre`. Jamais de fond
 *   crème, jamais de barre colorée sur un seul côté (charte, « Alertes ») ;
 * - info : fond `info-fond`, contour `info-bordure`, texte `action-fonce`
 *   (filtre actif, description d'étape).
 *
 * Le bandeau n'annonce rien de lui-même : les messages à lire sont envoyés
 * dans la zone `aria-live` de la page, qui sait quand ils changent.
 */
import { computed } from 'vue'
import Icone from './Icone.vue'

const props = withDefaults(defineProps<{ ton: 'alerte' | 'info'; titre?: string }>(), {
  titre: undefined,
})

const icone = computed(() => (props.ton === 'alerte' ? 'alerte' : 'info'))
</script>

<template>
  <div class="bandeau" :class="`bandeau--${props.ton}`">
    <Icone class="bandeau__icone" :nom="icone" />
    <p class="bandeau__texte">
      <strong v-if="props.titre" class="bandeau__titre">{{ props.titre }}</strong>
      <span v-if="props.titre && $slots.default"> : </span>
      <slot />
    </p>
    <div v-if="$slots.actions" class="bandeau__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.bandeau {
  display: flex;
  gap: var(--espace-3);
  align-items: center;
  padding: var(--espace-2) var(--espace-4);
  font: var(--typo-interface);
  border: 1px solid;
  border-radius: var(--rayon-controle);
}

.bandeau__texte {
  flex: 1;
  margin: 0;
}

.bandeau__titre {
  font-weight: 600;
}

.bandeau__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espace-2);
}

.bandeau--alerte {
  color: var(--encre);
  background: var(--surface);
  border-color: var(--alerte-bordure);
}

.bandeau--alerte .bandeau__icone {
  color: var(--alerte-icone);
}

.bandeau--alerte .bandeau__titre {
  color: var(--alerte-texte);
}

.bandeau--info {
  color: var(--action-fonce);
  background: var(--info-fond);
  border-color: var(--info-bordure);
}
</style>
