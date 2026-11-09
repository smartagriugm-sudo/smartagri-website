import { defineEventHandler, getRequestHeader, readBody } from 'h3'
import { ingestFailureStatus, parseIngestRequest } from '../../../src/lib/pf/ingest'

// POST /api/pf/ingest: where sensor devices send their readings. The device proves
// itself with its own token, which pf_ingest() checks against a stored hash, so this
// route needs only the anon key. Contract: docs/erp-plant-factory/API-SENSOR.md.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

const reply = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => null)
  const request = parseIngestRequest(getRequestHeader(event, 'authorization'), body)
  if ('error' in request) return reply({ error: request.error }, request.status)
  if (!SUPABASE_URL || !ANON) return reply({ error: 'Layanan belum dikonfigurasi' }, 503)

  let res: Response
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/pf_ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${ANON}` },
      body: JSON.stringify({ token: request.token, readings: request.readings }),
    })
  } catch {
    return reply({ error: 'Database tidak bisa dihubungi, kirim ulang nanti' }, 503)
  }
  const result = (await res.json().catch(() => null)) as { code?: string; message?: string } | null
  if (res.ok) return reply(result, 200)
  if (res.status >= 500) return reply({ error: 'Database bermasalah, kirim ulang nanti' }, 503)
  const message = result?.message ?? 'Send refused'
  return reply({ error: message }, ingestFailureStatus(result?.code, message))
})
