import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // jsdom simule un navigateur pour les tests de composants Vue.
      environment: 'jsdom',
      include: ['tests/unitaires/**/*.test.ts', 'src/**/*.test.ts'],
    },
  }),
)
