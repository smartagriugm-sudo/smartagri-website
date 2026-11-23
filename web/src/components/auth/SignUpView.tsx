import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { AtSign, KeyRound, Loader2, MailOpen, UserRound } from 'lucide-react'
import { isAuthConfigured, supabase } from '../../lib/auth/supabase'
import { useAuth } from '../../lib/auth/auth'
import { DEFAULT_SIGNED_IN_PATH } from '../../lib/features'
import { confirmRedirectUrl } from '../../lib/auth/redirects'
import { AGROSPHERE_HOME, AGROSPHERE_SIGNUP } from '../../lib/agrosphere'
import ResendConfirmation from '../ResendConfirmation'
import AuthShell, { AUTH_BUTTON, AuthInput, type AuthBrand } from '../AuthShell'
import { useLang, useT } from '../../lib/i18n'
import { authErrorText } from './authErrors'

// The sign-up form for both brands: /sign-up (smartagri, for lab members) and
// /agrosphere/sign-up (for partners). Both create the same kind of account, which a
// lab admin approves; an agrosphere account is marked so onboarding suggests Partner.
const COPY = {
  smartagri: {
    title: { en: 'Join the', id: 'Bergabung dengan' },
    accentWord: { en: 'lab', id: 'lab' },
    subtitle: {
      en: 'Create a SmartAgri account. A lab admin approves new accounts before the internal tools open.',
      id: 'Buat akun SmartAgri. Admin lab menyetujui setiap akun baru sebelum fitur internal dapat dibuka.',
    },
    namePlaceholder: { en: 'As on your student or staff card', id: 'Sesuai kartu mahasiswa atau kartu pegawai' },
    emailPlaceholder: { en: 'you@ugm.ac.id', id: 'anda@ugm.ac.id' },
    afterConfirm: {
      en: 'After confirming you complete your profile, then a lab admin approves the account.',
      id: 'Setelah konfirmasi, Anda melengkapi profil, lalu admin lab menyetujui akun Anda.',
    },
    home: DEFAULT_SIGNED_IN_PATH,
  },
  agrosphere: {
    title: { en: 'Request', id: 'Ajukan' },
    accentWord: { en: 'access', id: 'akses' },
    subtitle: {
      en: 'Create a partner account. A smartagri admin approves it and chooses which dashboards it can open.',
      id: 'Buat akun mitra. Admin smartagri akan menyetujuinya dan memilih dashboard yang dapat dibuka.',
    },
    namePlaceholder: { en: 'Your full name', id: 'Nama lengkap Anda' },
    emailPlaceholder: { en: 'you@company.com', id: 'anda@perusahaan.com' },
    afterConfirm: {
      en: 'After confirming you complete your profile, then a smartagri admin approves the account and gives it access.',
      id: 'Setelah konfirmasi, Anda melengkapi profil, lalu admin smartagri menyetujui akun Anda dan memberinya akses.',
    },
    home: AGROSPHERE_HOME,
  },
} as const

export default function SignUpView({ brand, redirect }: { brand: AuthBrand; redirect?: string }) {
  const copy = COPY[brand]
  const lang = useLang()
  const t = useT()
  const { user, loading } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const target = redirect ?? copy.home

  useEffect(() => {
    if (!loading && user) window.location.assign(target)
  }, [loading, user, target])

  const handleSubmit = async () => {
    if (!supabase) {
      setError(t({ en: 'Authentication is not configured yet.', id: 'Autentikasi belum dikonfigurasi.' }))
      return
    }
    if (fullName.trim().length < 3) {
      setError(t({ en: 'Enter your full name.', id: 'Isi nama lengkap Anda.' }))
      return
    }
    if (password.length < 8) {
      setError(t({ en: 'Password must be at least 8 characters.', id: 'Kata sandi minimal 8 karakter.' }))
      return
    }
    if (password !== confirm) {
      setError(t({ en: 'Passwords do not match.', id: 'Kata sandi tidak cocok.' }))
      return
    }
    if (!agreed) {
      setError(
        t({
          en: 'Please accept the Terms of Use and Privacy Policy.',
          id: 'Silakan setujui Ketentuan Penggunaan dan Kebijakan Privasi.',
        }),
      )
      return
    }
    setSubmitting(true)
    setError(null)
    setSentTo(null)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // Copied into the profile by handle_new_user (supabase/accounts.sql).
        // signup_via lets onboarding suggest the Partner role for an agrosphere sign-up.
        data: brand === 'agrosphere' ? { full_name: fullName.trim(), signup_via: AGROSPHERE_SIGNUP } : { full_name: fullName.trim() },
        // The link in the confirmation email comes back to this site, then to this brand's home.
        emailRedirectTo: confirmRedirectUrl(brand === 'agrosphere' ? target : redirect),
      },
    })
    setSubmitting(false)
    if (signUpError) {
      setError(authErrorText(signUpError.message, lang))
      return
    }
    // If email confirmation is on, there is no session yet.
    if (data.session) {
      window.location.assign(target)
    } else {
      setSentTo(email.trim())
    }
  }

  return (
    <AuthShell
      brand={brand}
      title={t(copy.title)}
      accentWord={t(copy.accentWord)}
      subtitle={t(copy.subtitle)}
      footer={
        <p>
          {t({ en: 'Already have an account?', id: 'Sudah punya akun?' })}{' '}
          <Link
            to={brand === 'agrosphere' ? '/agrosphere/sign-in' : '/sign-in'}
            search={{ redirect }}
            className="font-medium text-[#0B6477] hover:underline"
          >
            {t({ en: 'Sign in', id: 'Masuk' })}
          </Link>
        </p>
      }
    >
      {!isAuthConfigured ? (
        <p className="rounded-xl bg-[#F3F7F6] px-4 py-3 text-sm text-neutral-500">
          {t({
            en: 'Sign-up is not configured yet. Please contact the SmartAgri team.',
            id: 'Fitur pendaftaran belum dikonfigurasi. Silakan hubungi tim SmartAgri.',
          })}
        </p>
      ) : sentTo ? (
        <div className="flex flex-col gap-6" role="status">
          <div className="flex items-start gap-4 rounded-2xl border border-[#14919B]/20 bg-[#45DFB1]/10 p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#0B6477] text-[#45DFB1]">
              <MailOpen className="h-5 w-5" />
            </span>
            <div className="min-w-0 text-sm leading-relaxed">
              <p className="font-medium text-neutral-900">{t({ en: 'Check your inbox', id: 'Periksa kotak masuk Anda' })}</p>
              <p className="text-neutral-600">
                {t({ en: 'We sent a confirmation link to', id: 'Kami telah mengirim tautan konfirmasi ke' })}{' '}
                <span className="font-medium text-[#0B6477]">{sentTo}</span>
                {t({
                  en: '. Open it on this device to activate your account.',
                  id: '. Buka tautan tersebut di perangkat ini untuk mengaktifkan akun Anda.',
                })}
              </p>
            </div>
          </div>
          <ul className="flex flex-col gap-2 text-sm text-neutral-500">
            <li>
              ·{' '}
              {t({
                en: 'The link works once and expires after a while, so open it soon.',
                id: 'Tautan hanya berlaku sekali dan akan kedaluwarsa, jadi segera buka.',
              })}
            </li>
            <li>
              ·{' '}
              {t({
                en: 'Not there after a few minutes? Check the spam or promotions folder.',
                id: 'Belum masuk setelah beberapa menit? Periksa folder spam atau promosi.',
              })}
            </li>
            <li>· {t(copy.afterConfirm)}</li>
          </ul>
          <ResendConfirmation redirect={brand === 'agrosphere' ? target : redirect} initialEmail={sentTo} />
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="w-fit text-sm font-medium text-[#0B6477] hover:underline"
          >
            {t({ en: 'Used the wrong email? Start over', id: 'Salah memasukkan email? Ulangi dari awal' })}
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void handleSubmit()
          }}
          className="flex flex-col gap-4"
        >
          <AuthInput
            icon={UserRound}
            label={t({ en: 'Full name', id: 'Nama lengkap' })}
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t(copy.namePlaceholder)}
          />
          <AuthInput
            icon={AtSign}
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t(copy.emailPlaceholder)}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AuthInput
              icon={KeyRound}
              label={t({ en: 'Password', id: 'Kata sandi' })}
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t({ en: '8+ characters', id: 'Minimal 8 karakter' })}
            />
            <AuthInput
              icon={KeyRound}
              label={t({ en: 'Confirm password', id: 'Konfirmasi kata sandi' })}
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={t({ en: 'Re-enter', id: 'Ketik ulang' })}
            />
          </div>

          <label className="flex items-start gap-2.5 text-sm text-neutral-600">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#14919B]"
            />
            <span>
              {t({ en: 'I agree to the', id: 'Saya menyetujui' })}{' '}
              <Link to="/terms-of-use" className="font-medium text-[#0B6477] hover:underline">
                {t({ en: 'Terms of Use', id: 'Ketentuan Penggunaan' })}
              </Link>{' '}
              {t({ en: 'and', id: 'dan' })}{' '}
              <Link to="/privacy-policy" className="font-medium text-[#0B6477] hover:underline">
                {t({ en: 'Privacy Policy', id: 'Kebijakan Privasi' })}
              </Link>
              .
            </span>
          </label>

          {error && (
            <p className="text-sm text-[#B91C1C]" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className={`mt-1 ${AUTH_BUTTON}`}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t({ en: 'Creating account...', id: 'Membuat akun...' })}
              </>
            ) : (
              t({ en: 'Create account', id: 'Buat akun' })
            )}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
