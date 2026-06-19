import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Sparkles } from 'lucide-react'
import type { DocumentType } from '../../lib/ai/types'
import { DOCUMENT_TYPE_CONFIGS } from '../../lib/ai/prompts'
import { body, display } from '../../lib/fonts'

interface GeneratorFormProps {
  onGenerate: (docType: DocumentType, fields: Record<string, string>) => void
  isLoading: boolean
}

const DOC_TYPE_KEYS = Object.keys(DOCUMENT_TYPE_CONFIGS) as DocumentType[]

// Sensible defaults: select fields start on their first option so a required
// select is never empty; text/textarea start blank.
function buildDefaults(docType: DocumentType): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const field of DOCUMENT_TYPE_CONFIGS[docType].fields) {
    fields[field.key] =
      field.type === 'select' && field.options?.length
        ? field.options[0].value
        : ''
  }
  return fields
}

const inputBase =
  'w-full rounded-xl border bg-white px-3 py-2.5 text-[15px] text-neutral-800 outline-none transition-colors placeholder:text-neutral-400'

export default function GeneratorForm({ onGenerate, isLoading }: GeneratorFormProps) {
  const [docType, setDocType] = useState<DocumentType>('activity_report')
  const [fields, setFields] = useState<Record<string, string>>(() =>
    buildDefaults('activity_report'),
  )
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  const config = DOCUMENT_TYPE_CONFIGS[docType]

  const changeDocType = (next: DocumentType) => {
    setDocType(next)
    setFields(buildDefaults(next))
    setErrors({})
  }

  const setField = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }))
    if (errors[key] && value.trim())
      setErrors((prev) => ({ ...prev, [key]: false }))
  }

  const handleSubmit = () => {
    const nextErrors: Record<string, boolean> = {}
    for (const field of config.fields) {
      if (field.required && !fields[field.key]?.trim()) nextErrors[field.key] = true
    }
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return
    onGenerate(docType, fields)
  }

  const borderClass = (key: string) =>
    errors[key]
      ? 'border-red-400 focus:border-red-500'
      : 'border-[#0B6477]/20 focus:border-[#0B6477]'

  return (
    <div className="flex flex-col gap-5 p-5 md:p-6">
      <div>
        <h1
          className="text-lg font-semibold tracking-[-0.02em] text-neutral-900 md:text-xl"
          style={display}
        >
          Report Generator
        </h1>
        <p className="text-xs text-neutral-500 md:text-sm" style={body}>
          Generate academic document drafts for SmartAgri SARC UGM
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-700" style={body}>
          Document Type
        </label>
        <select
          value={docType}
          onChange={(e) => changeDocType(e.target.value as DocumentType)}
          className={`${inputBase} cursor-pointer border-[#0B6477]/20 focus:border-[#0B6477]`}
          style={body}
        >
          {DOC_TYPE_KEYS.map((key) => (
            <option key={key} value={key}>
              {DOCUMENT_TYPE_CONFIGS[key].label}
            </option>
          ))}
        </select>
        <p className="text-xs text-neutral-400" style={body}>
          {config.description}
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={docType}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-4"
        >
          {config.fields.map((field) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium text-neutral-700"
                style={body}
              >
                {field.label}
                {field.required && <span className="text-red-500"> *</span>}
              </label>

              {field.type === 'textarea' ? (
                <textarea
                  rows={3}
                  value={fields[field.key] ?? ''}
                  onChange={(e) => setField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className={`${inputBase} min-h-[84px] resize-y ${borderClass(field.key)}`}
                  style={body}
                />
              ) : field.type === 'select' ? (
                <select
                  value={fields[field.key] ?? ''}
                  onChange={(e) => setField(field.key, e.target.value)}
                  className={`${inputBase} cursor-pointer ${borderClass(field.key)}`}
                  style={body}
                >
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={fields[field.key] ?? ''}
                  onChange={(e) => setField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className={`${inputBase} ${borderClass(field.key)}`}
                  style={body}
                />
              )}

              {errors[field.key] && (
                <span className="text-xs text-red-500" style={body}>
                  Required
                </span>
              )}
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isLoading}
        className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#45DFB1] px-5 py-3 text-[15px] font-medium text-[#0B2A22] transition-colors hover:bg-[#80ED99] disabled:cursor-not-allowed disabled:opacity-60"
        style={body}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Generate Document
          </>
        )}
      </button>
    </div>
  )
}
