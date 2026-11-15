// Fabrique des dépôts de l'application (cahier technique 7.1).
//
// Deux sources possibles, choisies au moment de la construction :
// - Supabase, par défaut : l'URL et la clé publique viennent de `.env.local` ;
// - la mémoire, avec `VITE_DONNEES=memoire` : les dépôts démarrent avec la
//   base d'exemple de `supabase/seed.sql` (RG-01) et tout est perdu au
//   rechargement de la page. Les tests de bout en bout s'en servent pour ne
//   jamais écrire dans la vraie base (`playwright.config.ts`).
import type { Depots } from './depots'

export async function creerDepots(
  source: string | undefined = import.meta.env.VITE_DONNEES,
): Promise<Depots> {
  if (source === 'memoire') {
    // Imports à la demande : seed.sql n'entre dans l'application que dans ce mode.
    const [{ creerDepotsEnMemoire }, { lireDonneesDemarrage }, { default: sql }] =
      await Promise.all([
        import('./memoire'),
        import('./demarrage'),
        import('../../supabase/seed.sql?raw'),
      ])
    return creerDepotsEnMemoire(lireDonneesDemarrage(sql))
  }
  const [{ creerDepotsSupabase }, { creerClientSupabase }] = await Promise.all([
    import('./supabase'),
    import('./client-supabase'),
  ])
  return creerDepotsSupabase(creerClientSupabase())
}
