// Accès aux dépôts depuis les pages (cahier technique 7.1).
//
// `main.ts` crée les dépôts une fois, puis les fournit à toute l'application
// avec `app.provide`. Une page les récupère avec `utiliserDepots()`. Les tests
// de composants fournissent à la place des dépôts en mémoire :
//   mount(Page, { global: { provide: { [CLE_DEPOTS]: creerDepotsEnMemoire() } } })
// Les pages ne savent donc jamais si elles parlent à Supabase ou à la mémoire.
import { inject, type InjectionKey } from 'vue'
import type { Depots } from '@/donnees/depots'

export const CLE_DEPOTS: InjectionKey<Depots> = Symbol('depots')

export function utiliserDepots(): Depots {
  const depots = inject(CLE_DEPOTS)
  if (!depots) throw new Error('Dépôts non fournis : voir main.ts (app.provide(CLE_DEPOTS, …)).')
  return depots
}
