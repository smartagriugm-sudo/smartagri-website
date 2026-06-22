import { useState } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Check, Copy, Paperclip, Pencil, RotateCcw, Send } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatMessage } from '../../lib/ai/types'
import { body } from '../../lib/fonts'

interface ChatBubbleProps {
  message: ChatMessage
  onCopy: (text: string) => void
  copied?: boolean
  onRegenerate?: (id: string) => void
  showRegenerate?: boolean
  onEdit?: (id: string, text: string) => void
  onRetry?: (id: string) => void
  busy?: boolean
}

const PROSE =
  'prose prose-sm max-w-none text-neutral-800 ' +
  'prose-headings:font-semibold prose-headings:tracking-[-0.01em] prose-headings:text-neutral-900 ' +
  'prose-p:my-2 prose-p:leading-relaxed prose-strong:font-semibold prose-strong:text-neutral-900 ' +
  'prose-a:text-[#0B6477] prose-a:no-underline hover:prose-a:underline ' +
  'prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 marker:text-[#14919B] ' +
  'prose-code:rounded prose-code:bg-[#0B6477]/8 prose-code:px-1 prose-code:py-0.5 prose-code:text-[#0B6477] ' +
  'prose-code:before:content-none prose-code:after:content-none ' +
  'prose-pre:rounded-xl prose-pre:bg-[#0B2A22] prose-pre:text-white'

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-[#0B6477]/10 hover:text-[#0B6477] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-400"
    >
      {children}
    </button>
  )
}

export default function ChatBubble({
  message,
  onCopy,
  copied,
  onRegenerate,
  showRegenerate,
  onEdit,
  onRetry,
  busy,
}: ChatBubbleProps) {
  const isUser = message.role === 'user'
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.content)

  const time = (
    <span
      className="px-1 text-[11px] text-neutral-400"
      style={body}
      suppressHydrationWarning
    >
      {formatTime(message.timestamp)}
    </span>
  )

  // User: neutral bubble with a timestamp + retry/edit/copy row beneath it.
  if (isUser) {
    if (editing) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end"
        >
          <div className="w-full max-w-[90%] md:max-w-[80%]">
            <textarea
              value={draft}
              autoFocus
              rows={3}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full resize-y rounded-2xl border border-[#0B6477]/30 bg-white px-4 py-3 text-[15px] leading-relaxed text-neutral-800 outline-none focus:border-[#0B6477]"
              style={body}
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraft(message.content)
                  setEditing(false)
                }}
                className="rounded-xl px-3 py-1.5 text-sm text-neutral-500 transition-colors hover:bg-[#F3F7F6]"
                style={body}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!draft.trim() || busy}
                onClick={() => {
                  onEdit?.(message.id, draft.trim())
                  setEditing(false)
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#45DFB1] px-3.5 py-1.5 text-sm font-medium text-[#0B2A22] transition-colors hover:bg-[#80ED99] disabled:opacity-50"
                style={body}
              >
                <Send className="h-3.5 w-3.5" />
                Send
              </button>
            </div>
          </div>
        </motion.div>
      )
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex flex-col items-end"
      >
        <div className="max-w-[85%] rounded-3xl bg-[#EEF3F2] px-4 py-2.5 text-neutral-800 md:max-w-[75%]">
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {message.attachments.map((file) => (
                <span
                  key={file.name}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2 py-1 text-xs text-neutral-600"
                  style={body}
                >
                  <Paperclip className="h-3 w-3 text-[#14919B]" />
                  {file.name}
                </span>
              ))}
            </div>
          )}
          <div
            className="whitespace-pre-wrap text-[15px] leading-relaxed"
            style={body}
          >
            {message.content}
          </div>
        </div>
        <div className="mt-1 flex items-center gap-0.5">
          {time}
          {onRetry && (
            <IconButton label="Retry" onClick={() => onRetry(message.id)} disabled={busy}>
              <RotateCcw className="h-4 w-4" />
            </IconButton>
          )}
          {onEdit && (
            <IconButton
              label="Edit"
              onClick={() => {
                setDraft(message.content)
                setEditing(true)
              }}
              disabled={busy}
            >
              <Pencil className="h-4 w-4" />
            </IconButton>
          )}
          <IconButton label="Copy" onClick={() => onCopy(message.content)}>
            {copied ? (
              <Check className="h-4 w-4 text-[#0B6477]" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </IconButton>
        </div>
      </motion.div>
    )
  }

  // Assistant error: a small red-tinted notice.
  if (message.isError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex justify-start"
      >
        <div
          className="max-w-[85%] rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[15px] text-[#B91C1C] md:max-w-[75%]"
          style={body}
        >
          {message.content}
        </div>
      </motion.div>
    )
  }

  // Assistant: full-width markdown prose with a timestamp + action row.
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className={PROSE} style={body}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
          }}
        >
          {message.content}
        </ReactMarkdown>
        {message.isStreaming && (
          <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse align-middle bg-[#0B6477]/60" />
        )}
      </div>

      {!message.isStreaming && message.content && (
        <div className="mt-2 flex items-center gap-0.5">
          {time}
          <IconButton label="Copy" onClick={() => onCopy(message.content)}>
            {copied ? (
              <Check className="h-4 w-4 text-[#0B6477]" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </IconButton>
          {showRegenerate && onRegenerate && (
            <IconButton
              label="Regenerate response"
              onClick={() => onRegenerate(message.id)}
              disabled={busy}
            >
              <RotateCcw className="h-4 w-4" />
            </IconButton>
          )}
        </div>
      )}
    </motion.div>
  )
}
