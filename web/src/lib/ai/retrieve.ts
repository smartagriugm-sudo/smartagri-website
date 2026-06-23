// Server-only: similarity search over doc_chunks via the Supabase match_chunks
// RPC (anon key; the function is SECURITY DEFINER). Returns [] on any failure,
// so the chat keeps working before the knowledge base is set up.
const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const anonKey =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

export interface RetrievedChunk {
  title: string | null
  url: string | null
  source: string
  content: string
  similarity: number
}

export async function retrieveChunks(
  embedding: number[],
  matchCount = 5,
): Promise<RetrievedChunk[]> {
  if (!url || !anonKey || !embedding.length) return []
  try {
    const res = await fetch(`${url}/rest/v1/rpc/match_chunks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        query_embedding: embedding,
        match_count: matchCount,
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const rows = (await res.json()) as RetrievedChunk[]
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}
