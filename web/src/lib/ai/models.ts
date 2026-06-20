import type { AIModelOption } from './types'

// Models offered in the chat model picker (and the profile default-model
// select). The `id` is sent to /api/ai/chat and must match a model actually
// pulled on the Ollama server. To add another model: `ollama pull <name>` on
// the server, then add an entry here and redeploy.
//
// The first entry is the default for new chats (see DEFAULT_MODEL_ID).
export const AI_MODELS: AIModelOption[] = [
  {
    id: 'qwen2.5:14b',
    label: 'Qwen 2.5 14B',
    detail: 'Recommended · balanced',
  },
  {
    id: 'qwen2.5:32b',
    label: 'Qwen 2.5 32B',
    detail: 'Highest quality',
  },
  {
    id: 'qwen2.5:7b',
    label: 'Qwen 2.5 7B',
    detail: 'Fast · lightweight',
  },
  {
    id: 'llama3.1:8b',
    label: 'Llama 3.1 8B',
    detail: 'Fast · multilingual',
  },
  {
    id: 'gemma2:27b',
    label: 'Gemma 2 27B',
    detail: 'Strong reasoning & writing',
  },
]

export const DEFAULT_MODEL_ID = AI_MODELS[0].id

export function getModel(id: string): AIModelOption {
  return AI_MODELS.find((m) => m.id === id) ?? AI_MODELS[0]
}
