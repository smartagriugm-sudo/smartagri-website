import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createFileRoute } from '@tanstack/react-router'
import { AlertCircle } from 'lucide-react'
import type { DocumentType } from '../../lib/ai/types'
import { consumeStream } from '../../lib/ai/stream'
import { getAccessToken } from '../../lib/auth/supabase'
import { body } from '../../lib/fonts'
import SiteHeader from '../../components/SiteHeader'
import GeneratorForm from '../../components/ai/GeneratorForm'
import GeneratorPreview from '../../components/ai/GeneratorPreview'

const ERROR_TEXT =
  'Failed to generate the document. Make sure the Ollama server is running, then try again.'

export const Route = createFileRoute('/ai/generate')({
  component: AIGeneratePage,
  head: () => ({
    meta: [
      { title: 'Report Generator | smartagri' },
      {
        name: 'description',
        content:
          'SmartAgri UGM academic document generator: activity reports, articles, proposals, abstracts, data summaries, and official letters.',
      },
    ],
  }),
})

function AIGeneratePage() {
  const [generatedContent, setGeneratedContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [currentDocType, setCurrentDocType] = useState<DocumentType | null>(null)
  const [error, setError] = useState<string | null>(null)

  const showError = () => {
    setError(ERROR_TEXT)
    setTimeout(() => setError(null), 5000)
  }

  const handleGenerate = async (
    docType: DocumentType,
    fields: Record<string, string>,
  ) => {
    setIsStreaming(true)
    setIsComplete(false)
    setGeneratedContent('')
    setCurrentDocType(docType)
    setError(null)

    try {
      const token = await getAccessToken()
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ docType, fields }),
      })

      await consumeStream(
        response,
        (chunk) => setGeneratedContent((prev) => prev + chunk),
        () => {
          setIsStreaming(false)
          setIsComplete(true)
        },
        () => {
          setIsStreaming(false)
          showError()
        },
      )
    } catch {
      setIsStreaming(false)
      showError()
    }
  }

  return (
    <main>
      <SiteHeader />
      <div className="md:flex md:h-[calc(100vh-76px)]">
        <div className="border-b border-[#0B6477]/10 bg-white md:w-2/5 md:overflow-y-auto md:border-b-0 md:border-r">
          <GeneratorForm onGenerate={handleGenerate} isLoading={isStreaming} />
        </div>
        <div className="md:w-3/5">
          <GeneratorPreview
            content={generatedContent}
            isStreaming={isStreaming}
            isComplete={isComplete}
            docType={currentDocType}
          />
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-[60] inline-flex -translate-x-1/2 items-center gap-2 rounded-xl bg-[#B91C1C] px-4 py-3 text-sm font-medium text-white shadow-lg"
            style={body}
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
