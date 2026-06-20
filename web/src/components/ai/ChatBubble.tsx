import { motion } from 'framer-motion'
import { Check, Copy, Paperclip, RotateCcw } from 'lucide-react'
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

export default function ChatBubble({
  message,
  onCopy,
  copied,
  onRegenerate,
  showRegenerate,
}: ChatBubbleProps) {
  const isUser = message.role === 'user'

  // User: a compact neutral bubble, right-aligned (Gemini style).
  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex justify-end"
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
      </motion.div>
    )
  }

  // Assistant error: a small red-tinted notice (no card chrome otherwise).
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

  // Assistant: full-width markdown prose with an action row (Gemini style).
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="group"
    >
      <div className={PROSE} style={body}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ ...props }) => (
              <a {...props} target="_blank" rel="noreferrer" />
            ),
          }}
        >
          {message.content}
        </ReactMarkdown>
        {message.isStreaming && (
          <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse align-middle bg-[#0B6477]/60" />
        )}
      </div>

      {!message.isStreaming && message.content && (
        <div className="mt-2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => onCopy(message.content)}
            aria-label="Copy"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-[#0B6477]/10 hover:text-[#0B6477]"
          >
            {copied ? (
              <Check className="h-4 w-4 text-[#0B6477]" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
          {showRegenerate && onRegenerate && (
            <button
              type="button"
              onClick={() => onRegenerate(message.id)}
              aria-label="Regenerate response"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-[#0B6477]/10 hover:text-[#0B6477]"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}
