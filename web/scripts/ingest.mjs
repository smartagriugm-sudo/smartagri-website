// Index the site's existing content (publications + field notes) into the
// Supabase RAG knowledge base. Embeddings come from the on-prem Ollama (bge-m3).
//
// Run from web/:  node scripts/ingest.mjs
// Reads Supabase + AI config from web/.env; override via real env vars.
// REQUIRED extra env: INGEST_EMAIL / INGEST_PASSWORD  (a signed-up RA account,
// used to satisfy the row-level-security insert policy — no service_role).
// Point OLLAMA_URL at a server that has bge-m3 (e.g. the tunnel) if localhost
// does not.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv(file) {
  const env = {}
  if (!existsSync(file)) return env
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (line.trim().startsWith('#')) continue
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m) env[m[1]] = m[2]
  }
  return env
}
const fileEnv = loadEnv(join(root, '.env'))
const env = (k, d) => process.env[k] ?? fileEnv[k] ?? d

const SUPABASE_URL = env('VITE_SUPABASE_URL') || env('SUPABASE_URL')
const ANON = env('VITE_SUPABASE_ANON_KEY') || env('SUPABASE_ANON_KEY')
const OLLAMA_URL =
  env('OLLAMA_URL') || env('AI_API_BASE_URL') || 'http://localhost:11434/v1'
const AI_KEY = env('AI_API_KEY', 'ollama')
const EMBED_MODEL = env('AI_EMBED_MODEL', 'bge-m3')
const EMAIL = env('INGEST_EMAIL')
const PASSWORD = env('INGEST_PASSWORD')

if (!SUPABASE_URL || !ANON) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}
if (!EMAIL || !PASSWORD) {
  console.error('Set INGEST_EMAIL and INGEST_PASSWORD (a signed-up RA account).')
  process.exit(1)
}

async function signIn() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  if (!res.ok) {
    console.error('Sign-in failed:', res.status, await res.text())
    process.exit(1)
  }
  return (await res.json()).access_token
}

async function embed(text) {
  const res = await fetch(`${OLLAMA_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_KEY}`,
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 8000) }),
  })
  if (!res.ok) throw new Error(`Embed ${res.status}: ${await res.text()}`)
  return (await res.json()).data[0].embedding
}

function chunk(text, size = 1200, overlap = 150) {
  const clean = text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim()
  const out = []
  for (let i = 0; i < clean.length; i += size - overlap) {
    out.push(clean.slice(i, i + size))
    if (i + size >= clean.length) break
  }
  return out.filter((c) => c.trim().length > 30)
}

function readJsonDir(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({
      slug: f.replace(/\.json$/, ''),
      data: JSON.parse(readFileSync(join(dir, f), 'utf8')),
    }))
}

function buildDocs() {
  const docs = []
  for (const { slug, data } of readJsonDir(join(root, 'src/content/notes'))) {
    if (data.hidden) continue
    const text = [data.title, data.excerpt, data.body].filter(Boolean).join('\n\n')
    docs.push({ ref: slug, title: data.title || slug, url: `/field-notes/${slug}`, text })
  }
  for (const { slug, data } of readJsonDir(join(root, 'src/content/publications'))) {
    const meta = [
      data.title,
      data.authors,
      [data.venue, data.year].filter(Boolean).join(' '),
    ]
      .filter(Boolean)
      .join('\n')
    const text = [meta, data.abstract].filter(Boolean).join('\n\n')
    docs.push({ ref: slug, title: data.title || slug, url: `/publications/${slug}`, text })
  }
  return docs
}

async function clearContent(token) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/doc_chunks?source=eq.content`, {
    method: 'DELETE',
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, Prefer: 'return=minimal' },
  })
  if (!res.ok) throw new Error(`Clear ${res.status}: ${await res.text()}`)
}

async function insert(token, rows) {
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
  if (!res.ok) throw new Error(`Insert ${res.status}: ${await res.text()}`)
}

const token = await signIn()
console.log('Signed in. Reading content…')
const docs = buildDocs()
console.log(`${docs.length} documents found. Re-indexing source='content'…`)
await clearContent(token)

let total = 0
for (const doc of docs) {
  const chunks = chunk(doc.text)
  const rows = []
  for (const c of chunks) {
    rows.push({
      source: 'content',
      ref: doc.ref,
      title: doc.title,
      url: doc.url,
      content: c,
      embedding: await embed(c),
    })
  }
  for (let i = 0; i < rows.length; i += 20) await insert(token, rows.slice(i, i + 20))
  if (rows.length) {
    total += rows.length
    console.log(`  ${doc.title}: ${rows.length} chunks`)
  }
}
console.log(`Done. Indexed ${total} chunks from ${docs.length} documents.`)
