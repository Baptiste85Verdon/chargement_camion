import { defineConfig, devices } from '@playwright/test'

const port = 4173

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    locale: 'fr-FR',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Les tests tournent sur la version construite, comme en production.
  webServer: {
    command: `npm run build && npx vite preview --port ${port} --strictPort`,
    // Dépôts en mémoire, remplis avec supabase/seed.sql : les tests ne
    // touchent jamais la vraie base, et chaque page rechargée repart à zéro.
    env: { VITE_DONNEES: 'memoire' },
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
