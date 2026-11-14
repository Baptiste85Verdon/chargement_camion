/**
 * Stylelint : fait respecter la charte dans les feuilles de style.
 * Toutes les valeurs de couleur et d'ombre passent par les variables CSS
 * générées depuis les jetons (src/styles/jetons.css, ignoré ici).
 * Uniquement des règles intégrées à Stylelint, sans extension.
 */
export default {
  extends: ['stylelint-config-standard', 'stylelint-config-recommended-vue'],
  ignoreFiles: ['src/styles/jetons.css', 'dist/**', 'coverage/**'],
  rules: {
    // Couleurs en dur interdites : #1B1F24, red, rgb(…), hsl(…)…
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': [
      'rgb',
      'rgba',
      'hsl',
      'hsla',
      'hwb',
      'lab',
      'lch',
      'oklab',
      'oklch',
      'color',
    ],
    'declaration-property-value-allowed-list': {
      // Ombres : seulement ombre-flottant, ou l'anneau de focus construit avec des
      // variables. Toute valeur littérale sans var() est refusée.
      'box-shadow': [
        /^none$/,
        /^(?:(?:0|var\(--[a-z0-9-]+\))\s*){2,4}var\(--[a-z0-9-]+\)$/,
        /^var\(--ombre-flottant\)$/,
      ],
      // Rayons : uniquement les jetons rayon-*.
      'border-radius': [/^0$/, /^var\(--rayon-[a-z]+\)$/],
    },
    // Noms de classes en français, façon BEM : bloc__element--modificateur.
    'selector-class-pattern': [
      '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__[a-z0-9]+(?:-[a-z0-9]+)*)?(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?$',
      { message: 'Nom de classe attendu : bloc__element--modificateur, en minuscules.' },
    ],
  },
}
