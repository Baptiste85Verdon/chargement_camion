// Client Supabase de l'application (cahier technique 7.2).
//
// L'URL du projet et la clé publique (`sb_publishable_…`) viennent de
// `.env.local`, par `import.meta.env` : elles sont publiques par nature,
// puisqu'elles partent dans le navigateur. La clé secrète et le mot de passe
// de la base n'ont rien à faire ici (CLAUDE.md, section Supabase).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function creerClientSupabase(
  url: string = import.meta.env.VITE_SUPABASE_URL,
  cle: string = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
): SupabaseClient {
  if (!url || !cle) {
    throw new Error(
      'VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY manquent : copiez .env.example en .env.local et remplissez-le (docs/installation.md, point 5).',
    )
  }
  // V1 sans compte (RG-17) : pas de session à conserver dans le navigateur.
  return createClient(url, cle, { auth: { persistSession: false } })
}
