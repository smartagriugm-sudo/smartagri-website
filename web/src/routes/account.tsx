import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { MotionConfig, motion } from 'framer-motion'
import {
  BadgeCheck,
  Boxes,
  Camera,
  Check,
  Clock,
  Crop,
  ShieldCheck,
  SquareKanban,
  Download,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../lib/auth/auth'
import { AI_MODELS } from '../lib/ai/models'
import { AI_ASSISTANT_ENABLED } from '../lib/features'
import {
  changeEmail,
  changePassword,
  countConversations,
  deleteAllConversations,
  exportConversations,
  getProfile,
  avatarOriginalUrl,
  removeAvatar,
  saveAvatar,
  updateProfile,
} from '../lib/profile'
import { cropFromUrl } from '../lib/avatar'
import type { AvatarCrop } from '../lib/avatar'
import { isStudentRole, labRoleLabel } from '../lib/account'
import type { AccountProfile } from '../lib/account'
import AvatarEditor from '../components/AvatarEditor'
import LabMembers from '../components/LabMembers'
import { listLabAccounts } from '../lib/lab-admin'
import type { AvatarSource } from '../components/AvatarEditor'
import { accent, body, display } from '../lib/fonts'
import SiteHeader from '../components/SiteHeader'
import Footer from '../components/Footer'
import AmbientWash from '../components/AmbientWash'
import AuthGate from '../components/AuthGate'
import { EASE, MaskLine, META } from '../components/NoteParts'

export const Route = createFileRoute('/account')({
  component: AccountPage,
  head: () => ({
    meta: [
      { title: 'Profile & settings | smartagri' },
      { name: 'robots', content: 'noindex, nofollow' },
      { name: 'description', content: 'Research assistant profile and account settings.' },
    ],
  }),
})

// Profile & settings for signed-in research assistants: a masthead with the
// person's card, a sticky list of sections that follows the scroll, and one
// card per section. Personalisation and chat history belong to the AI
// Assistant and only show while it is switched on (lib/features.ts).

const LANGUAGES = [
  { value: 'auto', label: 'Match my message' },
  { value: 'English', label: 'English' },
  { value: 'Indonesian', label: 'Indonesian' },
]
const STYLES = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'concise', label: 'Concise' },
  { value: 'detailed', label: 'Detailed' },
]

const SECTIONS: { id: string; label: string; icon: LucideIcon; ai?: boolean; admin?: boolean }[] = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'personalization', label: 'Personalization', icon: Sparkles, ai: true },
  { id: 'account', label: 'Account', icon: Mail },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'history', label: 'Chat history', icon: MessageSquare, ai: true },
  // Admins only: review and manage every lab account.
  { id: 'members', label: 'Lab members', icon: Users, admin: true },
]
const VISIBLE = SECTIONS.filter((s) => !s.ai || AI_ASSISTANT_ENABLED)

const inputClass =
  'w-full rounded-xl border border-[#0B6477]/15 bg-white px-3.5 py-2.5 text-[15px] text-neutral-800 outline-none transition-[border-color,box-shadow] placeholder:text-neutral-400 focus:border-[#14919B] focus:shadow-[0_0_0_4px_rgba(69,223,177,0.18)]'

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={`text-neutral-500 ${META}`} style={body}>
        {label}
      </span>
      {children}
      {hint && (
        <span className="text-xs text-neutral-400" style={body}>
          {hint}
        </span>
      )}
    </label>
  )
}

function Card({
  id,
  icon: Icon,
  title,
  desc,
  children,
  current,
}: {
  id: string
  icon: LucideIcon
  title: string
  desc?: string
  children: ReactNode
  current: string
}) {
  if (current !== id) return null
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="scroll-mt-28 rounded-[24px] border border-[#0B6477]/10 bg-white/90 p-6 shadow-[0_14px_40px_-30px_rgba(8,49,58,0.35)] backdrop-blur md:p-8"
    >
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#0B6477] text-[#45DFB1]">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-medium tracking-[-0.02em] text-neutral-900 md:text-[22px]" style={display}>
            {title}
          </h2>
          {desc && (
            <p className="mt-1 text-[15px] text-neutral-500" style={body}>
              {desc}
            </p>
          )}
        </div>
      </div>
      <div className="mt-7 flex flex-col gap-5">{children}</div>
    </motion.section>
  )
}

function SaveButton({
  onClick,
  saving,
  saved,
  disabled,
  label = 'Save changes',
}: {
  onClick: () => void
  saving: boolean
  saved: boolean
  disabled?: boolean
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving || disabled}
      className="group inline-flex h-11 w-fit items-center justify-center gap-2 rounded-lg bg-[#45DFB1] px-5 text-sm font-medium uppercase tracking-[0.08em] text-[#0B2A22] transition-colors hover:bg-[#80ED99] disabled:cursor-not-allowed disabled:opacity-60"
      style={body}
    >
      {saving ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Saving
        </>
      ) : saved ? (
        <motion.span initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="inline-flex items-center gap-2">
          <Check className="h-4 w-4" /> Saved
        </motion.span>
      ) : (
        label
      )}
    </button>
  )
}

function SecondaryButton({
  onClick,
  disabled,
  children,
  danger,
}: {
  onClick: () => void
  disabled?: boolean
  children: ReactNode
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors disabled:opacity-60 ${
        danger
          ? 'border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2]'
          : 'border-[#0B6477]/20 text-[#0B6477] hover:border-[#08313A] hover:bg-[#08313A] hover:text-white'
      }`}
      style={body}
    >
      {children}
    </button>
  )
}

function formatDate(value?: string) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return '-'
  }
}

// Settings show one section at a time, like tabs. The hash (#security) keeps
// a section linkable and survives a reload.
function useTab(ids: string[]) {
  const [tab, setTab] = useState(ids[0])
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.slice(1)
      if (ids.includes(h)) setTab(h)
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
    // ids is a module constant
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const select = (id: string) => {
    setTab(id)
    window.history.replaceState(null, '', `#${id}`)
  }
  return [tab, select] as const
}

function AccountPage() {
  return (
    <AuthGate allowPending>
      <MotionConfig reducedMotion="user">
        <main>
          <SiteHeader />
          <div className="relative overflow-clip bg-white">
            <AmbientWash count={5} />
            <div className="relative">
              <AccountContent />
            </div>
          </div>
          <Footer />
        </main>
      </MotionConfig>
    </AuthGate>
  )
}

function AccountContent() {
  const { user, isConfigured, account, refreshAccount } = useAuth()
  const [tab, selectTab] = useTab(VISIBLE.map((s) => s.id))
  const isAdmin = !!account?.isAdmin
  const tabs = VISIBLE.filter((s) => !s.admin || isAdmin)
  // A non-admin opening #members lands on the profile instead.
  const active = tabs.some((s) => s.id === tab) ? tab : 'profile'
  const [pendingCount, setPendingCount] = useState(0)
  // Admins see how many accounts wait for approval on the tab itself.
  useEffect(() => {
    if (!isAdmin) return
    let live = true
    void listLabAccounts().then((r) => {
      if (live && r.data) setPendingCount(r.data.filter((a) => a.status === 'pending').length)
    })
    return () => {
      live = false
    }
  }, [isAdmin])

  const [loading, setLoading] = useState(true)
  // Identity
  const [fullName, setFullName] = useState('')
  const [preferredName, setPreferredName] = useState('')
  const [occupation, setOccupation] = useState('')
  const [division, setDivision] = useState('')
  const [staffId, setStaffId] = useState('')
  const [title, setTitle] = useState('Research Assistant')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [editorSource, setEditorSource] = useState<AvatarSource | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  // Lab details (supabase/accounts.sql); empty until that file is installed.
  const [labRole, setLabRole] = useState('')
  const [cohort, setCohort] = useState<number | null>(null)
  const [researchTopic, setResearchTopic] = useState('')

  // Personalization (AI Assistant)
  const [aboutMe, setAboutMe] = useState('')
  const [instructions, setInstructions] = useState('')
  const [aiModel, setAiModel] = useState(AI_MODELS[0].id)
  const [aiLanguage, setAiLanguage] = useState('auto')
  const [aiStyle, setAiStyle] = useState('balanced')
  const [prefsSaving, setPrefsSaving] = useState(false)
  const [prefsSaved, setPrefsSaved] = useState(false)

  // Account / security
  const [newEmail, setNewEmail] = useState('')
  const [emailMsg, setEmailMsg] = useState<string | null>(null)
  const [emailBusy, setEmailBusy] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null)
  const [passwordBusy, setPasswordBusy] = useState(false)

  // Chat history (AI Assistant)
  const [convCount, setConvCount] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true
    void Promise.all([
      getProfile(),
      AI_ASSISTANT_ENABLED ? countConversations() : Promise.resolve(0),
    ]).then(([profile, count]) => {
      if (!active) return
      if (profile) {
        setFullName(profile.full_name ?? '')
        setPreferredName(profile.preferred_name ?? '')
        setOccupation(profile.occupation ?? '')
        setDivision(profile.division ?? '')
        setStaffId(profile.staff_id ?? '')
        setTitle(profile.title ?? 'Research Assistant')
        setAvatarUrl(profile.avatar_url ?? null)
        const lab = profile as AccountProfile
        setLabRole(lab.lab_role ?? '')
        setCohort(lab.cohort ?? null)
        setResearchTopic(lab.research_topic ?? '')
        setAboutMe(profile.about_me ?? '')
        setInstructions(profile.instructions ?? '')
        if (profile.ai_model) setAiModel(profile.ai_model)
        setAiLanguage(profile.ai_language ?? 'auto')
        setAiStyle(profile.ai_style ?? 'balanced')
      }
      setConvCount(count)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  const flash = (set: (v: boolean) => void) => {
    set(true)
    setTimeout(() => set(false), 2000)
  }

  const handleSaveProfile = async () => {
    if (!user) return
    setProfileSaving(true)
    await updateProfile(user.id, {
      full_name: fullName,
      preferred_name: preferredName,
      occupation,
      division,
      staff_id: staffId,
      title,
    })
    setProfileSaving(false)
    flash(setProfileSaved)
    void refreshAccount()
  }

  // A new file opens the crop dialog; nothing is uploaded until it is saved.
  const handleAvatar = (file: File | undefined) => {
    if (avatarInputRef.current) avatarInputRef.current.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setAvatarError('Choose an image file (PNG, JPG or WebP).')
      return
    }
    setAvatarError(null)
    setEditorSource((prev) => {
      if (prev?.file) URL.revokeObjectURL(prev.url)
      return { url: URL.createObjectURL(file), file }
    })
  }

  // Re-crop the current photo from the kept original (or the photo itself for
  // pictures uploaded before originals were kept).
  const handleAdjustAvatar = async () => {
    if (!user || !avatarUrl) return
    setAvatarBusy(true)
    const original = await avatarOriginalUrl(user.id)
    setAvatarBusy(false)
    setEditorSource(original ? { url: original, crop: cropFromUrl(avatarUrl) } : { url: avatarUrl })
  }

  const closeEditor = () => {
    setEditorSource((prev) => {
      if (prev?.file) URL.revokeObjectURL(prev.url)
      return null
    })
  }

  const handleSaveAvatar = async (cropped: Blob, crop: AvatarCrop, original?: File) => {
    if (!user) return 'Not signed in'
    const { url, error } = await saveAvatar(user.id, cropped, crop, original)
    if (error || !url) return error ?? 'Could not save the photo.'
    setAvatarUrl(url)
    closeEditor()
    void refreshAccount()
    return null
  }

  const handleRemoveAvatar = async () => {
    if (!user) return
    if (!confirmRemove) {
      setConfirmRemove(true)
      return
    }
    setAvatarBusy(true)
    setAvatarError(null)
    const { error } = await removeAvatar(user.id)
    setAvatarBusy(false)
    setConfirmRemove(false)
    if (error) setAvatarError(error)
    else {
      setAvatarUrl(null)
      void refreshAccount()
    }
  }

  const handleSavePrefs = async () => {
    if (!user) return
    setPrefsSaving(true)
    await updateProfile(user.id, {
      about_me: aboutMe,
      instructions,
      ai_model: aiModel,
      ai_language: aiLanguage,
      ai_style: aiStyle,
    })
    setPrefsSaving(false)
    flash(setPrefsSaved)
  }

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) return
    setEmailBusy(true)
    setEmailMsg(null)
    const { error } = await changeEmail(newEmail.trim())
    setEmailBusy(false)
    setEmailMsg(error ? error : 'Confirmation sent. Check the new inbox to finish the change.')
    if (!error) setNewEmail('')
  }

  const handleChangePassword = async () => {
    setPasswordMsg(null)
    if (newPassword.length < 8) {
      setPasswordMsg('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg('Passwords do not match.')
      return
    }
    setPasswordBusy(true)
    const { error } = await changePassword(newPassword)
    setPasswordBusy(false)
    setPasswordMsg(error ?? 'Password updated.')
    if (!error) {
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  const handleExport = async () => {
    const rows = await exportConversations()
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'smartagri-chat-history.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleDeleteAll = async () => {
    if (!user) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    await deleteAllConversations(user.id)
    setDeleting(false)
    setConfirmDelete(false)
    setConvCount(0)
  }

  const initial = (fullName.trim()[0] || user?.email?.[0] || 'S').toUpperCase()
  const displayName = fullName.trim() || user?.email?.split('@')[0] || 'Research assistant'
  const strength =
    newPassword.length === 0 ? 0 : newPassword.length < 8 ? 1 : newPassword.length < 10 ? 2 : 3

  return (
    <>
      {/* Masthead */}
      <section className="mx-auto max-w-[1360px] px-6 pb-8 pt-12 md:px-12 md:pb-12 md:pt-16">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`flex items-center gap-2 text-[#14919B] ${META}`}
          style={body}
        >
          <span className="h-1.5 w-1.5 bg-[#45DFB1]" aria-hidden="true" />
          Account
        </motion.p>
        <motion.h1
          initial="hidden"
          animate="show"
          className="mt-5 text-[44px] font-semibold leading-[1.0] tracking-[-0.04em] text-neutral-900 sm:text-6xl md:text-[72px]"
          style={display}
        >
          <MaskLine delay={0}>
            Profile &amp; <span style={accent}>settings.</span>
          </MaskLine>
        </motion.h1>
      </section>

      <section className="mx-auto grid max-w-[1360px] gap-8 px-6 pb-20 md:px-12 md:pb-28 lg:grid-cols-12 lg:gap-10">
        <aside className="lg:col-span-4">
          <div className="flex flex-col gap-4 lg:sticky lg:top-[110px]">
            {/* Who is signed in */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7, ease: EASE }}
              data-header-theme="dark"
              className="relative overflow-hidden rounded-[24px] bg-[#08313A] p-5 text-white shadow-[0_24px_50px_-30px_rgba(8,49,58,0.6)]"
            >
              <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-20 h-48 w-48 rounded-full bg-[#14919B]/45 blur-3xl" />
              <div className="relative flex items-center gap-4">
                <div className="relative shrink-0">
                  <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-[#45DFB1] text-2xl font-semibold text-[#08313A] ring-2 ring-white/15">
                    {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initial}
                  </span>
                  <button
                    type="button"
                    onClick={() => (avatarUrl ? void handleAdjustAvatar() : avatarInputRef.current?.click())}
                    disabled={!user || avatarBusy}
                    aria-label={avatarUrl ? 'Adjust profile photo' : 'Add profile photo'}
                    className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-white text-[#0B6477] shadow-md ring-2 ring-[#08313A] transition-colors hover:bg-[#80ED99] hover:text-[#08313A]"
                  >
                    {avatarBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold tracking-[-0.02em]" style={display}>
                    {loading ? '...' : displayName}
                  </p>
                  <p className="truncate text-sm text-white/60" style={body}>
                    {preferredName.trim() && preferredName.trim() !== displayName ? `Goes by ${preferredName.trim()}` : title}
                  </p>
                </div>
              </div>

              <div className="relative mt-4 flex flex-wrap gap-1.5">
                {account && account.status !== 'active' ? (
                  <span className={`inline-flex items-center gap-1 rounded-full bg-[#F2B84B]/15 px-2.5 py-1 text-[#F2B84B] ${META}`} style={body}>
                    <Clock className="h-3.5 w-3.5" /> {account.status === 'pending' ? 'Pending approval' : 'Not active'}
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1 rounded-full bg-[#45DFB1]/15 px-2.5 py-1 text-[#45DFB1] ${META}`} style={body}>
                    <BadgeCheck className="h-3.5 w-3.5" /> Lab member
                  </span>
                )}
                {account?.isAdmin && (
                  <span className={`inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-white ${META}`} style={body}>
                    <ShieldCheck className="h-3.5 w-3.5 text-[#45DFB1]" /> Admin
                  </span>
                )}
                {[labRoleLabel(labRole), division, isStudentRole(labRole) && cohort ? `Cohort ${cohort}` : '']
                  .filter(Boolean)
                  .map((t) => (
                    <span key={t as string} className={`rounded-full border border-white/15 px-2.5 py-1 text-white/85 ${META}`} style={body}>
                      {t}
                    </span>
                  ))}
              </div>
              {researchTopic && (
                <p className="relative mt-3 line-clamp-2 text-sm leading-relaxed text-white/70" style={body}>
                  <span className="text-[#45DFB1]">Research · </span>
                  {researchTopic}
                </p>
              )}
              <p className="relative mt-3 flex min-w-0 items-center gap-1.5 text-[13px] text-white/55" style={body}>
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{user?.email ?? 'Not signed in'}</span>
              </p>

              <div className="relative mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
                <Link
                  to="/kanban"
                  className={`inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-white transition-colors hover:bg-[#45DFB1] hover:text-[#08313A] ${META}`}
                  style={body}
                >
                  <SquareKanban className="h-3.5 w-3.5" />
                  Kanban
                </Link>
                <Link
                  to="/inventory"
                  className={`inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-white transition-colors hover:bg-[#45DFB1] hover:text-[#08313A] ${META}`}
                  style={body}
                >
                  <Boxes className="h-3.5 w-3.5" />
                  Inventory
                </Link>
              </div>
              <p className={`relative mt-3 text-center text-white/40 ${META}`} style={body}>
                Last sign-in {formatDate(user?.last_sign_in_at)}
              </p>
            </motion.div>

            {/* Section tabs */}
            <nav aria-label="Settings sections" className="rounded-2xl border border-[#0B6477]/10 bg-white/80 p-1.5 backdrop-blur">
              <ul role="tablist" className="flex gap-1 overflow-x-auto [scrollbar-width:none] lg:flex-col [&::-webkit-scrollbar]:hidden">
                {tabs.map((s) => {
                  const on = s.id === active
                  return (
                    <li key={s.id} className="relative shrink-0">
                      {on && (
                        <motion.span
                          layoutId="account-section"
                          className="absolute inset-0 rounded-xl bg-[#08313A]"
                          transition={{ duration: 0.45, ease: EASE }}
                        />
                      )}
                      <button
                        type="button"
                        role="tab"
                        aria-selected={on}
                        onClick={() => selectTab(s.id)}
                        className={`relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
                          on ? 'text-white' : 'text-neutral-600 hover:bg-[#F3F7F6] hover:text-neutral-900'
                        }`}
                        style={body}
                      >
                        <s.icon className={`h-4 w-4 ${on ? 'text-[#45DFB1]' : 'text-[#14919B]'}`} />
                        {s.label}
                        {s.id === 'members' && pendingCount > 0 && (
                          <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-[#F2B84B] px-1.5 text-[11px] font-semibold text-[#3A2600]">
                            {pendingCount}
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </div>
        </aside>

        <div className="flex flex-col gap-6 lg:col-span-8">
          {!isConfigured && (
            <p
              className="rounded-2xl border border-dashed border-[#0B6477]/25 bg-white/80 px-5 py-4 text-sm text-neutral-500"
              style={body}
            >
              Authentication is not configured on this environment, so changes cannot be saved here.
            </p>
          )}

          {loading ? (
            <div className="flex items-center gap-2 py-10 text-neutral-500">
              <Loader2 className="h-5 w-5 animate-spin text-[#0B6477]" />
              <span className="text-sm" style={body}>
                Loading your profile...
              </span>
            </div>
          ) : (
            <>
              {isAdmin && active === 'members' && (
                <Card
                  current={active}
                  id="members"
                  icon={Users}
                  title="Lab members"
                  desc="Approve new accounts, choose the boards they join, and manage access and admins."
                >
                  <LabMembers selfId={user?.id ?? null} onPendingCount={setPendingCount} />
                </Card>
              )}
              <Card current={active} id="profile" icon={UserRound} title="Profile" desc="Shown to the smartagri research team.">
                <div className="flex flex-col gap-5 rounded-2xl border border-[#0B6477]/8 bg-[#F7FAF9] p-5 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => (avatarUrl ? void handleAdjustAvatar() : avatarInputRef.current?.click())}
                    disabled={!user || avatarBusy}
                    className="group relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full bg-[#0B6477] text-3xl font-semibold text-[#45DFB1] ring-4 ring-white"
                    aria-label={avatarUrl ? 'Adjust profile photo' : 'Add profile photo'}
                  >
                    {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initial}
                    <span className="absolute inset-0 grid place-items-center bg-[#08313A]/55 text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <Camera className="h-5 w-5" />
                    </span>
                  </button>
                  <div className="flex min-w-0 flex-col gap-3">
                    <div>
                      <p className="text-[15px] font-medium text-neutral-900" style={body}>
                        Profile photo
                      </p>
                      <p className="mt-0.5 text-sm text-neutral-500" style={body}>
                        PNG, JPG or WebP up to 10 MB. Drag and zoom to fit it in the circle.
                      </p>
                    </div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => handleAvatar(e.target.files?.[0])}
                    />
                    <div className="flex flex-wrap gap-2">
                      <SecondaryButton onClick={() => avatarInputRef.current?.click()} disabled={avatarBusy || !user}>
                        <Upload className="h-4 w-4" />
                        {avatarUrl ? 'Upload new' : 'Upload photo'}
                      </SecondaryButton>
                      {avatarUrl && (
                        <>
                          <SecondaryButton onClick={() => void handleAdjustAvatar()} disabled={avatarBusy || !user}>
                            {avatarBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crop className="h-4 w-4" />}
                            Adjust size
                          </SecondaryButton>
                          <SecondaryButton danger onClick={() => void handleRemoveAvatar()} disabled={avatarBusy || !user}>
                            <Trash2 className="h-4 w-4" />
                            {confirmRemove ? 'Click again to remove' : 'Remove'}
                          </SecondaryButton>
                        </>
                      )}
                    </div>
                    {avatarError && (
                      <span className="text-xs text-[#B91C1C]" style={body}>
                        {avatarError}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Full name">
                    <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Athala Fawwaz" className={inputClass} style={body} />
                  </Field>
                  <Field label="Preferred name">
                    <input value={preferredName} onChange={(e) => setPreferredName(e.target.value)} placeholder="e.g. Atha" className={inputClass} style={body} />
                  </Field>
                  <Field label="Role / title">
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Research Assistant" className={inputClass} style={body} />
                  </Field>
                  <Field label="Division / lab">
                    <input value={division} onChange={(e) => setDivision(e.target.value)} placeholder="e.g. Smart Estate" className={inputClass} style={body} />
                  </Field>
                  <Field label="Work focus">
                    <input value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="e.g. Precision agriculture, IoT sensing" className={inputClass} style={body} />
                  </Field>
                  <Field label="Student / staff ID">
                    <input value={staffId} onChange={(e) => setStaffId(e.target.value)} placeholder="e.g. 21/123456/TK/00000" className={inputClass} style={body} />
                  </Field>
                </div>
                <SaveButton onClick={() => void handleSaveProfile()} saving={profileSaving} saved={profileSaved} disabled={!user} />
              </Card>

              {AI_ASSISTANT_ENABLED && (
                <Card
                  current={active}
                  id="personalization"
                  icon={Sparkles}
                  title="Personalization"
                  desc="Help the assistant tailor its replies. Applied across your chats."
                >
                  <Field label="About you">
                    <textarea
                      value={aboutMe}
                      onChange={(e) => setAboutMe(e.target.value)}
                      maxLength={1500}
                      rows={3}
                      placeholder="Your research focus, background, and what you're working on."
                      className={`${inputClass} min-h-[96px] resize-y`}
                      style={body}
                    />
                  </Field>
                  <Field label="Instructions for the assistant">
                    <textarea
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      maxLength={1500}
                      rows={3}
                      placeholder="e.g. Prefer concise answers. Use Indonesian for summaries."
                      className={`${inputClass} min-h-[96px] resize-y`}
                      style={body}
                    />
                  </Field>
                  <div className="grid gap-5 sm:grid-cols-3">
                    <Field label="Default model">
                      <select value={aiModel} onChange={(e) => setAiModel(e.target.value)} className={`${inputClass} cursor-pointer`} style={body}>
                        {AI_MODELS.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Response language">
                      <select value={aiLanguage} onChange={(e) => setAiLanguage(e.target.value)} className={`${inputClass} cursor-pointer`} style={body}>
                        {LANGUAGES.map((l) => (
                          <option key={l.value} value={l.value}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Response style">
                      <select value={aiStyle} onChange={(e) => setAiStyle(e.target.value)} className={`${inputClass} cursor-pointer`} style={body}>
                        {STYLES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <SaveButton onClick={() => void handleSavePrefs()} saving={prefsSaving} saved={prefsSaved} disabled={!user} label="Save preferences" />
                </Card>
              )}

              <Card current={active} id="account" icon={Mail} title="Account" desc="Your sign-in email and account details.">
                <div className="grid gap-px overflow-hidden rounded-2xl border border-[#0B6477]/12 bg-[#0B6477]/12 sm:grid-cols-3">
                  {[
                    { label: 'Current email', value: user?.email ?? '-' },
                    { label: 'Joined', value: formatDate(user?.created_at) },
                    { label: 'Last sign-in', value: formatDate(user?.last_sign_in_at) },
                  ].map((f) => (
                    <div key={f.label} className="flex min-w-0 flex-col gap-1.5 bg-white p-4">
                      <span className={`text-neutral-400 ${META}`} style={body}>
                        {f.label}
                      </span>
                      <span className="truncate text-[15px] text-neutral-800" style={body}>
                        {f.value}
                      </span>
                    </div>
                  ))}
                </div>
                <Field label="Change email" hint="We send a confirmation link to the new address.">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="new.email@ugm.ac.id"
                      className={inputClass}
                      style={body}
                    />
                    <SecondaryButton onClick={() => void handleChangeEmail()} disabled={emailBusy || !user}>
                      {emailBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update email'}
                    </SecondaryButton>
                  </div>
                </Field>
                {emailMsg && (
                  <p className="text-sm text-[#0B6477]" style={body}>
                    {emailMsg}
                  </p>
                )}
              </Card>

              <Card current={active} id="security" icon={Lock} title="Security" desc="Update your password.">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="New password">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      className={inputClass}
                      style={body}
                    />
                  </Field>
                  <Field label="Confirm password">
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                      className={inputClass}
                      style={body}
                    />
                  </Field>
                </div>
                {/* Length meter */}
                <div className="flex items-center gap-3">
                  <div className="grid flex-1 grid-cols-3 gap-1.5">
                    {[1, 2, 3].map((n) => (
                      <span key={n} className="h-1.5 overflow-hidden rounded-full bg-[#0B6477]/10">
                        <motion.span
                          className={`block h-full rounded-full ${strength === 1 ? 'bg-[#F59E0B]' : 'bg-[#45DFB1]'}`}
                          initial={false}
                          animate={{ width: strength >= n ? '100%' : '0%' }}
                          transition={{ duration: 0.35, ease: EASE }}
                        />
                      </span>
                    ))}
                  </div>
                  <span className={`w-16 text-right text-neutral-400 ${META}`} style={body}>
                    {['', 'Short', 'Okay', 'Strong'][strength]}
                  </span>
                </div>
                {passwordMsg && (
                  <p
                    className={`text-sm ${passwordMsg.includes('updated') ? 'text-[#0B6477]' : 'text-[#B91C1C]'}`}
                    style={body}
                  >
                    {passwordMsg}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => void handleChangePassword()}
                  disabled={passwordBusy || !user}
                  className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-lg bg-[#08313A] px-5 text-sm font-medium uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#0B6477] disabled:opacity-60"
                  style={body}
                >
                  {passwordBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4 text-[#45DFB1]" />}
                  Update password
                </button>
              </Card>

              {AI_ASSISTANT_ENABLED && (
                <Card
                  current={active}
                  id="history"
                  icon={MessageSquare}
                  title="Chat history"
                  desc="Your AI Assistant conversations are stored privately to your account."
                >
                  <p className="text-[15px] text-neutral-600" style={body}>
                    You have <span className="font-semibold text-neutral-900">{convCount}</span> saved{' '}
                    {convCount === 1 ? 'conversation' : 'conversations'}.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <SecondaryButton onClick={() => void handleExport()}>
                      <Download className="h-4 w-4" /> Export JSON
                    </SecondaryButton>
                    <SecondaryButton onClick={() => void handleDeleteAll()} disabled={deleting || !user} danger>
                      {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      {confirmDelete ? 'Click again to confirm' : 'Delete all chats'}
                    </SecondaryButton>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </section>
      <AvatarEditor
        source={editorSource}
        onClose={closeEditor}
        onPickFile={() => avatarInputRef.current?.click()}
        onSave={handleSaveAvatar}
      />
    </>
  )
}
