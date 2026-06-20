export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  isStreaming?: boolean
  isError?: boolean
  // Display-only chips for files attached to a user message.
  attachments?: { name: string }[]
  // Extracted text from those files, appended to the prompt sent to the model
  // (kept separate from `content` so the bubble shows only what the user typed).
  attachmentText?: string
}

// One in-session conversation. Conversations live in React state only (no
// backend, no localStorage), so they reset on a full page reload.
export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  // Incognito chats are never listed in the sidebar and (once persistence is
  // added) are never written to storage.
  incognito?: boolean
  // false = a saved conversation whose messages have not been fetched yet
  // (sidebar summary). Loaded/new conversations are true.
  loaded?: boolean
}

export interface AIModelOption {
  id: string
  label: string
  detail: string
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
