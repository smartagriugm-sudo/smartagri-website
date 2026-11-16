import { defineEventHandler, getRequestHeader, readBody } from 'h3'
import { edgeFailureStatus, parseEdgeIngest } from '../../../src/lib/edge/ingest'

// POST /api/edge/ingest: where an on-site edge PC (the Grabag greenhouse dashboard)
// pushes its devices, actuator states and readings. The PC proves itself with its
// site token, which edge_ingest() checks against a stored hash, so this route needs
// only the anon key. Contract: docs/indoor-farming/API-EDGE-SYNC.md.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

const reply = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => null)
  const request = parseEdgeIngest(getRequestHeader(event, 'authorization'), body)
  if ('error' in request) return reply({ error: request.error }, request.status)
  if (!SUPABASE_URL || !ANON) return reply({ error: 'Service not configured' }, 503)

  let res: Response
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/edge_ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${ANON}` },
      body: JSON.stringify({ token: request.token, payload: request.payload }),
    })
  } catch {
    return reply({ error: 'Database unreachable, send again later' }, 503)
  }
  const result = (await res.json().catch(() => null)) as { code?: string; message?: string } | null
  if (res.ok) return reply(result, 200)
  if (res.status >= 500) return reply({ error: 'Database error, send again later' }, 503)
  const message = result?.message ?? 'Send refused'
  return reply({ error: message }, edgeFailureStatus(result?.code, message))
})
