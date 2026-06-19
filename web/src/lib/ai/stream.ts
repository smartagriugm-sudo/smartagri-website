import type { AIStreamChunk } from './types'

/**
 * Consume SSE stream dari Ollama/OpenAI-compatible API.
 * Panggil onChunk setiap ada token baru, onDone saat selesai, onError jika gagal.
 */
export async function consumeStream(
  response: Response,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: Error) => void
): Promise<void> {
  if (!response.ok) {
    onError(new Error(`HTTP ${response.status}: ${response.statusText}`))
    return
  }

  if (!response.body) {
    onError(new Error('Response body is null'))
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')

      // Simpan baris terakhir yang mungkin belum lengkap di buffer
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue

        const data = trimmed.slice(6)
        if (data === '[DONE]') {
          onDone()
          return
        }

        try {
          const parsed: AIStreamChunk = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) onChunk(content)
        } catch {
          // Skip malformed chunk, lanjut
        }
      }
    }
    onDone()
  } catch (error) {
    onError(error instanceof Error ? error : new Error('Stream error'))
  } finally {
    reader.releaseLock()
  }
}

/**
 * Generate unique ID untuk message
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}
