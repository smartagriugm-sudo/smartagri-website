import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { AtSign, KeyRound, Loader2 } from 'lucide-react'
import { isAuthConfigured, supabase } from '../../lib/auth/supabase'
import { useAuth } from '../../lib/auth/auth'
import { DEFAULT_SIGNED_IN_PATH } from '../../lib/features'
import AuthShell, { AUTH_BUTTON, AuthInput, type AuthBrand } from '../AuthShell'
import { AGROSPHERE_HOME } from '../../lib/agrosphere'
import { useLang, useT } from '../../lib/i18n'
import { authErrorText } from './authErrors'

// The sign-in form for both brands: /sign-in (smartagri) and /agrosphere/sign-in.
// Same account and the same Supabase call; only the words and where it goes next differ.
const COPY = {
  smartagri: {
    subtitle: {
      en: 'Sign in to the SmartAgri internal tools: Kanban, instrument inventory and more.',
      id: 'Masuk ke fitur internal SmartAgri: Kanban, inventaris instrumen, dan lainnya.',
    },
    newPrompt: { en: 'New to the lab?', id: 'Baru di lab?' },
    newLink: { en: 'Create an account', id: 'Buat akun' },
    audience: { en: 'For SmartAgri lab members.', id: 'Untuk anggota lab SmartAgri.' },
    home: DEFAULT_SIGNED_IN_PATH,
  },
  agrosphere: {
    subtitle: {
      en: 'Sign in to open the dashboards your account was given. smartagri researchers use their smartagri account.',
      id: 'Masuk untuk membuka dashboard yang diberikan ke akun Anda. Peneliti smartagri memakai akun smartagri mereka.',
    },
    newPrompt: { en: 'New partner?', id: 'Mitra baru?' },
    newLink: { en: 'Request access', id: 'Ajukan akses' },
    audience: { en: 'For smartagri researchers and partners.', id: 'Untuk peneliti dan mitra smartagri.' },
    home: AGROSPHERE_HOME,
  },
} as const

export default function SignInView({ brand, redirect }: { brand: AuthBrand; redirect?: string }) {
  const copy = COPY[brand]
  const lang = useLang()
  const t = useT()
  const { user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const target = redirect ?? copy.home

  // Already signed in: go straight to the destination.
  useEffect(() => {
    if (!loading && user) window.location.assign(target)
  }, [loading, user, target])

  const handleSubmit = async () => {
    if (!supabase) {
      setError(t({ en: 'Authentication is not configured yet.', id: 'Autentikasi belum dikonfigurasi.' }))
      return
    }
    setSubmitting(true)
    setError(null)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (signInError) {
      setSubmitting(false)
      setError(authErrorText(signInError.message, lang))
      return
    }
    window.location.assign(target)
  }

  return (
    <AuthShell
      brand={brand}
      title={t({ en: 'Welcome', id: 'Selamat datang' })}
      accentWord={t({ en: 'back', id: 'kembali' })}
      subtitle={t(copy.subtitle)}
      footer={
        isAuthConfigured && (
          <p>
            {t(copy.newPrompt)}{' '}
            <Link
              to={brand === 'agrosphere' ? '/agrosphere/sign-up' : '/sign-up'}
              search={{ redirect }}
              className="font-medium text-[#0B6477] hover:underline"
            >
              {t(copy.newLink)}
            </Link>
          </p>
        )
      }
    >
      {!isAuthConfigured ? (
        <p className="rounded-xl bg-[#F3F7F6] px-4 py-3 text-sm text-neutral-500">
          {t({
            en: 'Sign-in is not configured yet. Please contact the SmartAgri team.',
            id: 'Fitur masuk belum dikonfigurasi. Silakan hubungi tim SmartAgri.',
          })}
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void handleSubmit()
          }}
          className="flex flex-col gap-4"
        >
          <AuthInput
            icon={AtSign}
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={
              brand === 'agrosphere'
                ? t({ en: 'you@company.com', id: 'anda@perusahaan.com' })
                : t({ en: 'you@ugm.ac.id', id: 'anda@ugm.ac.id' })
            }
          />
          <AuthInput
            icon={KeyRound}
            label={t({ en: 'Password', id: 'Kata sandi' })}
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t({ en: 'Your password', id: 'Kata sandi Anda' })}
          />

          {error && (
            <p className="text-sm text-[#B91C1C]" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className={`mt-1 ${AUTH_BUTTON}`}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t({ en: 'Signing in...', id: 'Sedang masuk...' })}
              </>
            ) : (
              t({ en: 'Sign in', id: 'Masuk' })
            )}
          </button>
          <p className="text-xs leading-relaxed text-neutral-400">
            {t(copy.audience)} {t({ en: 'By signing in you agree to our', id: 'Dengan masuk, Anda menyetujui' })}{' '}
            <Link to="/terms-of-use" className="underline underline-offset-2 hover:text-[#0B6477]">
              {t({ en: 'Terms of Use', id: 'Ketentuan Penggunaan' })}
            </Link>{' '}
            {t({ en: 'and', id: 'dan' })}{' '}
            <Link to="/privacy-policy" className="underline underline-offset-2 hover:text-[#0B6477]">
              {t({ en: 'Privacy Policy', id: 'Kebijakan Privasi' })}
            </Link>
            {t({ en: '.', id: ' kami.' })}
          </p>
        </form>
      )}
    </AuthShell>
  )
}
