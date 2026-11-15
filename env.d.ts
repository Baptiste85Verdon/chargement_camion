/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
  /** « memoire » : dépôts en mémoire, avec la base d'exemple (tests de bout en bout). */
  readonly VITE_DONNEES?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
