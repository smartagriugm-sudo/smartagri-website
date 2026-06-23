import { useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  AlertCircle,
  Check,
  FileText,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react'
import { useAuth } from '../../lib/auth/auth'
import { getAccessToken, supabase } from '../../lib/auth/supabase'
import { generateMessageId } from '../../lib/ai/stream'
import { accent, body, display } from '../../lib/fonts'
import SiteHeader from '../../components/SiteHeader'
import Footer from '../../components/Footer'

export const Route = createFileRoute('/ai/knowledge')({
  component: KnowledgePage,
  head: () => ({
    meta: [
      { title: 'Knowledge base | smartagri' },
      { name: 'robots', content: 'noindex, nofollow' },
      { name: 'description', content: 'Manage the AI Assistant knowledge base.' },
    ],
  }),
})

interface KbDoc {
  ref: string
  title: string
  created_at: string
  count: number
}

const ACCEPT = '.txt,.md,.markdown,.csv,.tsv,.json,.log,.yml,.yaml'

function formatDate(value?: string) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString('en-GB', { dateStyle: 'medium' })
  } catch {
    return ''
  }
}

function KnowledgePage() {
  const { user, isConfigured } = useAuth()
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [docs, setDocs] = useState<KbDoc[]>([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadDocs = async () => {
    if (!supabase) {
      setLoadingDocs(false)
      return
    }
    const { data } = await supabase
      .from('doc_chunks')
      .select('ref, title, created_at')
      .eq('source', 'upload')
      .order('created_at', { ascending: false })
    const map = new Map<string, KbDoc>()
    for (const row of (data as KbDoc[] | null) ?? []) {
      if (!row.ref) continue
      const e = map.get(row.ref) ?? {
        ref: row.ref,
        title: row.title,
        created_at: row.created_at,
        count: 0,
      }
      e.count += 1
      map.set(row.ref, e)
    }
    setDocs([...map.values()])
    setLoadingDocs(false)
  }

  useEffect(() => {
    void loadDocs()
  }, [])

  const onFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > 2_000_000) {
      setMsg({ kind: 'err', text: 'File is too large (max 2 MB of text).' })
      return
    }
    const content = await file.text()
    setText(content)
    if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ''))
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleAdd = async () => {
    setMsg(null)
    if (!title.trim() || !text.trim()) {
      setMsg({ kind: 'err', text: 'Give it a title and some content.' })
      return
    }
    setBusy(true)
    try {
      const token = await getAccessToken()
      const res = await fetch('/api/ai/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: title.trim(),
          text,
          ref: generateMessageId(),
          userId: user?.id ?? null,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        chunks?: number
        error?: string
      }
      if (!res.ok) {
        setMsg({ kind: 'err', text: data.error ?? 'Upload failed.' })
      } else {
        setMsg({ kind: 'ok', text: `Added "${title.trim()}" (${data.chunks} chunks).` })
        setTitle('')
        setText('')
        void loadDocs()
      }
    } catch {
      setMsg({ kind: 'err', text: 'Upload failed.' })
    }
    setBusy(false)
  }

  const handleDelete = async (ref: string) => {
    if (!supabase) return
    setDocs((prev) => prev.filter((d) => d.ref !== ref))
    await supabase.from('doc_chunks').delete().eq('ref', ref)
    void loadDocs()
  }

  return (
    <main className="flex min-h-screen flex-col">
      <SiteHeader />
      <section className="flex-1 bg-[#F3F7F6]">
        <div className="mx-auto max-w-[760px] px-6 py-12 md:py-16">
          <div className="mb-8">
            <div
              className="text-[13px] font-medium tracking-[0.03em] text-[#14919B]"
              style={body}
            >
              AI Assistant
            </div>
            <h1
              className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-neutral-900 md:text-4xl"
              style={display}
            >
              Knowledge <span style={accent}>base</span>
            </h1>
            <p className="mt-2 text-sm text-neutral-500" style={body}>
              Add documents and notes for the AI Assistant to ground its answers
              on. Indexed privately to your SmartAgri knowledge base.
            </p>
          </div>

          {!isConfigured && (
            <p
              className="mb-6 rounded-2xl border border-[#0B6477]/10 bg-white px-4 py-3 text-sm text-neutral-500"
              style={body}
            >
              Authentication is not configured, so the knowledge base is
              unavailable here.
            </p>
          )}

          {/* Add */}
          <section className="rounded-3xl border border-[#0B6477]/10 bg-white p-6 md:p-7">
            <h2
              className="text-lg font-semibold tracking-[-0.02em] text-neutral-900"
              style={display}
            >
              Add to knowledge base
            </h2>
            <div className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-700" style={body}>
                  Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Fertigation field guide 2026"
                  className="w-full rounded-xl border border-[#0B6477]/20 bg-white px-3 py-2.5 text-[15px] text-neutral-800 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#0B6477]"
                  style={body}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-700" style={body}>
                  Content
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={8}
                  placeholder="Paste text here, or load a file below."
                  className="w-full resize-y rounded-xl border border-[#0B6477]/20 bg-white px-3 py-2.5 text-[15px] leading-relaxed text-neutral-800 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#0B6477]"
                  style={body}
                />
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept={ACCEPT}
                    className="hidden"
                    onChange={(e) => void onFile(e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#0B6477]/20 px-3.5 py-2 text-sm font-medium text-neutral-700 transition-colors hover:border-[#0B6477] hover:text-[#0B6477]"
                    style={body}
                  >
                    <Upload className="h-4 w-4" />
                    Load a text file
                  </button>
                  <span className="ml-2 text-xs text-neutral-400" style={body}>
                    .txt, .md, .csv, .json (PDF/DOCX coming soon)
                  </span>
                </div>
              </div>

              {msg && (
                <p
                  className={`inline-flex items-center gap-1.5 text-sm ${msg.kind === 'ok' ? 'text-[#0B6477]' : 'text-[#B91C1C]'}`}
                  style={body}
                >
                  {msg.kind === 'ok' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  {msg.text}
                </p>
              )}

              <button
                type="button"
                onClick={() => void handleAdd()}
                disabled={busy || !user}
                className="inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-[#45DFB1] px-5 py-2.5 text-sm font-medium text-[#0B2A22] transition-colors hover:bg-[#80ED99] disabled:cursor-not-allowed disabled:opacity-60"
                style={body}
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Indexing...
                  </>
                ) : (
                  'Add to knowledge base'
                )}
              </button>
            </div>
          </section>

          {/* List */}
          <section className="mt-6 rounded-3xl border border-[#0B6477]/10 bg-white p-6 md:p-7">
            <h2
              className="text-lg font-semibold tracking-[-0.02em] text-neutral-900"
              style={display}
            >
              Uploaded documents
            </h2>
            <div className="mt-4">
              {loadingDocs ? (
                <div className="flex items-center gap-2 text-neutral-500">
                  <Loader2 className="h-5 w-5 animate-spin text-[#0B6477]" />
                  <span className="text-sm" style={body}>
                    Loading...
                  </span>
                </div>
              ) : docs.length === 0 ? (
                <p className="text-sm text-neutral-400" style={body}>
                  No uploaded documents yet. (Published site content is indexed
                  separately and isn't listed here.)
                </p>
              ) : (
                <div className="flex flex-col divide-y divide-[#0B6477]/10">
                  {docs.map((d) => (
                    <div key={d.ref} className="flex items-center gap-3 py-3">
                      <FileText className="h-5 w-5 shrink-0 text-[#14919B]" />
                      <div className="min-w-0 flex-1">
                        <div
                          className="truncate text-sm font-medium text-neutral-800"
                          style={body}
                        >
                          {d.title}
                        </div>
                        <div className="text-xs text-neutral-400" style={body}>
                          {d.count} chunks · {formatDate(d.created_at)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDelete(d.ref)}
                        aria-label={`Delete ${d.title}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-[#FEF2F2] hover:text-[#B91C1C]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
      <Footer />
    </main>
  )
}
