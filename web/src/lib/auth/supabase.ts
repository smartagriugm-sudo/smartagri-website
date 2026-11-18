import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createCookieStorage, moveLocalSessions } from './cookie-storage'

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

// Older confirmation emails (sent before /auth/confirm existed) land on the
// home page with the session or an error in the hash. Hand them to the
// confirmation page, which reads the tokens and clears them from the URL.
if (isBrowser && window.location.pathname !== '/auth/confirm') {
  const hash = window.location.hash
  if (/(^|[#&])type=(signup|email)(&|$)/.test(hash) || /(^|[#&])error_code=/.test(hash)) {
    window.location.replace(`/auth/confirm${hash}`)
  }
}

// The session lives in cookies shared by every smart-agri.id subdomain, so signing
// in on smartagri also signs in on agrosphere and back (lib/auth/cookie-storage.ts).
// Sessions saved in localStorage before that are moved over once.
function sessionStorageForBrowser() {
  const cookies = createCookieStorage(document, {
    hostname: window.location.hostname,
    secure: window.location.protocol === 'https:',
  })
  try {
    moveLocalSessions(window.localStorage, cookies)
  } catch {
    // localStorage can be blocked (private mode, strict settings); nothing to move then.
  }
  return cookies
}

export const supabase: SupabaseClient | null =
  isBrowser && url && anonKey
    ? createClient(url, anonKey, { auth: { storage: sessionStorageForBrowser() } })
    : null

/** Current session access token (JWT), or null if signed out / not configured. */
export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}
