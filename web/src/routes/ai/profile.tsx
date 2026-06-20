import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Check, Download, Loader2, Lock, Mail, Trash2, Upload } from 'lucide-react'
import { useAuth } from '../../lib/auth/auth'
import { AI_MODELS } from '../../lib/ai/models'
import {
  changeEmail,
  changePassword,
  countConversations,
  deleteAllConversations,
  exportConversations,
  getProfile,
  updateProfile,
  uploadAvatar,
} from '../../lib/profile'
import { accent, body, display } from '../../lib/fonts'
import SiteHeader from '../../components/SiteHeader'
import Footer from '../../components/Footer'

export const Route = createFileRoute('/ai/profile')({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: 'Profile | smartagri' },
      { name: 'robots', content: 'noindex, nofollow' },
      { name: 'description', content: 'Research assistant profile settings.' },
    ],
  }),
})

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

const inputClass =
  'w-full rounded-xl border border-[#0B6477]/20 bg-white px-3 py-2.5 text-[15px] text-neutral-800 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#0B6477]'
const labelClass = 'text-sm font-medium text-neutral-700'

function Card({
  title,
  desc,
  children,
}: {
  title: string
  desc?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-3xl border border-[#0B6477]/10 bg-white p-6 md:p-7">
      <h2
        className="text-lg font-semibold tracking-[-0.02em] text-neutral-900"
        style={display}
      >
        {title}
      </h2>
      {desc && (
        <p className="mt-1 text-sm text-neutral-500" style={body}>
          {desc}
        </p>
      )}
      <div className="mt-5 flex flex-col gap-4">{children}</div>
    </section>
  )
}

function SaveButton({
  onClick,
  saving,
  saved,
  label = 'Save changes',
}: {
  onClick: () => void
  saving: boolean
  saved: boolean
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-[#45DFB1] px-5 py-2.5 text-sm font-medium text-[#0B2A22] transition-colors hover:bg-[#80ED99] disabled:cursor-not-allowed disabled:opacity-60"
      style={body}
    >
      {saving ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Saving...
        </>
      ) : saved ? (
        <>
          <Check className="h-4 w-4" /> Saved
        </>
      ) : (
        label
      )}
    </button>
  )
}

function formatDate(value?: string) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return '—'
  }
}

function ProfilePage() {
  const { user, isConfigured } = useAuth()

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
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Personalization
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

  // Chat history
  const [convCount, setConvCount] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true
    void Promise.all([getProfile(), countConversations()]).then(
      ([profile, count]) => {
        if (!active) return
        if (profile) {
          setFullName(profile.full_name ?? '')
          setPreferredName(profile.preferred_name ?? '')
          setOccupation(profile.occupation ?? '')
          setDivision(profile.division ?? '')
          setStaffId(profile.staff_id ?? '')
          setTitle(profile.title ?? 'Research Assistant')
          setAvatarUrl(profile.avatar_url ?? null)
          setAboutMe(profile.about_me ?? '')
          setInstructions(profile.instructions ?? '')
          if (profile.ai_model) setAiModel(profile.ai_model)
          setAiLanguage(profile.ai_language ?? 'auto')
          setAiStyle(profile.ai_style ?? 'balanced')
        }
        setConvCount(count)
        setLoading(false)
      },
    )
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
      avatar_url: avatarUrl,
    })
    setProfileSaving(false)
    flash(setProfileSaved)
  }

  const handleAvatar = async (file: File | undefined) => {
    if (!file || !user) return
    setAvatarBusy(true)
    const { url, error } = await uploadAvatar(user.id, file)
    if (url) {
      setAvatarUrl(url)
      await updateProfile(user.id, { avatar_url: url })
    } else if (error) {
      setEmailMsg(null)
    }
    setAvatarBusy(false)
    if (avatarInputRef.current) avatarInputRef.current.value = ''
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
    setEmailMsg(
      error
        ? error
        : 'Confirmation sent. Check the new inbox to finish the change.',
    )
    if (!error) setNewEmail('')
  }

  const handleChangePassword = async () => {
    setPasswordMsg(null)
    if (newPassword.length < 6) {
      setPasswordMsg('Password must be at least 6 characters.')
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
    const blob = new Blob([JSON.stringify(rows, null, 2)], {
      type: 'application/json',
    })
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
              Account
            </div>
            <h1
              className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-neutral-900 md:text-4xl"
              style={display}
            >
              Your <span style={accent}>profile</span>
            </h1>
            <p className="mt-2 text-sm text-neutral-500" style={body}>
              Manage your research assistant identity, preferences, and account.
            </p>
          </div>

          {!isConfigured && (
            <p
              className="mb-6 rounded-2xl border border-[#0B6477]/10 bg-white px-4 py-3 text-sm text-neutral-500"
              style={body}
            >
              Authentication is not configured, so profile changes can't be
              saved here.
            </p>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-neutral-500">
              <Loader2 className="h-5 w-5 animate-spin text-[#0B6477]" />
              <span className="text-sm" style={body}>
                Loading your profile...
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Identity */}
              <Card title="Profile" desc="Shown to the SmartAgri research team.">
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0B6477] text-2xl font-semibold text-[#45DFB1]">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initial
                    )}
                  </div>
                  <div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => void handleAvatar(e.target.files?.[0])}
                    />
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarBusy || !user}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#0B6477]/20 px-3.5 py-2 text-sm font-medium text-neutral-700 transition-colors hover:border-[#0B6477] hover:text-[#0B6477] disabled:opacity-60"
                      style={body}
                    >
                      {avatarBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Upload photo
                    </button>
                    <p className="mt-1.5 text-xs text-neutral-400" style={body}>
                      PNG, JPG, or WebP.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass} style={body}>
                      Full name
                    </label>
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Athala Fawwaz"
                      className={inputClass}
                      style={body}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass} style={body}>
                      What should the assistant call you?
                    </label>
                    <input
                      value={preferredName}
                      onChange={(e) => setPreferredName(e.target.value)}
                      placeholder="e.g. Atha"
                      className={inputClass}
                      style={body}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass} style={body}>
                      Role / title
                    </label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Research Assistant"
                      className={inputClass}
                      style={body}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass} style={body}>
                      Division / lab
                    </label>
                    <input
                      value={division}
                      onChange={(e) => setDivision(e.target.value)}
                      placeholder="e.g. Smart Estate"
                      className={inputClass}
                      style={body}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass} style={body}>
                      Work focus
                    </label>
                    <input
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      placeholder="e.g. Precision agriculture, IoT sensing"
                      className={inputClass}
                      style={body}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass} style={body}>
                      Student / staff ID
                    </label>
                    <input
                      value={staffId}
                      onChange={(e) => setStaffId(e.target.value)}
                      placeholder="e.g. 21/123456/TK/00000"
                      className={inputClass}
                      style={body}
                    />
                  </div>
                </div>
                <SaveButton
                  onClick={() => void handleSaveProfile()}
                  saving={profileSaving}
                  saved={profileSaved}
                />
              </Card>

              {/* Personalization */}
              <Card
                title="Personalization"
                desc="Help the assistant tailor its replies. Applied across your chats."
              >
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass} style={body}>
                    About you
                  </label>
                  <textarea
                    value={aboutMe}
                    onChange={(e) => setAboutMe(e.target.value)}
                    maxLength={1500}
                    rows={3}
                    placeholder="Your research focus, background, and what you're working on. The assistant keeps this in mind across chats."
                    className={`${inputClass} min-h-[84px] resize-y`}
                    style={body}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass} style={body}>
                    Instructions for the assistant
                  </label>
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    maxLength={1500}
                    rows={3}
                    placeholder="e.g. Prefer concise answers. Use Indonesian for summaries. Cite methods and sources where possible."
                    className={`${inputClass} min-h-[84px] resize-y`}
                    style={body}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass} style={body}>
                      Default model
                    </label>
                    <select
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                      className={`${inputClass} cursor-pointer`}
                      style={body}
                    >
                      {AI_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass} style={body}>
                      Response language
                    </label>
                    <select
                      value={aiLanguage}
                      onChange={(e) => setAiLanguage(e.target.value)}
                      className={`${inputClass} cursor-pointer`}
                      style={body}
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass} style={body}>
                      Response style
                    </label>
                    <select
                      value={aiStyle}
                      onChange={(e) => setAiStyle(e.target.value)}
                      className={`${inputClass} cursor-pointer`}
                      style={body}
                    >
                      {STYLES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <SaveButton
                  onClick={() => void handleSavePrefs()}
                  saving={prefsSaving}
                  saved={prefsSaved}
                  label="Save preferences"
                />
              </Card>

              {/* Account */}
              <Card title="Account" desc="Your sign-in email and account details.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <span className={labelClass} style={body}>
                      Current email
                    </span>
                    <div
                      className="flex items-center gap-2 rounded-xl bg-[#F3F7F6] px-3 py-2.5 text-[15px] text-neutral-700"
                      style={body}
                    >
                      <Mail className="h-4 w-4 text-neutral-400" />
                      {user?.email ?? '—'}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <span className={labelClass} style={body}>
                        Joined
                      </span>
                      <div
                        className="rounded-xl bg-[#F3F7F6] px-3 py-2.5 text-[13px] text-neutral-600"
                        style={body}
                      >
                        {formatDate(user?.created_at)}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className={labelClass} style={body}>
                        Last sign-in
                      </span>
                      <div
                        className="rounded-xl bg-[#F3F7F6] px-3 py-2.5 text-[13px] text-neutral-600"
                        style={body}
                      >
                        {formatDate(user?.last_sign_in_at)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass} style={body}>
                    Change email
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="new.email@ugm.ac.id"
                      className={inputClass}
                      style={body}
                    />
                    <button
                      type="button"
                      onClick={() => void handleChangeEmail()}
                      disabled={emailBusy || !user}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#0B6477]/20 px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:border-[#0B6477] hover:text-[#0B6477] disabled:opacity-60"
                      style={body}
                    >
                      {emailBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Update email'
                      )}
                    </button>
                  </div>
                  {emailMsg && (
                    <p className="text-xs text-[#0B6477]" style={body}>
                      {emailMsg}
                    </p>
                  )}
                </div>
              </Card>

              {/* Security */}
              <Card title="Security" desc="Update your password.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass} style={body}>
                      New password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className={inputClass}
                      style={body}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass} style={body}>
                      Confirm password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className={inputClass}
                      style={body}
                    />
                  </div>
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
                  className="inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-[#0B6477] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#14919B] disabled:opacity-60"
                  style={body}
                >
                  {passwordBusy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Updating...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" /> Update password
                    </>
                  )}
                </button>
              </Card>

              {/* Chat history */}
              <Card
                title="Chat history"
                desc="Your AI Assistant conversations are stored privately to your account."
              >
                <p className="text-sm text-neutral-600" style={body}>
                  You have{' '}
                  <span className="font-semibold text-neutral-900">
                    {convCount}
                  </span>{' '}
                  saved {convCount === 1 ? 'conversation' : 'conversations'}.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleExport()}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#0B6477]/20 px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:border-[#0B6477] hover:text-[#0B6477]"
                    style={body}
                  >
                    <Download className="h-4 w-4" /> Export JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteAll()}
                    disabled={deleting || !user}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#FECACA] px-4 py-2.5 text-sm font-medium text-[#B91C1C] transition-colors hover:bg-[#FEF2F2] disabled:opacity-60"
                    style={body}
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    {confirmDelete ? 'Click again to confirm' : 'Delete all chats'}
                  </button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </main>
  )
}
