import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import vue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'playwright-report/**', 'test-results/**'] },

  js.configs.recommended,
  ...tseslint.configs.strict,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },

  // Le domaine est du TypeScript pur (cahier technique, 9.2) :
  // il n'importe rien de Vue, de Pinia, du routeur ni de Supabase.
  {
    files: ['src/domaine/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['vue', 'vue-*', '@vue/*', 'pinia', '@supabase/*', '*.vue'],
              message: 'Le domaine est en TypeScript pur : pas de Vue ni de Supabase.',
            },
            {
              group: ['@/donnees/*', '@/stores/*', '@/pages/*', '@/composants/*', '@/router/*'],
              message: "Le domaine ne dépend d'aucune autre couche de l'application.",
            },
          ],
        },
      ],
    },
  },

  // Désactive les règles de mise en forme : c'est le rôle de Prettier.
  prettier,
)
