import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  Brain,
  Loader2,
  Menu,
  MoreVertical,
  PanelLeft,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  Square,
  Trash2,
  VenetianMask,
  X,
} from 'lucide-react'
import type { ChatMessage, Conversation } from '../../lib/ai/types'
import { consumeStream, generateMessageId } from '../../lib/ai/stream'
import { getAccessToken } from '../../lib/auth/supabase'
import { useAuth } from '../../lib/auth/auth'
import {
  deleteConversation,
  loadConversationMessages,
  loadConversationSummaries,
  saveConversation,
} from '../../lib/ai/chat-store'
import { getProfile } from '../../lib/profile'
import { DEFAULT_MODEL_ID, getModel } from '../../lib/ai/models'
import { EXTRACT_ACCEPT, extractText } from '../../lib/ai/extract-text'
import { accent, body, display } from '../../lib/fonts'
import ChatBubble from './ChatBubble'
import ChatSidebar from './ChatSidebar'
import ModelMenu from './ModelMenu'
import TypingIndicator from './TypingIndicator'

interface PendingAttachment {
  name: string
  content: string
}

const ERROR_TEXT =
  'Sorry, something went wrong while contacting the AI. Make sure the Ollama server is running, then try again.'

// Files we extract text from client-side and feed to the model as context.
const MAX_FILE_BYTES = 15_000_000
const MAX_FILE_CHARS = 20_000

// Warm, comforting subtitles shown under the greeting (one picked per session).
const WARM_LINES = [
  'How can I help with your research today?',
  'What would you like to explore?',
  "Ready when you are, let's dig in.",
  'What are we working on today?',
]

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function newConversation(incognito = false): Conversation {
  return {
    id: generateMessageId(),
    title: 'New chat',
    messages: [],
    incognito,
    loaded: true,
  }
}

function buildAttachmentText(atts: { name: string; content: string }[]): string {
  return atts
    .map((a) => `Attached file "${a.name}":\n${a.content}`)
    .join('\n\n')
}

// Combine the typed text and any attachment text into what the model receives.
function toApiContent(m: ChatMessage): string {
  return [m.content, m.attachmentText].filter(Boolean).join('\n\n')
}

function toHistory(msgs: ChatMessage[]): { role: string; content: string }[] {
  return msgs
    .filter((m) => m.role !== 'system' && !m.isError)
    .map((m) => ({ role: m.role, content: toApiContent(m) }))
}

export default function ChatInterface() {
  const [conversations, setConversations] = useState<Conversation[]>(() => [
    newConversation(),
  ])
  const [activeId, setActiveId] = useState<string>(() => conversations[0].id)
  const [modelId, setModelId] = useState<string>(DEFAULT_MODEL_ID)
  const [inputValue, setInputValue] = useState('')
  const [attachments, setAttachments] = useState<PendingAttachment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false) // mobile drawer
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false) // desktop
  const [menuOpen, setMenuOpen] = useState(false)
  const [loadingConvId, setLoadingConvId] = useState<string | null>(null)
  const [greeting, setGreeting] = useState('Hello')
  const [warmLine, setWarmLine] = useState(WARM_LINES[0])
  const [thinking, setThinking] = useState(true)
  const [attaching, setAttaching] = useState(false)

  const reasoningModel = getModel(modelId).reasoning ?? false
  // Saved AI preferences (from the profile page), sent with each request.
  const [prefs, setPrefs] = useState<{
    name: string
    about: string
    instructions: string
    language: string
    style: string
  }>({
    name: '',
    about: '',
    instructions: '',
    language: 'auto',
    style: 'balanced',
  })

  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Persistence (Supabase) is active only for a signed-in, configured user.
  const { user, loading: authLoading, isConfigured } = useAuth()
  const persistEnabled = isConfigured && !!user
  const userId = user?.id ?? ''

  const conversationsRef = useRef(conversations)
  const hydratedRef = useRef(false)
  const wasLoadingRef = useRef(false)
  const streamConvRef = useRef<string | null>(null)

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0]
  const messages = active?.messages ?? []
  const isEmpty = messages.length === 0
  const isIncognito = !!active?.incognito
  const lastMessage = messages[messages.length - 1]
  const firstName = (prefs.name || '').trim().split(/\s+/)[0]

  // Keep a ref of the latest conversations so async callbacks/effects can read
  // current data. Declared before the persist effect so it syncs first.
  useEffect(() => {
    conversationsRef.current = conversations
  }, [conversations])

  // Hydrate from Supabase once auth is resolved. Loaded chats fill the sidebar;
  // the user lands on a fresh empty chat (Gemini-style).
  useEffect(() => {
    if (hydratedRef.current || authLoading) return
    hydratedRef.current = true
    if (!persistEnabled) return
    void loadConversationSummaries().then((summaries) => {
      if (summaries.length === 0) return
      const fresh = newConversation()
      setConversations([fresh, ...summaries])
      setActiveId(fresh.id)
    })
    void getProfile().then((p) => {
      if (!p) return
      if (p.ai_model) setModelId(p.ai_model)
      setPrefs({
        name: p.preferred_name || p.full_name || '',
        about: p.about_me || '',
        instructions: p.instructions || '',
        language: p.ai_language || 'auto',
        style: p.ai_style || 'balanced',
      })
    })
  }, [authLoading, persistEnabled])

  // Persist the conversation that just finished streaming.
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading) {
      const convId = streamConvRef.current
      const conv = conversationsRef.current.find((c) => c.id === convId)
      const last = conv?.messages[conv.messages.length - 1]
      if (persistEnabled && conv && !conv.incognito && conv.messages.length > 0 && !last?.isError) {
        void saveConversation(userId, conv)
      }
    }
    wasLoadingRef.current = isLoading
  }, [isLoading, persistEnabled, userId])

  // Auto-scroll to the newest message / typing indicator.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, isLoading])

  // Time-based greeting + a warm subtitle, computed client-side to avoid SSR
  // hydration mismatch.
  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()))
    setWarmLine(WARM_LINES[Math.floor(Math.random() * WARM_LINES.length)])
  }, [])

  // Close the options menu on outside click.
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  const setConvMessages = (
    convId: string,
    updater: (prev: ChatMessage[]) => ChatMessage[],
  ) =>
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId ? { ...c, messages: updater(c.messages) } : c,
      ),
    )

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 2000)
  }

  const adjustHeight = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  // Discard any ephemeral incognito chats, keeping `keepId` if given.
  const dropIncognito = (list: Conversation[], keepId?: string) =>
    list.filter((c) => !c.incognito || c.id === keepId)

  // Drop incognito chats and any leftover empty (unused) chats before opening a
  // fresh one, so the sidebar never accumulates blank "New chat" entries.
  // Saved summaries (loaded === false) are kept even though messages is empty.
  const prune = (list: Conversation[]) =>
    list.filter(
      (c) => !c.incognito && (c.messages.length > 0 || c.loaded === false),
    )

  const handleNewChat = () => {
    const conv = newConversation()
    setConversations((prev) => [conv, ...prune(prev)])
    setActiveId(conv.id)
    setInputValue('')
    setAttachments([])
    setSidebarOpen(false)
  }

  const handleNewIncognito = () => {
    const conv = newConversation(true)
    setConversations((prev) => [conv, ...prune(prev)])
    setActiveId(conv.id)
    setInputValue('')
    setAttachments([])
    setSidebarOpen(false)
  }

  const handleSelect = async (id: string) => {
    setConversations((prev) => dropIncognito(prev, id))
    setActiveId(id)
    setSidebarOpen(false)
    // Lazily fetch messages the first time a saved conversation is opened.
    const conv = conversationsRef.current.find((c) => c.id === id)
    if (conv && conv.loaded === false) {
      setLoadingConvId(id)
      const msgs = await loadConversationMessages(id)
      setConversations((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, messages: msgs, loaded: true } : c,
        ),
      )
      setLoadingConvId((cur) => (cur === id ? null : cur))
    }
  }

  const handleDelete = (id: string) => {
    const target = conversations.find((c) => c.id === id)
    if (persistEnabled && target && !target.incognito) void deleteConversation(id)
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id)
      if (next.length === 0) {
        const conv = newConversation()
        setActiveId(conv.id)
        return [conv]
      }
      if (id === activeId) setActiveId(next[0].id)
      return next
    })
  }

  const handleClear = () => {
    const conv = conversations.find((c) => c.id === activeId)
    if (persistEnabled && conv && !conv.incognito) void deleteConversation(activeId)
    setConvMessages(activeId, () => [])
    setMenuOpen(false)
  }

  const onFiles = async (fileList: FileList | null) => {
    if (!fileList) return
    setAttaching(true)
    const next: PendingAttachment[] = []
    for (const file of Array.from(fileList)) {
      if (file.size > MAX_FILE_BYTES) continue
      try {
        const text = await extractText(file)
        if (text.trim()) {
          next.push({ name: file.name, content: text.slice(0, MAX_FILE_CHARS) })
        }
      } catch {
        // Skip unreadable file.
      }
    }
    if (next.length) setAttachments((prev) => [...prev, ...next])
    setAttaching(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeAttachment = (name: string) =>
    setAttachments((prev) => prev.filter((a) => a.name !== name))

  // Shared streaming core: streams a model reply into an existing (empty,
  // isStreaming) assistant message identified by aiId.
  const runStream = async (
    convId: string,
    aiId: string,
    history: { role: string; content: string }[],
  ) => {
    streamConvRef.current = convId
    setIsLoading(true)
    const ac = new AbortController()
    abortRef.current = ac

    const finish = () => {
      setIsLoading(false)
      abortRef.current = null
    }

    const fail = (aborted: boolean) => {
      setConvMessages(convId, (prev) =>
        prev.map((m) =>
          m.id === aiId
            ? aborted
              ? { ...m, isStreaming: false }
              : { ...m, isStreaming: false, isError: true, content: ERROR_TEXT }
            : m,
        ),
      )
      finish()
    }

    try {
      const token = await getAccessToken()
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: history,
          model: modelId,
          name: prefs.name,
          about: prefs.about,
          instructions: prefs.instructions,
          language: prefs.language,
          style: prefs.style,
          ...(reasoningModel ? { think: thinking } : {}),
        }),
        signal: ac.signal,
      })

      await consumeStream(
        response,
        (chunk) =>
          setConvMessages(convId, (prev) =>
            prev.map((m) =>
              m.id === aiId ? { ...m, content: m.content + chunk } : m,
            ),
          ),
        () => {
          setConvMessages(convId, (prev) =>
            prev.map((m) => (m.id === aiId ? { ...m, isStreaming: false } : m)),
          )
          finish()
        },
        (error) => fail(ac.signal.aborted || error.name === 'AbortError'),
      )
    } catch (err) {
      fail(ac.signal.aborted || (err instanceof Error && err.name === 'AbortError'))
    }
  }

  const send = async (rawText: string, atts: PendingAttachment[]) => {
    const text = rawText.trim()
    if ((!text && atts.length === 0) || isLoading) return

    const convId = activeId
    const attachmentText = atts.length ? buildAttachmentText(atts) : undefined

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      ...(atts.length ? { attachments: atts.map((a) => ({ name: a.name })) } : {}),
      ...(attachmentText ? { attachmentText } : {}),
    }

    const aiId = generateMessageId()
    const aiMessage: ChatMessage = {
      id: aiId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }

    const history = toHistory([...messages, userMessage])

    // Append the new messages and title the conversation from its first prompt.
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c
        const title =
          c.title === 'New chat'
            ? (text || atts[0]?.name || 'New chat').slice(0, 48)
            : c.title
        return { ...c, title, messages: [...c.messages, userMessage, aiMessage] }
      }),
    )
    setInputValue('')
    setAttachments([])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    await runStream(convId, aiId, history)
  }

  // Re-run the model for the last assistant turn (drops its old content).
  const regenerate = async (aiId: string) => {
    if (isLoading) return
    const convId = activeId
    const msgs = active?.messages ?? []
    const idx = msgs.findIndex((m) => m.id === aiId)
    if (idx < 0) return
    const history = toHistory(msgs.slice(0, idx))
    if (history.length === 0) return
    setConvMessages(convId, (prev) =>
      prev.map((m) =>
        m.id === aiId
          ? { ...m, content: '', isError: false, isStreaming: true }
          : m,
      ),
    )
    await runStream(convId, aiId, history)
  }

  // Re-run from a user message: optionally edit its text, drop everything after
  // it, then stream a fresh reply. Used by the user-bubble retry/edit actions.
  const resubmitUser = async (id: string, newText?: string) => {
    if (isLoading) return
    const convId = activeId
    const msgs = active?.messages ?? []
    const idx = msgs.findIndex((m) => m.id === id)
    if (idx < 0 || msgs[idx].role !== 'user') return

    const edited: ChatMessage =
      newText !== undefined && newText !== msgs[idx].content
        ? { ...msgs[idx], content: newText }
        : msgs[idx]
    const kept = msgs.slice(0, idx)
    const history = toHistory([...kept, edited])
    if (history.length === 0) return

    const aiId = generateMessageId()
    const aiMessage: ChatMessage = {
      id: aiId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId ? { ...c, messages: [...kept, edited, aiMessage] } : c,
      ),
    )
    await runStream(convId, aiId, history)
  }

  const handleSend = () => void send(inputValue, attachments)
  const handleStop = () => abortRef.current?.abort()

  const streaming = messages.find((m) => m.isStreaming)
  const showTyping = isLoading && (!streaming || streaming.content.length === 0)
  const canSend = !!inputValue.trim() || attachments.length > 0

  // The composer is rendered centered in the empty state and docked at the
  // bottom once a conversation is underway (Gemini-style).
  const composer = (
    <div className="mx-auto w-full max-w-3xl">
      <div className="rounded-[26px] border border-[#0B6477]/20 bg-white px-3 pb-2 pt-3 shadow-sm transition-colors focus-within:border-[#0B6477]">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2 px-1">
            {attachments.map((a) => (
              <span
                key={a.name}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#0B6477]/15 bg-[#F3F7F6] px-2.5 py-1 text-xs text-neutral-600"
                style={body}
              >
                <Paperclip className="h-3 w-3 text-[#14919B]" />
                <span className="max-w-[160px] truncate">{a.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(a.name)}
                  aria-label={`Remove ${a.name}`}
                  className="text-neutral-400 hover:text-[#B91C1C]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          rows={1}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onInput={adjustHeight}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder={
            isIncognito ? 'Ask anything (incognito, not saved)…' : 'Ask anything…'
          }
          className="block max-h-52 w-full resize-none bg-transparent px-1.5 py-1 text-[15px] leading-relaxed text-neutral-800 outline-none placeholder:text-neutral-400"
          style={body}
        />

        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={EXTRACT_ACCEPT}
              onChange={(e) => void onFiles(e.target.files)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={attaching}
              aria-label="Attach a document (PDF, DOCX, XLSX, or text)"
              title="Attach PDF, DOCX, XLSX, or text"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#0B6477]/20 text-neutral-500 transition-colors hover:border-[#0B6477] hover:text-[#0B6477] disabled:opacity-60"
            >
              {attaching ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
            </button>
            {reasoningModel && (
              <button
                type="button"
                onClick={() => setThinking((t) => !t)}
                aria-pressed={thinking}
                title="Let the model reason step by step before answering"
                className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors ${
                  thinking
                    ? 'border-[#0B6477]/30 bg-[#0B6477]/10 text-[#0B6477]'
                    : 'border-[#0B6477]/20 text-neutral-500 hover:border-[#0B6477] hover:text-[#0B6477]'
                }`}
                style={body}
              >
                <Brain className="h-4 w-4" />
                Thinking
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ModelMenu modelId={modelId} onChange={setModelId} />
            {isLoading ? (
              <button
                type="button"
                onClick={handleStop}
                aria-label="Stop"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0B6477] text-white transition-colors hover:bg-[#14919B]"
              >
                <Square className="h-4 w-4" fill="currentColor" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                aria-label="Send"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#45DFB1] text-[#0B2A22] transition-colors hover:bg-[#80ED99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-76px)] bg-white">
      {/* Desktop sidebar (collapsible) */}
      {!sidebarCollapsed && (
        <div className="hidden md:flex">
          <ChatSidebar
            conversations={conversations}
            activeId={activeId}
            onNew={handleNewChat}
            onNewIncognito={handleNewIncognito}
            onSelect={handleSelect}
            onDelete={handleDelete}
            onClose={() => setSidebarCollapsed(true)}
          />
        </div>
      )}

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 h-full">
            <ChatSidebar
              conversations={conversations}
              activeId={activeId}
              onNew={handleNewChat}
              onNewIncognito={handleNewIncognito}
              onSelect={handleSelect}
              onDelete={handleDelete}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main panel */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Slim top bar */}
        <div className="flex shrink-0 items-center justify-between gap-3 px-3 py-2 md:px-4">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open conversations"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-500 hover:bg-[#F3F7F6] hover:text-[#0B6477] md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            {sidebarCollapsed && (
              <button
                type="button"
                onClick={() => setSidebarCollapsed(false)}
                aria-label="Expand sidebar"
                className="hidden h-9 w-9 items-center justify-center rounded-xl text-neutral-500 hover:bg-[#F3F7F6] hover:text-[#0B6477] md:flex"
              >
                <PanelLeft className="h-5 w-5" />
              </button>
            )}
            {isIncognito && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-[#0B2A22] px-2.5 py-1 text-xs font-medium text-[#80ED99]"
                style={body}
              >
                <VenetianMask className="h-3.5 w-3.5" />
                Incognito
              </span>
            )}
          </div>

          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Conversation options"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-500 hover:bg-[#F3F7F6] hover:text-[#0B6477]"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 min-w-[190px] rounded-2xl border border-[#0B6477]/10 bg-white p-1.5 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    handleNewChat()
                    setMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-neutral-700 hover:bg-[#F3F7F6]"
                  style={body}
                >
                  <Plus className="h-4 w-4 text-neutral-400" />
                  New chat
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleNewIncognito()
                    setMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-neutral-700 hover:bg-[#F3F7F6]"
                  style={body}
                >
                  <VenetianMask className="h-4 w-4 text-neutral-400" />
                  Incognito chat
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isEmpty}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-neutral-700 hover:bg-[#F3F7F6] disabled:cursor-not-allowed disabled:opacity-40"
                  style={body}
                >
                  <Trash2 className="h-4 w-4 text-neutral-400" />
                  Clear conversation
                </button>
              </div>
            )}
          </div>
        </div>

        {loadingConvId === activeId ? (
          /* Fetching a saved conversation's messages */
          <div className="flex flex-1 items-center justify-center bg-white">
            <Loader2 className="h-6 w-6 animate-spin text-[#0B6477]" />
          </div>
        ) : isEmpty ? (
          /* Empty state: greeting + centered composer + suggestions */
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-4 py-10">
              <div className="mb-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0B6477]">
                  {isIncognito ? (
                    <VenetianMask className="h-7 w-7 text-[#45DFB1]" />
                  ) : (
                    <Sparkles className="h-7 w-7 text-[#45DFB1]" />
                  )}
                </div>
                <h2
                  className="mt-5 text-2xl font-semibold tracking-[-0.025em] text-neutral-900 md:text-3xl"
                  style={display}
                >
                  {isIncognito ? (
                    <>
                      <span style={accent}>Incognito</span> chat
                    </>
                  ) : (
                    <>
                      {greeting}
                      {firstName && (
                        <>
                          , <span style={accent}>{firstName}</span>
                        </>
                      )}
                    </>
                  )}
                </h2>
                <p
                  className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-neutral-500"
                  style={body}
                >
                  {isIncognito
                    ? "This chat won't appear in your history or be saved."
                    : warmLine}
                </p>
              </div>

              {composer}
            </div>
          </div>
        ) : (
          /* Active conversation: messages + docked composer */
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto bg-white">
              <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-6">
                <AnimatePresence initial={false}>
                  {messages.map((m) => (
                    <ChatBubble
                      key={m.id}
                      message={m}
                      copied={copiedId === m.id}
                      onCopy={(textValue) => handleCopy(m.id, textValue)}
                      onRegenerate={regenerate}
                      showRegenerate={
                        !isLoading &&
                        m.id === lastMessage?.id &&
                        m.role === 'assistant'
                      }
                      onEdit={(id, text) => void resubmitUser(id, text)}
                      onRetry={(id) => void resubmitUser(id)}
                      busy={isLoading}
                    />
                  ))}
                </AnimatePresence>
                {showTyping && <TypingIndicator />}
              </div>
            </div>
            <div className="shrink-0 bg-white px-4 pb-3 pt-1 md:px-6">{composer}</div>
          </>
        )}
      </div>
    </div>
  )
}
