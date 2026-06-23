import { defineEventHandler, getRequestHeader, readBody } from 'h3'
import { jsonResponse } from '../../../src/lib/ai/ollama'
import { isAuthorized } from '../../../src/lib/ai/auth-guard'
import { embedText } from '../../../src/lib/ai/embed'

// POST /api/ai/ingest — add a team document to the RAG knowledge base. The
// client extracts text and posts { title, text, ref, userId }; the server
// chunks + embeds (bge-m3) + stores the rows in Supabase using the caller's
// own JWT (RLS, no service_role).
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

function chunk(text: string, size = 1200, overlap = 150): string[] {
  const clean = text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim()
  const out: string[] = []
  for (let i = 0; i < clean.length; i += size - overlap) {
    out.push(clean.slice(i, i + size))
    if (i + size >= clean.length) break
  }
  return out.filter((c) => c.trim().length > 30)
}

export default defineEventHandler(async (event) => {
  const auth = getRequestHeader(event, 'authorization')
  if (!(await isAuthorized(auth))) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : ''

  const body = (await readBody(event).catch(() => null)) as {
    title?: unknown
    text?: unknown
    ref?: unknown
    userId?: unknown
  } | null

  const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 200) : ''
  const text = typeof body?.text === 'string' ? body.text : ''
  const ref = typeof body?.ref === 'string' ? body.ref : ''
  const userId = typeof body?.userId === 'string' ? body.userId : null

  if (!title || !text.trim()) {
    return jsonResponse({ error: 'title and text are required' }, 400)
  }
  if (!SUPABASE_URL || !ANON || !token) {
    return jsonResponse({ error: 'Not configured' }, 500)
  }

  const parts = chunk(text)
  const rows: Array<Record<string, unknown>> = []
  for (const c of parts) {
    const embedding = await embedText(c)
    if (embedding) {
      rows.push({ source: 'upload', ref, title, uploaded_by: userId, content: c, embedding })
    }
  }
  if (rows.length === 0) {
    return jsonResponse(
      { error: 'Could not embed the document (is the bge-m3 model reachable?)' },
      502,
    )
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/doc_chunks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON,
        Authorization: `Bearer ${token}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(rows),
    })
    if (!res.ok) {
      return jsonResponse({ error: `Save failed: ${res.status}` }, 500)
    }
  } catch {
    return jsonResponse({ error: 'Save failed' }, 500)
  }

  return jsonResponse({ ok: true, chunks: rows.length }, 200)
})
