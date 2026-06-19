import { motion } from 'framer-motion'
import { Check, Copy } from 'lucide-react'
import type { ChatMessage } from '../../lib/ai/types'
import { body } from '../../lib/fonts'

interface ChatBubbleProps {
  message: ChatMessage
  onCopy: (text: string) => void
  copied?: boolean
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

// Minimal formatting: newlines are kept via `whitespace-pre-wrap` on the
// wrapper, and **bold** segments are rendered. No full markdown parser.
function renderContent(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

export default function ChatBubble({ message, onCopy, copied }: ChatBubbleProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-[#0B6477] px-4 py-3 text-white md:max-w-[75%]">
          <div
            className="whitespace-pre-wrap text-[15px] leading-relaxed"
            style={body}
          >
            {message.content}
          </div>
          <div
            className="mt-1 text-right text-[11px] text-white/60"
            style={body}
            suppressHydrationWarning
          >
            {formatTime(message.timestamp)}
          </div>
        </div>
      </motion.div>
    )
  }

  const isError = message.isError
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex justify-start"
    >
      <div
        className={`group relative max-w-[85%] rounded-2xl rounded-tl-md border px-4 py-3 md:max-w-[75%] ${
          isError
            ? 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]'
            : 'border-[#0B6477]/10 bg-[#F3F7F6] text-neutral-800'
        }`}
      >
        <div
          className="whitespace-pre-wrap pr-6 text-[15px] leading-relaxed"
          style={body}
        >
          {renderContent(message.content)}
          {message.isStreaming && (
            <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse align-middle bg-[#0B6477]/60" />
          )}
        </div>
        <div
          className={`mt-1 text-[11px] ${isError ? 'text-[#B91C1C]/70' : 'text-neutral-400'}`}
          style={body}
          suppressHydrationWarning
        >
          {formatTime(message.timestamp)}
        </div>
        {!isError && message.content && (
          <button
            type="button"
            onClick={() => onCopy(message.content)}
            aria-label="Salin"
            className="absolute bottom-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 opacity-0 transition-opacity hover:bg-[#0B6477]/10 hover:text-[#0B6477] focus:opacity-100 group-hover:opacity-100"
          >
            {copied ? (
              <Check className="h-4 w-4 text-[#0B6477]" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </motion.div>
  )
}
