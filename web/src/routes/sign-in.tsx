import { useEffect, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { AtSign, KeyRound, Loader2 } from 'lucide-react'
import { isAuthConfigured, supabase } from '../lib/auth/supabase'
import { useAuth } from '../lib/auth/auth'
import { DEFAULT_SIGNED_IN_PATH } from '../lib/features'
import AuthShell, { AUTH_BUTTON, AuthInput } from '../components/AuthShell'

export const Route = createFileRoute('/sign-in')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect:
      typeof search.redirect === 'string' && search.redirect.startsWith('/')
        ? search.redirect
        : undefined,
  }),
  component: SignInPage,
  head: () => ({
    meta: [
      { title: 'Sign In | smartagri' },
      { name: 'robots', content: 'noindex, nofollow' },
      { name: 'description', content: 'Sign in to the SmartAgri internal tools for research assistants.' },
    ],
  }),
})

function SignInPage() {
  const { redirect } = Route.useSearch()
  const { user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const target = redirect ?? DEFAULT_SIGNED_IN_PATH

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
      title="Welcome"
      accentWord="back"
      subtitle="Sign in to the SmartAgri internal tools: Kanban, instrument inventory and more."
      footer={
        isAuthConfigured && (
          <p>
            New to the lab?{' '}
            <Link to="/sign-up" search={{ redirect }} className="font-medium text-[#0B6477] hover:underline">
              Create an account
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
            placeholder="you@ugm.ac.id"
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
            For SmartAgri lab members. By signing in you agree to our{' '}
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
