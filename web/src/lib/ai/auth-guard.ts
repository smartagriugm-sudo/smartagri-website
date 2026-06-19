// Server-only authorization for the AI routes. When Supabase env is set, a
// valid Bearer access token is required; otherwise auth is disabled and
// requests are allowed (graceful degradation until Supabase is configured).
//
// We verify the token with a direct call to Supabase's Auth REST API rather
// than the supabase-js SDK: the SDK constructs a Realtime WebSocket client that
// throws on Node < 22, and we only need token verification here.
const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

export const isAuthEnabled = Boolean(url && anonKey)

/**
 * Authorize a request to the AI routes from its Authorization header.
 * Returns true when allowed (valid session, or auth disabled), false otherwise.
 */
export async function isAuthorized(authHeader: string | undefined): Promise<boolean> {
  if (!url || !anonKey) return true // auth disabled until configured
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return false
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    })
    return res.ok
  } catch {
    return false
  }
}
