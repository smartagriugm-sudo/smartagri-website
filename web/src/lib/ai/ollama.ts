// Server-only helper: reads AI_* env config and proxies a streaming
// OpenAI-compatible chat completion to the Ollama server. Never import this
// from client code (it uses process.env and talks to Ollama directly).
import type { AIConfig } from './types'

export function getAIConfig(): AIConfig {
  return {
    baseURL: process.env.AI_API_BASE_URL || 'http://localhost:11434/v1',
    model: process.env.AI_MODEL || 'qwen2.5:7b',
    apiKey: process.env.AI_API_KEY || 'ollama',
    timeoutMs: Number(process.env.AI_TIMEOUT_MS) || 120000,
  }
}

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
}

const SERVICE_UNAVAILABLE = {
  error: 'AI service unavailable. Pastikan Ollama server sudah aktif.',
}

export function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Forward an OpenAI-compatible streaming chat completion to Ollama and return
 * the SSE stream Response. Returns HTTP 503 if Ollama cannot be reached.
 */
export async function streamChatCompletion(
  messages: Array<{ role: string; content: string }>,
  model?: string,
): Promise<Response> {
  const cfg = getAIConfig()

  let upstream: Response
  try {
    upstream = await fetch(`${cfg.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({ model: model || cfg.model, messages, stream: true }),
      signal: AbortSignal.timeout(cfg.timeoutMs),
    })
  } catch {
    return jsonResponse(SERVICE_UNAVAILABLE, 503)
  }

  // Forward Ollama's response (the SSE stream on success, or its error) as-is.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: SSE_HEADERS,
  })
}
