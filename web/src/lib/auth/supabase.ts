import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Public, client-safe Supabase config. Both values are meant to be exposed to
// the browser (the anon key is not a secret). When they are absent, auth is
// considered disabled and the AI feature stays open (graceful degradation).
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isAuthConfigured = Boolean(url && anonKey)

// Browser-only: supabase-js builds a Realtime WebSocket client that throws on
// the SSR server (Node < 22). The client is only ever used in the browser, so
// it stays null during SSR. Server-side token checks use auth-guard.ts (fetch).
const isBrowser = typeof window !== 'undefined'

export const supabase: SupabaseClient | null =
  isBrowser && url && anonKey ? createClient(url, anonKey) : null

/** Current session access token (JWT), or null if signed out / not configured. */
export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}
