import { useEffect, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Loader2, UserPlus } from 'lucide-react'
import { isAuthConfigured, supabase } from '../lib/auth/supabase'
import { useAuth } from '../lib/auth/auth'
import { accent, body, display } from '../lib/fonts'
import SiteHeader from '../components/SiteHeader'

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
      { name: 'description', content: 'Research assistant sign up for the SmartAgri AI Assistant.' },
    ],
  }),
})

function SignUpPage() {
  const { redirect } = Route.useSearch()
  const { user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const target = redirect ?? '/ai'

  useEffect(() => {
    if (!loading && user) window.location.assign(target)
  }, [loading, user, target])

  const handleSubmit = async () => {
    if (!supabase) {
      setError('Authentication is not configured yet.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    setError(null)
    setNotice(null)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
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
        'Account created. Please check your email to confirm your address, then sign in.',
      )
    }
  }

  return (
    <main>
      <SiteHeader />
      <section className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-[#F3F7F6] px-6 py-16">
        <div className="w-full max-w-[420px] rounded-3xl border border-[#0B6477]/10 bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B6477]">
              <UserPlus className="h-6 w-6 text-[#45DFB1]" />
            </div>
            <h1
              className="text-2xl font-semibold tracking-[-0.025em] text-neutral-900"
              style={display}
            >
              Create an <span style={accent}>account</span>
            </h1>
            <p className="text-sm text-neutral-500" style={body}>
              Register to access the SmartAgri AI Assistant.
            </p>
          </div>

          {!isAuthConfigured ? (
            <p
              className="rounded-xl bg-[#F3F7F6] px-4 py-3 text-center text-sm text-neutral-500"
              style={body}
            >
              Sign-up is not configured yet. Please contact the SmartAgri team.
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void handleSubmit()
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-700" style={body}>
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@ugm.ac.id"
                  className="w-full rounded-xl border border-[#0B6477]/20 bg-white px-3 py-2.5 text-[15px] text-neutral-800 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#0B6477]"
                  style={body}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-700" style={body}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-xl border border-[#0B6477]/20 bg-white px-3 py-2.5 text-[15px] text-neutral-800 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#0B6477]"
                  style={body}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-700" style={body}>
                  Confirm password
                </label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full rounded-xl border border-[#0B6477]/20 bg-white px-3 py-2.5 text-[15px] text-neutral-800 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#0B6477]"
                  style={body}
                />
              </div>

              {error && (
                <p className="text-sm text-[#B91C1C]" style={body}>
                  {error}
                </p>
              )}
              {notice && (
                <p className="text-sm text-[#0B6477]" style={body}>
                  {notice}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#45DFB1] px-5 py-3 text-[15px] font-medium text-[#0B2A22] transition-colors hover:bg-[#80ED99] disabled:cursor-not-allowed disabled:opacity-60"
                style={body}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Sign Up'
                )}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-neutral-500" style={body}>
            Already have an account?{' '}
            <Link
              to="/sign-in"
              search={{ redirect }}
              className="font-medium text-[#0B6477] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
