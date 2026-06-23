// Server-only: get an embedding from the on-prem Ollama (bge-m3) via the same
// secured AI endpoint as chat. Returns null on any failure (RAG then degrades
// to a normal chat). Never import from client code.
const baseURL = process.env.AI_API_BASE_URL || 'http://localhost:11434/v1'
const apiKey = process.env.AI_API_KEY || 'ollama'
const embedModel = process.env.AI_EMBED_MODEL || 'bge-m3'

export async function embedText(text: string): Promise<number[] | null> {
  const input = text.trim().slice(0, 8000)
  if (!input) return null
  try {
    const res = await fetch(`${baseURL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: embedModel, input }),
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return null
    const json = (await res.json()) as {
      data?: Array<{ embedding?: number[] }>
    }
    const emb = json?.data?.[0]?.embedding
    return Array.isArray(emb) ? emb : null
  } catch {
    return null
  }
}
