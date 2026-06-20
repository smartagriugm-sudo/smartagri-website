import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Cpu } from 'lucide-react'
import { AI_MODELS, getModel } from '../../lib/ai/models'
import { body } from '../../lib/fonts'

interface ModelMenuProps {
  modelId: string
  onChange: (id: string) => void
}

// Compact model picker styled after Gemini's "Pro v" control, in smartagri
// colours. Click to reveal the list of on-prem models.
export default function ModelMenu({ modelId, onChange }: ModelMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const active = getModel(modelId)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#0B6477]/20 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:border-[#0B6477] hover:text-[#0B6477]"
        style={body}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Cpu className="h-4 w-4 text-[#14919B]" />
        {active.label}
        <ChevronDown
          className={`h-4 w-4 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 min-w-[240px] rounded-2xl border border-[#0B6477]/10 bg-white p-1.5 shadow-xl">
          {AI_MODELS.map((m) => {
            const selected = m.id === modelId
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onChange(m.id)
                  setOpen(false)
                }}
                className={`flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  selected ? 'bg-[#F3F7F6]' : 'hover:bg-[#F3F7F6]'
                }`}
              >
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-neutral-800" style={body}>
                    {m.label}
                  </span>
                  <span className="text-xs text-neutral-400" style={body}>
                    {m.detail}
                  </span>
                </span>
                {selected && <Check className="ml-auto mt-0.5 h-4 w-4 text-[#0B6477]" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
