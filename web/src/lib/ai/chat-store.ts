// Per-user chat persistence backed by Supabase Postgres. Each row is one
// conversation (messages stored as jsonb). Row Level Security ties rows to the
// signed-in user, so the browser client only ever sees its own chats.
//
// All functions degrade gracefully: if Supabase is not configured, the table
// does not exist yet, or the user is signed out, they no-op / return [] and the
// app keeps working in memory. Incognito conversations are never written.
import { supabase } from '../auth/supabase'
import type { ChatMessage, Conversation } from './types'

type StoredMessage = Omit<ChatMessage, 'timestamp'> & { timestamp?: string }

function reviveMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return []
  return (raw as StoredMessage[]).map((m) => ({
    ...m,
    timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
    isStreaming: false,
  }))
}

// Load only id + title for the sidebar (newest first). Messages are fetched
// lazily per conversation when the user opens it, so a large history does not
// bloat the initial load or Supabase egress.
export async function loadConversationSummaries(): Promise<Conversation[]> {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('id, title')
      .order('updated_at', { ascending: false })
    if (error || !data) return []
    return data.map((r) => ({
      id: r.id as string,
      title: (r.title as string) || 'New chat',
      messages: [],
      loaded: false,
    }))
  } catch {
    return []
  }
}

// Fetch the messages for a single conversation (on open).
export async function loadConversationMessages(
  id: string,
): Promise<ChatMessage[]> {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('messages')
      .eq('id', id)
      .maybeSingle()
    if (error || !data) return []
    return reviveMessages((data as { messages: unknown }).messages)
  } catch {
    return []
  }
}

// Insert or update one conversation. Incognito chats are skipped.
export async function saveConversation(
  userId: string,
  conv: Conversation,
): Promise<void> {
  if (!supabase || conv.incognito) return
  try {
    await supabase.from('conversations').upsert({
      id: conv.id,
      user_id: userId,
      title: conv.title,
      messages: conv.messages,
      updated_at: new Date().toISOString(),
    })
  } catch {
    // Persistence is best-effort; never block the UI on a failed write.
  }
}

export async function deleteConversation(id: string): Promise<void> {
  if (!supabase) return
  try {
    await supabase.from('conversations').delete().eq('id', id)
  } catch {
    // ignore
  }
}
