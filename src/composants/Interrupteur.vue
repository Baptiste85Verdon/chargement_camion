<script setup lang="ts">
/**
 * Interrupteur marche / arrêt (aimantation…).
 * Un bouton avec le rôle `switch` : le lecteur d'écran annonce « Aimantation,
 * interrupteur, activé ». Seul composant aux coins en pilule (charte).
 */
const props = withDefaults(defineProps<{ libelle: string; desactive?: boolean }>(), {
  desactive: false,
})

const actif = defineModel<boolean>({ required: true })

function basculer() {
  if (!props.desactive) actif.value = !actif.value
}
</script>

<template>
  <button
    type="button"
    role="switch"
    class="interrupteur"
    :aria-checked="actif"
    :disabled="props.desactive"
    @click="basculer"
  >
    <span class="interrupteur__libelle">{{ props.libelle }}</span>
    <span class="interrupteur__piste" aria-hidden="true">
      <span class="interrupteur__curseur" />
    </span>
  </button>
</template>

<style scoped>
.interrupteur {
  display: inline-flex;
  gap: var(--espace-2);
  align-items: center;
  min-height: var(--cible-mini);
  padding: 0 var(--espace-1);
  font: var(--typo-interface);
  color: var(--encre);
  cursor: pointer;
  background: none;
  border: 0;
  border-radius: var(--rayon-controle);
}

/* Piste : 36 × 20 px, contour `bordure-forte` (3:1) quand il est éteint. */
.interrupteur__piste {
  position: relative;
  display: inline-block;
  width: var(--cible-compacte);
  height: var(--espace-5);
  background: var(--surface);
  border: 1px solid var(--bordure-forte);
  border-radius: var(--rayon-pilule);
}

.interrupteur__curseur {
  position: absolute;
  top: 50%;
  left: var(--espace-2);
  width: var(--espace-3);
  height: var(--espace-3);
  background: var(--bordure-forte);
  border-radius: var(--rayon-pilule);
  transform: translate(-50%, -50%);
}

.interrupteur[aria-checked='true'] .interrupteur__piste {
  background: var(--action);
  border-color: var(--action);
}

.interrupteur[aria-checked='true'] .interrupteur__curseur {
  left: calc(100% - var(--espace-2));
  background: var(--surface);
}

.interrupteur:disabled {
  color: var(--texte-desactive);
  cursor: not-allowed;
}

.interrupteur:disabled .interrupteur__piste {
  background: var(--fond-page);
  border-style: dashed;
  border-color: var(--texte-desactive);
}

.interrupteur:disabled .interrupteur__curseur {
  background: var(--texte-desactive);
}

@media (prefers-reduced-motion: no-preference) {
  .interrupteur__curseur {
    transition: left 120ms ease-out;
  }
}
</style>
