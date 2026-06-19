export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  isStreaming?: boolean
  isError?: boolean
}

export interface GeneratorFormData {
  docType: DocumentType
  fields: Record<string, string>
}

export type DocumentType =
  | 'activity_report'
  | 'news_article'
  | 'research_proposal'
  | 'journal_abstract'
  | 'data_summary'
  | 'formal_letter'

export interface AIStreamChunk {
  choices: Array<{
    delta: { content?: string }
    finish_reason?: string | null
  }>
}

export interface AIConfig {
  baseURL: string
  model: string
  apiKey: string
  timeoutMs: number
}

export interface DocumentTypeConfig {
  label: string
  description: string
  fields: FormField[]
}

export interface FormField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select'
  placeholder?: string
  required: boolean
  options?: { value: string; label: string }[]
}
