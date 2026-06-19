import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Send, Square, Trash2 } from 'lucide-react'
import type { ChatMessage } from '../../lib/ai/types'
import { consumeStream, generateMessageId } from '../../lib/ai/stream'
import { getAccessToken } from '../../lib/auth/supabase'
import { body, display } from '../../lib/fonts'
import ChatBubble from './ChatBubble'
import TypingIndicator from './TypingIndicator'

interface ChatInterfaceProps {
  welcomeMessage?: string
}

const ERROR_TEXT =
  'Sorry, something went wrong while contacting the AI. Make sure the Ollama server is running, then try again.'

export default function ChatInterface({ welcomeMessage }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    welcomeMessage
      ? [
          {
            id: 'welcome',
            role: 'assistant',
            content: welcomeMessage,
            timestamp: new Date(),
          },
        ]
      : [],
  )
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Auto-scroll to the newest message / typing indicator.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, isLoading])

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 2000)
  }

  const adjustHeight = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  const handleSend = async () => {
    const text = inputValue.trim()
    if (!text || isLoading) return

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    }

    // Conversation history sent to the API (system prompt is injected server-side).
    const history = [...messages, userMessage]
      .filter((m) => m.role !== 'system' && !m.isError)
      .map((m) => ({ role: m.role, content: m.content }))

    const aiId = generateMessageId()
    const aiMessage: ChatMessage = {
      id: aiId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }

    setMessages((prev) => [...prev, userMessage, aiMessage])
    setInputValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setIsLoading(true)

    const ac = new AbortController()
    abortRef.current = ac

    const finish = () => {
      setIsLoading(false)
      abortRef.current = null
    }

    const fail = (aborted: boolean) => {
      setMessages((prev) =>
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
        body: JSON.stringify({ messages: history }),
        signal: ac.signal,
      })

      await consumeStream(
        response,
        (chunk) =>
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId ? { ...m, content: m.content + chunk } : m,
            ),
          ),
        () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId ? { ...m, isStreaming: false } : m,
            ),
          )
          finish()
        },
        (error) => fail(ac.signal.aborted || error.name === 'AbortError'),
      )
    } catch (err) {
      fail(ac.signal.aborted || (err instanceof Error && err.name === 'AbortError'))
    }
  }

  const handleStop = () => abortRef.current?.abort()
  const handleClear = () => setMessages([])

  const streaming = messages.find((m) => m.isStreaming)
  const showTyping = isLoading && (!streaming || streaming.content.length === 0)
  const showGenerating = isLoading && !!streaming && streaming.content.length > 0

  return (
    <div className="flex h-[calc(100vh-76px)] flex-col bg-white">
      {/* Header */}
      <div className="shrink-0 border-b border-[#0B6477]/10 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div>
            <h1
              className="text-lg font-semibold tracking-[-0.02em] text-neutral-900 md:text-xl"
              style={display}
            >
              AI Research Assistant
            </h1>
            <p className="text-xs text-neutral-500 md:text-sm" style={body}>
              SmartAgri UGM
            </p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-2 rounded-xl border border-[#0B6477]/20 px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:border-[#0B6477] hover:text-[#0B6477]"
            style={body}
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[#FBFCFC]">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 md:px-6">
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <ChatBubble
                key={m.id}
                message={m}
                copied={copiedId === m.id}
                onCopy={(textValue) => handleCopy(m.id, textValue)}
              />
            ))}
          </AnimatePresence>
          {showTyping && <TypingIndicator />}
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-[#0B6477]/10 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-4 md:px-6">
          <div className="flex items-end gap-2 rounded-2xl border border-[#0B6477]/20 bg-white px-3 py-2 transition-colors focus-within:border-[#0B6477]">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onInput={adjustHeight}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void handleSend()
                }
              }}
              placeholder="Ask anything about precision agriculture research, academic writing, or data analysis..."
              className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-relaxed text-neutral-800 outline-none placeholder:text-neutral-400"
              style={body}
            />
            {isLoading ? (
              <button
                type="button"
                onClick={handleStop}
                aria-label="Stop"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0B6477] text-white transition-colors hover:bg-[#14919B]"
              >
                <Square className="h-4 w-4" fill="currentColor" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!inputValue.trim()}
                aria-label="Send"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#45DFB1] text-[#0B2A22] transition-colors hover:bg-[#80ED99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="mt-1.5 px-1">
            <span className="text-[11px] text-neutral-400" style={body}>
              {showGenerating
                ? 'Generating...'
                : 'Press Enter to send, Shift+Enter for a new line'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
