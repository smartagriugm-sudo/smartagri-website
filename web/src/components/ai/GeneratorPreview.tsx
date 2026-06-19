import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Copy, Download, FileText } from 'lucide-react'
import type { DocumentType } from '../../lib/ai/types'
import { DOCUMENT_TYPE_CONFIGS } from '../../lib/ai/prompts'
import { body } from '../../lib/fonts'

interface GeneratorPreviewProps {
  content: string
  isStreaming: boolean
  isComplete: boolean
  docType: DocumentType | null
}

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

// e.g. activity_report -> "laporan-kegiatan-20260619.txt"
function buildFilename(docType: DocumentType | null) {
  const label = docType ? DOCUMENT_TYPE_CONFIGS[docType].label : 'dokumen'
  const slug =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'dokumen'
  const d = new Date()
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  return `${slug}-${stamp}.txt`
}

export default function GeneratorPreview({
  content,
  isStreaming,
  isComplete,
  docType,
}: GeneratorPreviewProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard?.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = buildFilename(docType)
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const empty = content === '' && !isStreaming

  return (
    <div className="flex h-full min-h-[60vh] flex-col bg-[#FBFCFC]">
      {isComplete && content && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex shrink-0 items-center justify-end gap-2 border-b border-[#0B6477]/10 bg-white px-4 py-2.5 md:px-6"
        >
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#0B6477]/20 px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:border-[#0B6477] hover:text-[#0B6477]"
            style={body}
          >
            {copied ? (
              <Check className="h-4 w-4 text-[#0B6477]" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? 'Copied' : 'Copy All'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B6477] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#14919B]"
            style={body}
          >
            <Download className="h-4 w-4" />
            Download .txt
          </button>
        </motion.div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        {empty ? (
          <div className="flex h-full min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0B6477]/10">
              <FileText className="h-7 w-7 text-[#0B6477]" />
            </div>
            <p className="max-w-[260px] text-sm text-neutral-400" style={body}>
              Your generated document will appear here
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="mx-auto max-w-2xl whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-800"
            style={body}
          >
            {content}
            {isStreaming && (
              <motion.span
                animate={{ opacity: [1, 1, 0, 0] }}
                transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
                className="ml-0.5 inline-block font-normal text-[#0B6477]"
              >
                |
              </motion.span>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
