import type { AIModelOption } from './types'

// Models offered in the chat model picker. The `id` is sent to /api/ai/chat
// and must match a model actually pulled on the Ollama server. To add another
// model: `ollama pull <name>` on the server, then add an entry here.
export const AI_MODELS: AIModelOption[] = [
  {
    id: 'qwen2.5:7b',
    label: 'Qwen 2.5',
    detail: '7B · on-prem (Ollama)',
  },
]

export const DEFAULT_MODEL_ID = AI_MODELS[0].id

export function getModel(id: string): AIModelOption {
  return AI_MODELS.find((m) => m.id === id) ?? AI_MODELS[0]
}
