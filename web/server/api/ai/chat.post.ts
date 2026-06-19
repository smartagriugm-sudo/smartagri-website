import { defineEventHandler, readBody } from 'h3'
import { CHAT_SYSTEM_PROMPT } from '../../../src/lib/ai/prompts'
import { jsonResponse, streamChatCompletion } from '../../../src/lib/ai/ollama'

// POST /api/ai/chat — proxy for the chat assistant. The browser only ever
// talks to this route, never to Ollama directly.
export default defineEventHandler(async (event) => {
  const body = (await readBody(event).catch(() => null)) as {
    messages?: unknown
  } | null

  const messages = body?.messages
  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonResponse({ error: 'messages array is required' }, 400)
  }

  // Inject the SmartAgri system prompt at the start of the conversation.
  return streamChatCompletion([
    { role: 'system', content: CHAT_SYSTEM_PROMPT },
    ...messages,
  ])
})
