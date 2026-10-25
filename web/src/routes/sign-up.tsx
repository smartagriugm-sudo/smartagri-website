import { useEffect, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { AtSign, KeyRound, Loader2, UserRound } from 'lucide-react'
import { isAuthConfigured, supabase } from '../lib/auth/supabase'
import { useAuth } from '../lib/auth/auth'
import { DEFAULT_SIGNED_IN_PATH } from '../lib/features'
import AuthShell, { AUTH_BUTTON, AuthInput } from '../components/AuthShell'

export const Route = createFileRoute('/sign-up')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect:
      typeof search.redirect === 'string' && search.redirect.startsWith('/')
        ? search.redirect
        : undefined,
  }),
  component: SignUpPage,
  head: () => ({
    meta: [
      { title: 'Sign Up | smartagri' },
      { name: 'robots', content: 'noindex, nofollow' },
      { name: 'description', content: 'Register for the SmartAgri internal tools for research assistants.' },
    ],
  }),
})

function SignUpPage() {
  const { redirect } = Route.useSearch()
  const { user, loading } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const target = redirect ?? DEFAULT_SIGNED_IN_PATH

  useEffect(() => {
    if (!loading && user) window.location.assign(target)
  }, [loading, user, target])

  const handleSubmit = async () => {
    if (!supabase) {
      setError('Authentication is not configured yet.')
      return
    }
    if (fullName.trim().length < 3) {
      setError('Enter your full name.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (!agreed) {
      setError('Please accept the Terms of Use and Privacy Policy.')
      return
    }
    setSubmitting(true)
    setError(null)
    setNotice(null)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      // Copied into the profile by handle_new_user (supabase/accounts.sql).
      options: { data: { full_name: fullName.trim() } },
    })
    setSubmitting(false)
    if (signUpError) {
      setError(signUpError.message)
      return
    }
    // If email confirmation is on, there is no session yet.
    if (data.session) {
      window.location.assign(target)
    } else {
      setNotice(
        'Account created. Check your email to confirm your address, then sign in to finish your profile. A lab admin approves new accounts before the internal tools open.',
      )
    }
  }

  return (
    <AuthShell
      title="Join the"
      accentWord="lab"
      subtitle="Create a SmartAgri account. A lab admin approves new accounts before the internal tools open."
      footer={
        <p>
          Already have an account?{' '}
          <Link to="/sign-in" search={{ redirect }} className="font-medium text-[#0B6477] hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      {!isAuthConfigured ? (
        <p className="rounded-xl bg-[#F3F7F6] px-4 py-3 text-sm text-neutral-500">
          Sign-up is not configured yet. Please contact the SmartAgri team.
        </p>
      ) : notice ? (
        <p className="rounded-xl border border-[#14919B]/20 bg-[#45DFB1]/10 px-4 py-3 text-sm leading-relaxed text-[#0B6477]" role="status">
          {notice}
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
            icon={UserRound}
            label="Full name"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="As on your student or staff card"
          />
          <AuthInput
            icon={AtSign}
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@ugm.ac.id"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AuthInput
              icon={KeyRound}
              label="Password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8+ characters"
            />
            <AuthInput
              icon={KeyRound}
              label="Confirm password"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter"
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
              I agree to the{' '}
              <Link to="/terms-of-use" className="font-medium text-[#0B6477] hover:underline">
                Terms of Use
              </Link>{' '}
              and{' '}
              <Link to="/privacy-policy" className="font-medium text-[#0B6477] hover:underline">
                Privacy Policy
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
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
