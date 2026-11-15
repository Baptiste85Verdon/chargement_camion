<script setup lang="ts">
/**
 * Code de commande (C1, C2…), signature de l'application (charte, « Code de
 * commande »). Toujours la même forme : cartouche en `code-commande`, fond
 * `cmdN-fond`, contour de 2 px `cmdN-bord`, coins `rayon-code`. Le texte reste
 * en `encre` : c'est le code, pas la couleur, qui identifie la commande.
 *
 * Deux états du plan (charte, « Articles atténués et silhouettes ») :
 * - `attenue` : une autre commande est mise en évidence (fond `attenue-fond`,
 *   contour `attenue-bord`, texte `texte-doux`) ;
 * - `silhouette` : étape à venir (fond `surface`, contour pointillé
 *   `bordure-forte`, texte `texte-doux`).
 */
import { computed } from 'vue'
import { teinteCommande } from './teinte-commande'

const props = withDefaults(
  defineProps<{ numero: number; etat?: 'normal' | 'attenue' | 'silhouette' }>(),
  { etat: 'normal' },
)

const teinte = computed(() => teinteCommande(props.numero))
</script>

<template>
  <span
    class="code-commande"
    :class="[
      `code-commande--t${teinte.teinte}`,
      {
        'code-commande--hachure': teinte.hachure && props.etat === 'normal',
        [`code-commande--${props.etat}`]: props.etat !== 'normal',
      },
    ]"
    >C{{ props.numero }}</span
  >
</template>

<style scoped>
.code-commande {
  display: inline-block;
  min-width: 3ch;
  padding: var(--espace-1) var(--espace-1);
  font: var(--typo-code-commande);
  color: var(--encre);
  text-align: center;
  white-space: nowrap;
  background: var(--cmd-fond);
  border: 2px solid var(--cmd-bord);
  border-radius: var(--rayon-code);
}

/* Les six teintes : chaque classe choisit son couple de jetons. */
.code-commande--t1 {
  --cmd-fond: var(--cmd1-fond);
  --cmd-bord: var(--cmd1-bord);
}

.code-commande--t2 {
  --cmd-fond: var(--cmd2-fond);
  --cmd-bord: var(--cmd2-bord);
}

.code-commande--t3 {
  --cmd-fond: var(--cmd3-fond);
  --cmd-bord: var(--cmd3-bord);
}

.code-commande--t4 {
  --cmd-fond: var(--cmd4-fond);
  --cmd-bord: var(--cmd4-bord);
}

.code-commande--t5 {
  --cmd-fond: var(--cmd5-fond);
  --cmd-bord: var(--cmd5-bord);
}

.code-commande--t6 {
  --cmd-fond: var(--cmd6-fond);
  --cmd-bord: var(--cmd6-bord);
}

/*
 * C7 à C12 : fond hachuré (charte). Ce n'est pas un dégradé : les arrêts de
 * couleur tombent au même endroit, ce qui donne des rayures nettes, alternant
 * le fond de la commande et `surface`, sur lesquelles l'encre reste lisible.
 */
.code-commande--hachure {
  background: repeating-linear-gradient(
    135deg,
    var(--cmd-fond) 0 var(--espace-1),
    var(--surface) var(--espace-1) var(--espace-2)
  );
}

/* Les états du plan passent après les teintes : ils les remplacent. */
.code-commande--attenue {
  color: var(--texte-doux);
  background: var(--attenue-fond);
  border-color: var(--attenue-bord);
}

.code-commande--silhouette {
  color: var(--texte-doux);
  background: var(--surface);
  border-style: dashed;
  border-color: var(--bordure-forte);
}
</style>
