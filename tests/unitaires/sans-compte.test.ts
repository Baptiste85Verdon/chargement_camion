// RG-17 : la V1 fonctionne sans compte utilisateur, et doit pouvoir accueillir
// plus tard une connexion. Trois choses le garantissent, et ce fichier les
// vérifie :
// - aucune page ne demande de se connecter ;
// - le client Supabase ne garde aucune session dans le navigateur ;
// - aucun code n'appelle l'authentification de Supabase. L'accès aux données
//   ne passe que par les dépôts (`src/donnees/`) : c'est là, et seulement là,
//   qu'une connexion viendra s'ajouter.
import { describe, expect, it, vi } from 'vitest'
import { routes } from '@/router'

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn(() => ({})) }))
vi.mock('@supabase/supabase-js', () => ({ createClient }))

/** Tout le code de l'application, en texte brut. */
const sources = import.meta.glob<string>('/src/**/*.{ts,vue}', {
  query: '?raw',
  import: 'default',
  eager: true,
})

describe('RG-17 : pas de compte en V1', () => {
  it('RG-17 : aucune page ne demande de se connecter', () => {
    const chemins = routes.map((r) => r.path)
    expect(chemins.some((c) => /connexion|login|compte|inscription/i.test(c))).toBe(false)
  })

  it('RG-17 : le client Supabase ne garde aucune session', async () => {
    const { creerClientSupabase } = await import('@/donnees/client-supabase')
    creerClientSupabase('https://exemple.supabase.co', 'sb_publishable_factice')
    expect(createClient).toHaveBeenCalledWith(
      'https://exemple.supabase.co',
      'sb_publishable_factice',
      { auth: { persistSession: false } },
    )
  })

  it('RG-17 : aucun code n’appelle l’authentification de Supabase', () => {
    const fichiers = Object.keys(sources)
    expect(fichiers.length).toBeGreaterThan(50)
    const appels = fichiers.filter((f) =>
      /\.auth\.|signIn|signUp|getSession/.test(sources[f] ?? ''),
    )
    expect(appels).toEqual([])
  })

  it('RG-17 : Supabase n’est importé que par la couche des données', () => {
    const importeurs = Object.keys(sources).filter((f) =>
      /from '@supabase\/supabase-js'/.test(sources[f] ?? ''),
    )
    expect(importeurs.length).toBeGreaterThan(0)
    expect(importeurs.every((f) => f.startsWith('/src/donnees/'))).toBe(true)
  })
})
