import { useEffect, useState } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Ban, Check, Clock, Loader2, LogOut, RefreshCw, Sprout } from 'lucide-react'
import { useAuth } from '../lib/auth/auth'
import {
  LAB_ROLES,
  getAccountProfile,
  isStudentRole,
  labRoleLabel,
  listSupervisors,
  onboardingError,
  saveOnboarding,
} from '../lib/account'
import type { AccountProfile, LabRole, OnboardingFields } from '../lib/account'
import { DEFAULT_SIGNED_IN_PATH } from '../lib/features'
import { AGROSPHERE_SIGNUP } from '../lib/agrosphere'
import { accent, body, display } from '../lib/fonts'
import { headLang, useLang, useT } from '../lib/i18n'
import type { Lang } from '../lib/i18n'
import SiteHeader from '../components/SiteHeader'
import AuthGate from '../components/AuthGate'

export const Route = createFileRoute('/welcome')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect:
      typeof search.redirect === 'string' && search.redirect.startsWith('/') && !search.redirect.startsWith('//')
        ? search.redirect
        : undefined,
  }),
  component: WelcomePage,
  head: ({ matches }) => {
    const l = headLang(matches)
    return {
      meta: [
        { title: l === 'id' ? 'Selamat datang | smartagri' : 'Welcome | smartagri' },
        { name: 'robots', content: 'noindex, nofollow' },
        {
          name: 'description',
          content: l === 'id' ? 'Siapkan akun lab SmartAgri Anda.' : 'Set up your SmartAgri lab account.',
        },
      ],
    }
  },
})

// Indonesian display for lib/account copy, keyed by its English text (the role
// values and the English messages there stay as they are).
const ROLE_LABEL_ID: Record<string, string> = {
  Lecturer: 'Dosen',
  Researcher: 'Peneliti',
  Staff: 'Staf',
  'Doctoral student (S3)': 'Mahasiswa doktoral (S3)',
  'Master student (S2)': 'Mahasiswa magister (S2)',
  'Undergraduate (S1)': 'Mahasiswa sarjana (S1)',
  Alumni: 'Alumni',
  Partner: 'Mitra',
}

const ONBOARDING_ERROR_ID: Record<string, string> = {
  'Enter your full name.': 'Isi nama lengkap Anda.',
  'Choose your role in the lab.': 'Pilih peran Anda di lab.',
  'Enter your cohort as the year you started, for example 2024.': 'Isi angkatan Anda dengan tahun masuk, misalnya 2024.',
  'Enter your student ID (NIM).': 'Isi NIM Anda.',
  'Enter your research topic (a working title is fine).': 'Isi topik riset Anda (judul sementara pun tidak apa-apa).',
}

function roleLabel(role: string | null | undefined, lang: Lang): string {
  const en = labRoleLabel(role)
  return lang === 'id' ? (ROLE_LABEL_ID[en] ?? en) : en
}

// First stop after signing in: a short onboarding (who you are, and for
// students their cohort, NIM, topic and supervisor), then a waiting room until
// a lab admin approves the account (supabase/accounts.sql).

const inputClass =
  'w-full rounded-xl border border-[#0B6477]/20 bg-white px-3 py-2.5 text-[15px] text-neutral-800 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#0B6477]'

const EMPTY: OnboardingFields = {
  full_name: '',
  preferred_name: '',
  lab_role: '' as LabRole,
  cohort: null,
  staff_id: '',
  research_topic: '',
  supervisor_id: null,
}

function WelcomePage() {
  return (
    <AuthGate allowPending>
      <main>
        <SiteHeader />
        <section className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-[#F3F7F6] px-4 py-12 sm:px-6 sm:py-16">
          <WelcomeContent />
        </section>
      </main>
    </AuthGate>
  )
}

function WelcomeContent() {
  const t = useT()
  const { redirect } = Route.useSearch()
  const { user, account, refreshAccount, signOut } = useAuth()
  const target = redirect ?? DEFAULT_SIGNED_IN_PATH
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    let active = true
    void getAccountProfile().then(({ profile: p }) => {
      if (!active) return
      setProfile(p)
      setLoaded(true)
    })
    return () => {
      active = false
    }
  }, [])

  const ready = account?.onboarded && account.status === 'active'
  useEffect(() => {
    if (ready && !editing) window.location.assign(target)
  }, [ready, editing, target])

  if (!loaded || !account || !user || (ready && !editing)) {
    return <Loader2 className="h-6 w-6 animate-spin text-[#0B6477]" />
  }

  const leave = () => void signOut().then(() => window.location.assign('/'))

  if (account.status === 'rejected' || account.status === 'suspended') {
    const rejected = account.status === 'rejected'
    return (
      <Panel
        icon={<Ban className="h-6 w-6 text-[#45DFB1]" />}
        title={rejected ? t({ en: 'Registration', id: 'Pendaftaran' }) : t({ en: 'Account', id: 'Akun' })}
        accentWord={rejected ? t({ en: 'not approved', id: 'tidak disetujui' }) : t({ en: 'deactivated', id: 'dinonaktifkan' })}
      >
        <p className="text-center text-[15px] leading-relaxed text-neutral-600" style={body}>
          {rejected
            ? t({
                en: 'A lab admin did not approve this account. If you think this is a mistake, contact the SmartAgri team.',
                id: 'Admin lab tidak menyetujui akun ini. Jika menurut Anda ini keliru, silakan hubungi tim SmartAgri.',
              })
            : t({
                en: 'This account is no longer active. Your earlier work stays in place; contact a lab admin to reactivate it.',
                id: 'Akun ini sudah tidak aktif. Pekerjaan Anda sebelumnya tetap tersimpan; hubungi admin lab untuk mengaktifkannya kembali.',
              })}
        </p>
        <div className="mt-6 flex justify-center">
          <SecondaryButton onClick={leave} icon={<LogOut className="h-4 w-4" />}>
            {t({ en: 'Sign out', id: 'Keluar' })}
          </SecondaryButton>
        </div>
      </Panel>
    )
  }

  if (!account.onboarded || editing) {
    return (
      <OnboardingForm
        userId={user.id}
        initial={profile}
        suggestPartner={user.user_metadata?.signup_via === AGROSPHERE_SIGNUP}
        canCancel={account.onboarded}
        onCancel={() => setEditing(false)}
        onSaved={async (saved) => {
          setProfile((p) => ({ ...(p as AccountProfile), ...saved }))
          await refreshAccount()
          setEditing(false)
        }}
      />
    )
  }

  return <Waiting profile={profile} onEdit={() => setEditing(true)} onRefresh={refreshAccount} onSignOut={leave} />
}

function Panel({ icon, title, accentWord, subtitle, children }: { icon: ReactNode; title: string; accentWord: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="w-full max-w-[560px] rounded-3xl border border-[#0B6477]/10 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B6477]">{icon}</div>
        <h1 className="text-2xl font-semibold tracking-[-0.025em] text-neutral-900" style={display}>
          {title} <span style={accent}>{accentWord}</span>
        </h1>
        {subtitle && (
          <p className="text-sm text-neutral-500" style={body}>
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-neutral-700" style={body}>
        {label}
      </span>
      {children}
      {hint && (
        <span className="text-xs text-neutral-500" style={body}>
          {hint}
        </span>
      )}
    </label>
  )
}

function PrimaryButton({ children, busy, ...rest }: { children: ReactNode; busy?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      disabled={busy || rest.disabled}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#45DFB1] px-5 py-3 text-[15px] font-medium text-[#0B2A22] transition-colors hover:bg-[#80ED99] disabled:cursor-not-allowed disabled:opacity-60"
      style={body}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  )
}

function SecondaryButton({ children, onClick, icon }: { children: ReactNode; onClick: () => void; icon?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#0B6477]/15 bg-white px-4 py-2.5 text-sm font-medium text-[#0B6477] transition-colors hover:bg-[#F3F7F6]"
      style={body}
    >
      {icon}
      {children}
    </button>
  )
}

function OnboardingForm({
  userId,
  initial,
  suggestPartner = false,
  canCancel,
  onCancel,
  onSaved,
}: {
  userId: string
  initial: AccountProfile | null
  /** Signed up on agrosphere: start with the Partner role picked. */
  suggestPartner?: boolean
  canCancel: boolean
  onCancel: () => void
  onSaved: (saved: OnboardingFields) => Promise<void>
}) {
  const lang = useLang()
  const t = useT()
  const [f, setF] = useState<OnboardingFields>(() => ({
    ...EMPTY,
    full_name: initial?.full_name ?? '',
    preferred_name: initial?.preferred_name ?? '',
    lab_role: (initial?.lab_role || (suggestPartner ? 'mitra' : '')) as LabRole,
    cohort: initial?.cohort ?? null,
    staff_id: initial?.staff_id ?? '',
    research_topic: initial?.research_topic ?? '',
    supervisor_id: initial?.supervisor_id ?? null,
  }))
  const [step, setStep] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [supervisors, setSupervisors] = useState<{ id: string; full_name: string; lab_role: string }[]>([])
  const student = isStudentRole(f.lab_role)
  const steps = student ? 2 : 1
  const year = new Date().getFullYear()

  useEffect(() => {
    void listSupervisors().then(setSupervisors)
  }, [])

  const set = <K extends keyof OnboardingFields>(k: K, v: OnboardingFields[K]) => setF((x) => ({ ...x, [k]: v }))

  const submit = async () => {
    // Step 1 checks only the identity part; the full check runs on the last step.
    const problem = onboardingError(step === 1 && student ? { ...f, cohort: year, staff_id: '-', research_topic: '-' } : f, year)
    if (problem) {
      setError(lang === 'id' ? (ONBOARDING_ERROR_ID[problem] ?? problem) : problem)
      return
    }
    setError(null)
    if (step < steps) {
      setStep(step + 1)
      return
    }
    const fields: OnboardingFields = student
      ? { ...f, full_name: f.full_name.trim(), preferred_name: f.preferred_name.trim(), staff_id: f.staff_id.trim(), research_topic: f.research_topic.trim() }
      : { ...f, full_name: f.full_name.trim(), preferred_name: f.preferred_name.trim(), cohort: null, supervisor_id: null }
    setSaving(true)
    const { error: saveError } = await saveOnboarding(userId, fields)
    if (saveError) {
      setSaving(false)
      setError(saveError)
      return
    }
    await onSaved(fields)
  }

  return (
    <Panel
      icon={<Sprout className="h-6 w-6 text-[#45DFB1]" />}
      title={t({ en: 'Welcome to', id: 'Selamat datang di' })}
      accentWord="smartagri"
      subtitle={
        steps > 1
          ? t({
              en: `Step ${step} of ${steps} · tell the lab who you are`,
              id: `Langkah ${step} dari ${steps} · perkenalkan diri Anda kepada lab`,
            })
          : t({ en: 'Tell the lab who you are', id: 'Perkenalkan diri Anda kepada lab' })
      }
    >
      {steps > 1 && (
        <div className="mb-6 grid grid-cols-2 gap-2" aria-hidden="true">
          {[1, 2].map((n) => (
            <span key={n} className={`h-1.5 rounded-full ${n <= step ? 'bg-[#14919B]' : 'bg-[#0B6477]/10'}`} />
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
        className="flex flex-col gap-4"
      >
        {step === 1 ? (
          <>
            <Field label={t({ en: 'Full name', id: 'Nama lengkap' })}>
              <input
                value={f.full_name}
                onChange={(e) => set('full_name', e.target.value)}
                autoComplete="name"
                placeholder={t({ en: 'As on your student or staff card', id: 'Sesuai kartu mahasiswa atau kartu pegawai' })}
                className={inputClass}
                style={body}
              />
            </Field>
            <Field
              label={t({ en: 'Preferred name', id: 'Nama panggilan' })}
              hint={t({
                en: 'Shown on Kanban cards and comments. Leave empty to use your full name.',
                id: 'Ditampilkan di kartu Kanban dan komentar. Kosongkan untuk memakai nama lengkap.',
              })}
            >
              <input
                value={f.preferred_name}
                onChange={(e) => set('preferred_name', e.target.value)}
                placeholder={t({ en: 'e.g. Athala', id: 'mis. Athala' })}
                className={inputClass}
                style={body}
              />
            </Field>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-sm font-medium text-neutral-700" style={body}>
                {t({ en: 'Role in the lab', id: 'Peran di lab' })}
              </legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {LAB_ROLES.map((r) => {
                  const on = f.lab_role === r.value
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => set('lab_role', r.value)}
                      aria-pressed={on}
                      className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                        on ? 'border-[#14919B] bg-[#14919B]/8 text-[#0B6477]' : 'border-[#0B6477]/15 text-neutral-700 hover:bg-[#F3F7F6]'
                      }`}
                      style={body}
                    >
                      {lang === 'id' ? (ROLE_LABEL_ID[r.label] ?? r.label) : r.label}
                      {on && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t({ en: 'Cohort', id: 'Angkatan' })} hint={t({ en: 'Year you started', id: 'Tahun masuk' })}>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1990}
                  max={year}
                  value={f.cohort ?? ''}
                  onChange={(e) => set('cohort', e.target.value ? Number(e.target.value) : null)}
                  placeholder={String(year)}
                  className={inputClass}
                  style={body}
                />
              </Field>
              <Field
                label={t({ en: 'Student ID (NIM)', id: 'NIM' })}
                hint={t({ en: 'Visible only to you and lab admins', id: 'Hanya terlihat oleh Anda dan admin lab' })}
              >
                <input
                  value={f.staff_id}
                  onChange={(e) => set('staff_id', e.target.value)}
                  placeholder={t({ en: 'e.g. 23/123456/TP/12345', id: 'mis. 23/123456/TP/12345' })}
                  className={inputClass}
                  style={body}
                />
              </Field>
            </div>
            <Field
              label={t({ en: 'Research topic', id: 'Topik riset' })}
              hint={t({
                en: 'A working title is fine; you can change it later',
                id: 'Judul sementara pun tidak apa-apa; Anda dapat mengubahnya nanti',
              })}
            >
              <input
                value={f.research_topic}
                onChange={(e) => set('research_topic', e.target.value)}
                placeholder={t({ en: 'e.g. PPFD monitoring in a plant factory', id: 'mis. Pemantauan PPFD di plant factory' })}
                className={inputClass}
                style={body}
              />
            </Field>
            <Field label={t({ en: 'Supervisor', id: 'Dosen pembimbing' })}>
              <select
                value={f.supervisor_id ?? ''}
                onChange={(e) => set('supervisor_id', e.target.value || null)}
                className={inputClass}
                style={body}
              >
                <option value="">{t({ en: 'Not listed yet', id: 'Belum ada di daftar' })}</option>
                {supervisors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({roleLabel(s.lab_role, lang)})
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}

        {error && (
          <p className="text-sm text-[#B91C1C]" style={body} role="alert">
            {error}
          </p>
        )}

        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          {step > 1 ? (
            <SecondaryButton onClick={() => setStep(step - 1)} icon={<ArrowLeft className="h-4 w-4" />}>
              {t({ en: 'Back', id: 'Kembali' })}
            </SecondaryButton>
          ) : canCancel ? (
            <SecondaryButton onClick={onCancel}>{t({ en: 'Cancel', id: 'Batal' })}</SecondaryButton>
          ) : (
            <span />
          )}
          <PrimaryButton type="submit" busy={saving}>
            {step < steps ? (
              <>
                {t({ en: 'Next', id: 'Lanjut' })} <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              t({ en: 'Save and continue', id: 'Simpan dan lanjutkan' })
            )}
          </PrimaryButton>
        </div>
      </form>
    </Panel>
  )
}

function Waiting({
  profile,
  onEdit,
  onRefresh,
  onSignOut,
}: {
  profile: AccountProfile | null
  onEdit: () => void
  onRefresh: () => Promise<void>
  onSignOut: () => void
}) {
  const lang = useLang()
  const t = useT()
  const [checking, setChecking] = useState(false)
  const [stillPending, setStillPending] = useState(false)
  const rows: [string, string][] = [
    [t({ en: 'Name', id: 'Nama' }), profile?.full_name ?? ''],
    [t({ en: 'Role', id: 'Peran' }), roleLabel(profile?.lab_role, lang)],
  ]
  if (isStudentRole(profile?.lab_role)) {
    rows.push(
      [t({ en: 'Cohort', id: 'Angkatan' }), profile?.cohort ? String(profile.cohort) : ''],
      [t({ en: 'Research topic', id: 'Topik riset' }), profile?.research_topic ?? ''],
    )
  }

  return (
    <Panel
      icon={<Clock className="h-6 w-6 text-[#45DFB1]" />}
      title={t({ en: 'Waiting for', id: 'Menunggu' })}
      accentWord={t({ en: 'approval', id: 'persetujuan' })}
      subtitle={t({
        en: 'A lab admin reviews new accounts. You can use Kanban, Inventory and the other tools once it is approved.',
        id: 'Admin lab meninjau setiap akun baru. Anda dapat memakai Kanban, Inventaris, dan fitur lainnya setelah akun disetujui.',
      })}
    >
      <dl className="divide-y divide-[#0B6477]/8 rounded-2xl border border-[#0B6477]/10 bg-[#F7FAF9] px-4">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 py-2.5 text-sm" style={body}>
            <dt className="shrink-0 text-neutral-500">{k}</dt>
            <dd className="min-w-0 text-right text-neutral-900 [overflow-wrap:anywhere]">{v || '-'}</dd>
          </div>
        ))}
      </dl>
      {stillPending && (
        <p className="mt-4 text-center text-sm text-neutral-500" style={body} role="status">
          {t({ en: 'Not approved yet. Check again later.', id: 'Belum disetujui. Silakan periksa lagi nanti.' })}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <PrimaryButton
          type="button"
          busy={checking}
          onClick={() => {
            setChecking(true)
            void onRefresh().then(() => {
              setChecking(false)
              setStillPending(true)
            })
          }}
        >
          {!checking && <RefreshCw className="h-4 w-4" />}
          {t({ en: 'Check again', id: 'Periksa lagi' })}
        </PrimaryButton>
        <SecondaryButton onClick={onEdit}>{t({ en: 'Edit details', id: 'Ubah data' })}</SecondaryButton>
        <SecondaryButton onClick={onSignOut} icon={<LogOut className="h-4 w-4" />}>
          {t({ en: 'Sign out', id: 'Keluar' })}
        </SecondaryButton>
      </div>
      <p className="mt-6 text-center text-sm text-neutral-500" style={body}>
        {t({ en: 'You can also add a photo in', id: 'Anda juga dapat menambahkan foto di' })}{' '}
        <Link to="/account" className="font-medium text-[#0B6477] hover:underline">
          {t({ en: 'Profile & settings', id: 'Profil & pengaturan' })}
        </Link>
        .
      </p>
    </Panel>
  )
}
