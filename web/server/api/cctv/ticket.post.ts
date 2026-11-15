import { createHmac } from 'node:crypto'
import { defineEventHandler, getRequestHeader } from 'h3'
import { jsonResponse } from '../../../src/lib/ai/ollama'

// POST /api/cctv/ticket: a short-lived pass to the plant factory camera.
// The browser sends its Supabase session; when the account may open the ERP
// (signed in, onboarded and approved, as ErpGate asks), it gets the gateway's
// address and a ticket "<expiry>.<HMAC>" signed with CCTV_SECRET, which the
// gateway on the bridge PC checks (docs/setup/SETUP-CCTV.md). The camera
// password never leaves the bridge PC.

const TICKET_SECONDS = 300

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

/** Same rule as ErpGate and AuthGate, checked here with the user's own token. */
async function mayOpenErp(authHeader: string | undefined): Promise<boolean> {
  if (!supabaseUrl || !anonKey) return process.env.NODE_ENV !== 'production'
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return false
  const headers = { apikey: anonKey, Authorization: `Bearer ${token}` }
  try {
    const user = await fetch(`${supabaseUrl}/auth/v1/user`, { headers })
    if (!user.ok) return false
    const { id } = (await user.json()) as { id?: string }
    if (!id) return false
    const res = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(id)}&select=*`, { headers })
    if (!res.ok) return res.status === 404 // no profiles table yet: same as OPEN_ACCOUNT
    const [profile] = (await res.json()) as Record<string, unknown>[]
    if (!profile || !('status' in profile)) return true // accounts.sql not run yet
    return profile.status === 'active' && !!profile.onboarded_at
  } catch {
    return false
  }
}

export default defineEventHandler(async (event) => {
  const base = process.env.CCTV_BASE_URL?.replace(/\/+$/, '')
  const secret = process.env.CCTV_SECRET
  if (!base || !secret) return jsonResponse({ error: 'The camera is not set up on this deployment.' }, 503)
  if (!(await mayOpenErp(getRequestHeader(event, 'authorization')))) {
    return jsonResponse({ error: 'Sign in with an approved account to watch the camera.' }, 401)
  }
  const expires = String(Math.floor(Date.now() / 1000) + TICKET_SECONDS)
  const ticket = `${expires}.${createHmac('sha256', secret).update(expires).digest('hex')}`
  return jsonResponse({ base, ticket, expiresAt: Number(expires) * 1000 }, 200)
})
