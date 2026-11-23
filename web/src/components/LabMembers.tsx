import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Ban,
  Check,
  ChevronDown,
  Clock,
  Loader2,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  UserX,
} from 'lucide-react'
import type { AccountStatus } from '../lib/account'
import { isStudentRole, labRoleLabel } from '../lib/account'
import {
  defaultBoardsFor,
  listLabAccounts,
  listReviewBoards,
  reviewLabAccount,
  setLabAdmin,
} from '../lib/lab-admin'
import type { LabAccount, ReviewBoard } from '../lib/lab-admin'
import { body, display } from '../lib/fonts'
import { EASE, META } from './NoteParts'
import { localeOf, useLang, useT, type Bi, type Lang } from '../lib/i18n'

// Admin-only section of /account: every lab account with its onboarding
// details, filtered by status. Pending accounts open a review panel to approve
// (joining the ticked Kanban boards) or reject; active ones can be suspended
// or made admin; suspended and rejected ones can be reactivated.

type Filter = AccountStatus | 'all'

const STATUS_META: Record<AccountStatus, { label: Bi; chip: string; dot: string }> = {
  pending: { label: { en: 'Pending', id: 'Menunggu' }, chip: 'bg-[#F2B84B]/15 text-[#8A5300]', dot: 'bg-[#F2B84B]' },
  active: { label: { en: 'Active', id: 'Aktif' }, chip: 'bg-[#45DFB1]/20 text-[#0B6477]', dot: 'bg-[#12B886]' },
  suspended: { label: { en: 'Suspended', id: 'Ditangguhkan' }, chip: 'bg-neutral-100 text-neutral-500', dot: 'bg-neutral-400' },
  rejected: { label: { en: 'Rejected', id: 'Ditolak' }, chip: 'bg-[#E5484D]/10 text-[#B42318]', dot: 'bg-[#E5484D]' },
}

const FILTERS: { key: Filter; label: Bi }[] = [
  { key: 'pending', label: { en: 'Pending', id: 'Menunggu' } },
  { key: 'active', label: { en: 'Active', id: 'Aktif' } },
  { key: 'suspended', label: { en: 'Suspended', id: 'Ditangguhkan' } },
  { key: 'rejected', label: { en: 'Rejected', id: 'Ditolak' } },
  { key: 'all', label: { en: 'All', id: 'Semua' } },
]

function nameOf(a: LabAccount) {
  return (a.full_name || a.preferred_name || a.email.split('@')[0] || 'Unnamed').trim()
}

function since(iso: string | null, lang: Lang) {
  if (!iso) return '-'
  const id = lang === 'id'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return id ? 'hari ini' : 'today'
  if (days === 1) return id ? 'kemarin' : 'yesterday'
  if (days < 30) return id ? `${days} hari lalu` : `${days} days ago`
  return new Date(iso).toLocaleDateString(id ? localeOf(lang) : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Avatar({ a }: { a: LabAccount }) {
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[#0B6477] text-base font-semibold text-[#45DFB1]">
      {a.avatar_url ? <img src={a.avatar_url} alt="" className="h-full w-full object-cover" /> : nameOf(a)[0]!.toUpperCase()}
    </span>
  )
}

function ActionButton({
  onClick,
  busy,
  tone = 'plain',
  children,
}: {
  onClick: () => void
  busy?: boolean
  tone?: 'primary' | 'plain' | 'danger'
  children: ReactNode
}) {
  const cls =
    tone === 'primary'
      ? 'bg-[#45DFB1] text-[#0B2A22] hover:bg-[#80ED99] border-transparent'
      : tone === 'danger'
        ? 'border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2]'
        : 'border-[#0B6477]/20 text-[#0B6477] hover:border-[#08313A] hover:bg-[#08313A] hover:text-white'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3.5 text-sm font-medium transition-colors disabled:opacity-60 ${cls}`}
      style={body}
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}

export default function LabMembers({ selfId, onPendingCount }: { selfId: string | null; onPendingCount?: (n: number) => void }) {
  const [accounts, setAccounts] = useState<LabAccount[] | null>(null)
  const [boards, setBoards] = useState<ReviewBoard[]>([])
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('pending')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [rowError, setRowError] = useState<{ id: string; text: string } | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)
  const [picked, setPicked] = useState<Record<string, string[]>>({})
  const t = useT()
  const lang = useLang()

  const load = async () => {
    const [res, b] = await Promise.all([listLabAccounts(lang), listReviewBoards()])
    if (res.error) setError(res.error)
    else {
      setError(null)
      setAccounts(res.data)
    }
    setBoards(b)
  }

  useEffect(() => {
    void load()
  }, [])

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { pending: 0, active: 0, suspended: 0, rejected: 0, all: 0 }
    for (const a of accounts ?? []) {
      c[a.status] += 1
      c.all += 1
    }
    return c
  }, [accounts])

  useEffect(() => {
    onPendingCount?.(counts.pending)
  }, [counts.pending, onPendingCount])

  // Start on "All" when nobody is waiting, so the list is not empty.
  useEffect(() => {
    if (accounts && counts.pending === 0 && filter === 'pending') setFilter('all')
    // only once the list has loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts])

  const byId = useMemo(() => new Map((accounts ?? []).map((a) => [a.id, a])), [accounts])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (accounts ?? []).filter((a) => {
      if (filter !== 'all' && a.status !== filter) return false
      if (!q) return true
      return `${nameOf(a)} ${a.email} ${a.staff_id ?? ''} ${a.research_topic ?? ''}`.toLowerCase().includes(q)
    })
  }, [accounts, filter, query])

  const act = async (a: LabAccount, run: () => Promise<{ error: string | null }>) => {
    setBusy(a.id)
    setRowError(null)
    const { error: e } = await run()
    setBusy(null)
    setConfirm(null)
    if (e) {
      setRowError({ id: a.id, text: e })
      return
    }
    setOpen(null)
    await load()
  }

  const openReview = (a: LabAccount) => {
    setOpen((o) => (o === a.id ? null : a.id))
    setPicked((p) => (p[a.id] ? p : { ...p, [a.id]: defaultBoardsFor(a.lab_role, boards) }))
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-dashed border-[#E5484D]/30 bg-[#FEF2F2]/60 px-5 py-4 text-sm text-[#B42318]" style={body}>
        {t({ en: 'Could not load lab accounts:', id: 'Akun lab tidak bisa dimuat:' })} {error}
      </p>
    )
  }
  if (!accounts) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-neutral-500" style={body}>
        <Loader2 className="h-5 w-5 animate-spin text-[#0B6477]" /> {t({ en: 'Loading accounts...', id: 'Memuat akun...' })}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Filters and search */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label={t({ en: 'Filter by status', id: 'Filter menurut status' })}>
          {FILTERS.map((f) => {
            const on = filter === f.key
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setFilter(f.key)}
                className={`relative inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  on ? 'border-transparent text-white' : 'border-[#0B6477]/15 bg-white text-neutral-700 hover:border-[#0B6477]/40'
                }`}
                style={body}
              >
                {on && (
                  <motion.span layoutId="lab-members-filter" className="absolute inset-0 rounded-full bg-[#08313A]" transition={{ duration: 0.4, ease: EASE }} />
                )}
                {f.key !== 'all' && <span className={`relative h-1.5 w-1.5 rounded-full ${STATUS_META[f.key].dot}`} />}
                <span className="relative">
                  {t(f.label)}
                  <span className={on ? 'text-white/60' : 'text-neutral-400'}> {counts[f.key]}</span>
                </span>
              </button>
            )
          })}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t({ en: 'Search name, email, NIM or topic', id: 'Cari nama, email, NIM, atau topik' })}
            aria-label={t({ en: 'Search accounts', id: 'Cari akun' })}
            className="h-10 w-full rounded-lg border border-[#0B6477]/15 bg-white pl-9 pr-3 text-sm text-neutral-700 outline-none transition-colors focus:border-[#14919B] focus:ring-2 focus:ring-[#14919B]/20"
            style={body}
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#0B6477]/20 bg-[#F7FAF9] px-5 py-8 text-center text-sm text-neutral-500" style={body}>
          {filter === 'pending' && !query
            ? t({ en: 'Nobody is waiting for approval.', id: 'Tidak ada yang menunggu persetujuan.' })
            : t({ en: 'No accounts match.', id: 'Tidak ada akun yang cocok.' })}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((a) => {
            const meta = STATUS_META[a.status]
            const self = a.id === selfId
            const supervisor = a.supervisor_id ? byId.get(a.supervisor_id) : null
            const isOpen = open === a.id
            const chosen = picked[a.id] ?? []
            return (
              <motion.li
                key={a.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: EASE }}
                className={`overflow-hidden rounded-2xl border bg-white transition-colors ${
                  isOpen ? 'border-[#14919B]/40 shadow-[0_18px_40px_-30px_rgba(8,49,58,0.45)]' : 'border-[#0B6477]/10'
                }`}
              >
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-5">
                  <div className="flex min-w-0 flex-1 gap-3.5">
                    <Avatar a={a} />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-medium tracking-[-0.01em] text-neutral-900" style={display}>
                          {nameOf(a)}
                        </span>
                        {a.is_admin && (
                          <span className={`inline-flex items-center gap-1 rounded-full bg-[#08313A] px-2 py-0.5 text-[#45DFB1] ${META}`} style={body}>
                            <ShieldCheck className="h-3 w-3" /> Admin
                          </span>
                        )}
                        {self && (
                          <span className={`rounded-full bg-[#F3F7F6] px-2 py-0.5 text-neutral-500 ${META}`} style={body}>
                            {t({ en: 'You', id: 'Anda' })}
                          </span>
                        )}
                      </p>
                      <p className="truncate text-[13px] text-neutral-500" style={body}>
                        {a.email}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {[
                          labRoleLabel(a.lab_role, lang),
                          isStudentRole(a.lab_role) && a.cohort ? t({ en: `Cohort ${a.cohort}`, id: `Angkatan ${a.cohort}` }) : '',
                          a.staff_id ? `ID ${a.staff_id}` : '',
                        ]
                          .filter(Boolean)
                          .map((tag) => (
                            <span key={tag} className="rounded-full border border-[#0B6477]/12 bg-[#F7FAF9] px-2.5 py-0.5 text-[12px] text-[#0B6477]" style={body}>
                              {tag}
                            </span>
                          ))}
                        {!a.onboarded_at && (
                          <span className="rounded-full bg-[#F2B84B]/15 px-2.5 py-0.5 text-[12px] text-[#8A5300]" style={body}>
                            {t({ en: 'Profile not completed', id: 'Profil belum lengkap' })}
                          </span>
                        )}
                      </div>
                      {(a.research_topic || supervisor) && (
                        <p className="mt-2 text-[13px] leading-relaxed text-neutral-600" style={body}>
                          {a.research_topic && (
                            <>
                              <span className="text-[#14919B]">{t({ en: 'Topic', id: 'Topik' })} · </span>
                              {a.research_topic}
                            </>
                          )}
                          {a.research_topic && supervisor && <span className="text-neutral-300"> | </span>}
                          {supervisor && (
                            <>
                              <span className="text-[#14919B]">{t({ en: 'Supervisor', id: 'Pembimbing' })} · </span>
                              {nameOf(supervisor)}
                            </>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
                    <span className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.chip}`} style={body}>
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                        {t(meta.label)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-neutral-400" style={body}>
                        <Clock className="h-3 w-3" /> {t({ en: 'joined', id: 'bergabung' })} {since(a.created_at, lang)}
                      </span>
                    </span>

                    <div className="flex flex-wrap gap-2">
                      {a.status === 'pending' && (
                        <ActionButton tone="primary" onClick={() => openReview(a)}>
                          {t({ en: 'Review', id: 'Tinjau' })}
                          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </ActionButton>
                      )}
                      {a.status === 'active' && !self && (
                        <>
                          <ActionButton busy={busy === a.id && confirm !== `suspend-${a.id}`} onClick={() => void act(a, () => setLabAdmin(a.id, !a.is_admin, lang))}>
                            {a.is_admin ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                            {a.is_admin ? t({ en: 'Remove admin', id: 'Cabut admin' }) : t({ en: 'Make admin', id: 'Jadikan admin' })}
                          </ActionButton>
                          <ActionButton
                            tone="danger"
                            busy={busy === a.id && confirm === `suspend-${a.id}`}
                            onClick={() =>
                              confirm === `suspend-${a.id}`
                                ? void act(a, () => reviewLabAccount(a.id, 'suspended', [], lang))
                                : setConfirm(`suspend-${a.id}`)
                            }
                          >
                            <Ban className="h-4 w-4" />
                            {confirm === `suspend-${a.id}`
                              ? t({ en: 'Click again to suspend', id: 'Klik lagi untuk menangguhkan' })
                              : t({ en: 'Suspend', id: 'Tangguhkan' })}
                          </ActionButton>
                        </>
                      )}
                      {(a.status === 'suspended' || a.status === 'rejected') && (
                        <ActionButton busy={busy === a.id} onClick={() => void act(a, () => reviewLabAccount(a.id, 'active', [], lang))}>
                          <RotateCcw className="h-4 w-4" />
                          {t({ en: 'Reactivate', id: 'Aktifkan lagi' })}
                        </ActionButton>
                      )}
                    </div>
                  </div>
                </div>

                {rowError?.id === a.id && (
                  <p className="border-t border-[#FECACA] bg-[#FEF2F2] px-5 py-2.5 text-sm text-[#B91C1C]" role="alert" style={body}>
                    {rowError.text}
                  </p>
                )}

                {/* Review panel for a pending account */}
                <AnimatePresence initial={false}>
                  {isOpen && a.status === 'pending' && (
                    <motion.div
                      key="review"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-4 border-t border-[#0B6477]/10 bg-[#F7FAF9] p-4 sm:p-5">
                        {!a.onboarded_at && (
                          <p className="text-sm text-[#8A5300]" style={body}>
                            {t({
                              en: 'This person has not completed the welcome form yet, so role, NIM and topic are missing. You can still approve them.',
                              id: 'Orang ini belum mengisi formulir sambutan, jadi peran, NIM, dan topik belum ada. Anda tetap bisa menyetujuinya.',
                            })}
                          </p>
                        )}
                        {boards.length > 0 && (
                          <div>
                            <p className={`mb-2 text-neutral-500 ${META}`} style={body}>
                              {t({ en: 'Join these Kanban boards as a member', id: 'Gabung ke board Kanban ini sebagai anggota' })}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {boards.map((b) => {
                                const on = chosen.includes(b.id)
                                return (
                                  <button
                                    key={b.id}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() =>
                                      setPicked((p) => ({
                                        ...p,
                                        [a.id]: on ? chosen.filter((x) => x !== b.id) : [...chosen, b.id],
                                      }))
                                    }
                                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                                      on ? 'border-[#14919B] bg-white text-[#0B6477]' : 'border-[#0B6477]/15 bg-white/60 text-neutral-500 hover:border-[#0B6477]/40'
                                    }`}
                                    style={body}
                                  >
                                    <span
                                      className={`grid h-4 w-4 place-items-center rounded border ${on ? 'border-[#14919B] bg-[#14919B] text-white' : 'border-neutral-300 bg-white'}`}
                                    >
                                      {on && <Check className="h-3 w-3" strokeWidth={3} />}
                                    </span>
                                    {b.name}
                                  </button>
                                )
                              })}
                            </div>
                            <p className="mt-2 text-xs text-neutral-400" style={body}>
                              {t({
                                en: 'Pre-selected from their role. Only boards you can see are listed.',
                                id: 'Dipilih otomatis sesuai perannya. Hanya board yang bisa Anda lihat yang tercantum.',
                              })}
                            </p>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <ActionButton
                            tone="primary"
                            busy={busy === a.id && confirm !== `reject-${a.id}`}
                            onClick={() => void act(a, () => reviewLabAccount(a.id, 'active', chosen, lang))}
                          >
                            <UserCheck className="h-4 w-4" />
                            {chosen.length
                              ? t({
                                  en: `Approve and join ${chosen.length} board${chosen.length > 1 ? 's' : ''}`,
                                  id: `Setujui dan gabung ${chosen.length} board`,
                                })
                              : t({ en: 'Approve', id: 'Setujui' })}
                          </ActionButton>
                          <ActionButton
                            tone="danger"
                            busy={busy === a.id && confirm === `reject-${a.id}`}
                            onClick={() =>
                              confirm === `reject-${a.id}`
                                ? void act(a, () => reviewLabAccount(a.id, 'rejected', [], lang))
                                : setConfirm(`reject-${a.id}`)
                            }
                          >
                            <UserX className="h-4 w-4" />
                            {confirm === `reject-${a.id}`
                              ? t({ en: 'Click again to reject', id: 'Klik lagi untuk menolak' })
                              : t({ en: 'Reject', id: 'Tolak' })}
                          </ActionButton>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
