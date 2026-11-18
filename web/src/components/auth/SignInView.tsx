import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { AtSign, KeyRound, Loader2 } from 'lucide-react'
import { isAuthConfigured, supabase } from '../../lib/auth/supabase'
import { useAuth } from '../../lib/auth/auth'
import { DEFAULT_SIGNED_IN_PATH } from '../../lib/features'
import AuthShell, { AUTH_BUTTON, AuthInput, type AuthBrand } from '../AuthShell'
import { AGROSPHERE_HOME } from '../../lib/agrosphere'

// The sign-in form for both brands: /sign-in (smartagri) and /agrosphere/sign-in.
// Same account and the same Supabase call; only the words and where it goes next differ.
const COPY = {
  smartagri: {
    subtitle: 'Sign in to the SmartAgri internal tools: Kanban, instrument inventory and more.',
    newPrompt: 'New to the lab?',
    newLink: 'Create an account',
    audience: 'For SmartAgri lab members.',
    home: DEFAULT_SIGNED_IN_PATH,
  },
  agrosphere: {
    subtitle: 'Sign in to open the dashboards your account was given. smartagri researchers use their smartagri account.',
    newPrompt: 'New partner?',
    newLink: 'Request access',
    audience: 'For smartagri researchers and partners.',
    home: AGROSPHERE_HOME,
  },
} as const

export default function SignInView({ brand, redirect }: { brand: AuthBrand; redirect?: string }) {
  const copy = COPY[brand]
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
      setError('Authentication is not configured yet.')
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
      setError(signInError.message)
      return
    }
    window.location.assign(target)
  }

  return (
    <AuthShell
      brand={brand}
      title="Welcome"
      accentWord="back"
      subtitle={copy.subtitle}
      footer={
        isAuthConfigured && (
          <p>
            {copy.newPrompt}{' '}
            <Link
              to={brand === 'agrosphere' ? '/agrosphere/sign-up' : '/sign-up'}
              search={{ redirect }}
              className="font-medium text-[#0B6477] hover:underline"
            >
              {copy.newLink}
            </Link>
          </p>
        )
      }
    >
      {!isAuthConfigured ? (
        <p className="rounded-xl bg-[#F3F7F6] px-4 py-3 text-sm text-neutral-500">
          Sign-in is not configured yet. Please contact the SmartAgri team.
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
            placeholder={brand === 'agrosphere' ? 'you@company.com' : 'you@ugm.ac.id'}
          />
          <AuthInput
            icon={KeyRound}
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
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
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
          <p className="text-xs leading-relaxed text-neutral-400">
            {copy.audience} By signing in you agree to our{' '}
            <Link to="/terms-of-use" className="underline underline-offset-2 hover:text-[#0B6477]">
              Terms of Use
            </Link>{' '}
            and{' '}
            <Link to="/privacy-policy" className="underline underline-offset-2 hover:text-[#0B6477]">
              Privacy Policy
            </Link>
            .
          </p>
        </form>
      )}
    </AuthShell>
  )
}
