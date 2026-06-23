import { defineEventHandler, getRequestHeader, readBody } from 'h3'
import { CHAT_SYSTEM_PROMPT } from '../../../src/lib/ai/prompts'
import { jsonResponse, streamChatCompletion } from '../../../src/lib/ai/ollama'
import { isAuthorized } from '../../../src/lib/ai/auth-guard'
import { embedText } from '../../../src/lib/ai/embed'
import { retrieveChunks } from '../../../src/lib/ai/retrieve'

// POST /api/ai/chat — proxy for the chat assistant. The browser only ever
// talks to this route, never to Ollama directly.
export default defineEventHandler(async (event) => {
  if (!(await isAuthorized(getRequestHeader(event, 'authorization')))) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const body = (await readBody(event).catch(() => null)) as {
    messages?: unknown
    model?: unknown
    name?: unknown
    about?: unknown
    instructions?: unknown
    language?: unknown
    style?: unknown
    think?: unknown
  } | null

  const messages = body?.messages
  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonResponse({ error: 'messages array is required' }, 400)
  }

  // Optional model override (the client model picker). Falls back to AI_MODEL.
  const model = typeof body?.model === 'string' ? body.model : undefined

  // Optional per-user personalization (from the profile page) appended to the
  // prompt. Each field is trimmed and length-capped to bound prompt size.
  const str = (v: unknown, max: number) =>
    typeof v === 'string' ? v.trim().slice(0, max) : ''
  const name = str(body?.name, 80)
  const about = str(body?.about, 1500)
  const instructions = str(body?.instructions, 1500)
  const language = typeof body?.language === 'string' ? body.language : 'auto'
  const style = typeof body?.style === 'string' ? body.style : 'balanced'

  const prefs: string[] = []
  if (name) prefs.push(`The user prefers to be called "${name}".`)
  if (about) prefs.push(`About the user: ${about}`)
  if (instructions) prefs.push(`User instructions to follow: ${instructions}`)
  if (language && language !== 'auto') prefs.push(`Always respond in ${language}.`)
  if (style === 'concise') prefs.push('Keep responses brief and to the point.')
  else if (style === 'detailed')
    prefs.push('Give thorough, detailed responses with relevant context.')
  // Reasoning models (Qwen3) think by default; `/no_think` disables it.
  if (body?.think === false) prefs.push('/no_think')
  let system =
    prefs.length > 0
      ? `${CHAT_SYSTEM_PROMPT}\n\n${prefs.join('\n')}`
      : CHAT_SYSTEM_PROMPT

  // RAG: retrieve SmartAgri knowledge-base excerpts relevant to the latest user
  // message and add them as grounding context. Fully best-effort — if embeddings
  // or the vector store are unavailable, the chat continues without RAG.
  const lastUser = [...(messages as Array<{ role?: string; content?: unknown }>)]
    .reverse()
    .find((m) => m?.role === 'user')
  const query = typeof lastUser?.content === 'string' ? lastUser.content : ''
  if (query) {
    const embedding = await embedText(query)
    if (embedding) {
      const chunks = await retrieveChunks(embedding, 5)
      if (chunks.length > 0) {
        const sources = chunks
          .map((c, i) => `[${i + 1}] ${c.title ?? 'Source'}\n${c.content}`)
          .join('\n\n')
        system +=
          '\n\nUse the following SmartAgri knowledge-base excerpts when they are' +
          ' relevant, and cite the source titles. If they are not relevant,' +
          ` answer from your own knowledge.\n\n${sources}`
      }
    }
  }

  // Inject the SmartAgri system prompt at the start of the conversation.
  return streamChatCompletion(
    [{ role: 'system', content: system }, ...messages],
    model,
  )
})
