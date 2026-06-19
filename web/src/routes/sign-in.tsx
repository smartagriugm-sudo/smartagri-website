import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Loader2, Lock } from 'lucide-react'
import { isAuthConfigured, supabase } from '../lib/auth/supabase'
import { useAuth } from '../lib/auth/auth'
import { accent, body, display } from '../lib/fonts'
import SiteHeader from '../components/SiteHeader'

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
      { name: 'description', content: 'Research assistant sign in for the SmartAgri AI Assistant.' },
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

  const target = redirect ?? '/ai'

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
    <main>
      <SiteHeader />
      <section className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-[#F3F7F6] px-6 py-16">
        <div className="w-full max-w-[420px] rounded-3xl border border-[#0B6477]/10 bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B6477]">
              <Lock className="h-6 w-6 text-[#45DFB1]" />
            </div>
            <h1
              className="text-2xl font-semibold tracking-[-0.025em] text-neutral-900"
              style={display}
            >
              Research Assistant <span style={accent}>Sign In</span>
            </h1>
            <p className="text-sm text-neutral-500" style={body}>
              Sign in to access the SmartAgri AI Assistant.
            </p>
          </div>

          {!isAuthConfigured ? (
            <p
              className="rounded-xl bg-[#F3F7F6] px-4 py-3 text-center text-sm text-neutral-500"
              style={body}
            >
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
                  placeholder="Your password"
                  className="w-full rounded-xl border border-[#0B6477]/20 bg-white px-3 py-2.5 text-[15px] text-neutral-800 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#0B6477]"
                  style={body}
                />
              </div>

              {error && (
                <p className="text-sm text-[#B91C1C]" style={body}>
                  {error}
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
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-neutral-400" style={body}>
            For research assistants only. Contact the SmartAgri team for access.
          </p>
        </div>
      </section>
    </main>
  )
}
