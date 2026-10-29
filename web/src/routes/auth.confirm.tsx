import { useEffect, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowRight, Check, Loader2 } from 'lucide-react'
import { isAuthConfigured, supabase } from '../lib/auth/supabase'
import { DEFAULT_SIGNED_IN_PATH } from '../lib/features'
import AuthShell, { AUTH_BUTTON } from '../components/AuthShell'
import ResendConfirmation from '../components/ResendConfirmation'

export const Route = createFileRoute('/auth/confirm')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect:
      typeof search.redirect === 'string' && search.redirect.startsWith('/') && !search.redirect.startsWith('//')
        ? search.redirect
        : undefined,
  }),
  component: ConfirmPage,
  head: () => ({
    meta: [
      { title: 'Confirm your email | smartagri' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
})

// Landing page for the link in the confirmation email. Supabase puts the
// session (or an error) in the URL; supabase-js reads it on load. This page
// waits for that, wipes the tokens from the address bar, and either welcomes
// the person and moves them on to onboarding, or explains what went wrong and
// offers a fresh link.

type State =
  | { kind: 'checking' }
  | { kind: 'confirmed'; email: string }
  | { kind: 'failed'; reason: string }

const EASE = [0.22, 1, 0.36, 1] as const
const REDIRECT_DELAY = 3000

// Errors arrive in the hash (implicit flow) or the query (PKCE flow).
function readUrlError(): string | null {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const query = new URLSearchParams(window.location.search)
  const code = params.get('error_code') ?? query.get('error_code')
  const desc = params.get('error_description') ?? query.get('error_description')
  if (!code && !desc) return null
  if (code === 'otp_expired')
    return 'This confirmation link has expired or has already been used. Request a new one below.'
  return desc ? desc.replace(/\+/g, ' ') : 'The confirmation link is not valid.'
}

function ConfirmPage() {
  const { redirect } = Route.useSearch()
  const target = redirect ?? DEFAULT_SIGNED_IN_PATH
  const next = `/welcome?redirect=${encodeURIComponent(target)}`
  const [state, setState] = useState<State>({ kind: 'checking' })

  useEffect(() => {
    if (!supabase) {
      setState({ kind: 'failed', reason: 'Sign-in is not configured on this environment.' })
      return
    }
    const urlError = readUrlError()
    // Tokens must not stay in the address bar, history or a shared screenshot.
    const clean = () => window.history.replaceState(null, '', `/auth/confirm${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`)
    if (urlError) {
      clean()
      setState({ kind: 'failed', reason: urlError })
      return
    }

    let active = true
    const done = (email: string) => {
      if (!active) return
      clean()
      setState({ kind: 'confirmed', email })
    }
    void (async () => {
      // PKCE links carry ?code= and need an explicit exchange.
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) await supabase.auth.exchangeCodeForSession(code)
      const { data } = await supabase.auth.getSession()
      if (data.session) done(data.session.user.email ?? '')
    })()
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) done(session.user.email ?? '')
    })
    // No session after a while: the link was opened without its tokens.
    const timer = window.setTimeout(() => {
      if (!active) return
      setState((s) =>
        s.kind === 'checking'
          ? { kind: 'failed', reason: 'We could not confirm your email from this link. Request a new one below.' }
          : s,
      )
    }, 6000)
    return () => {
      active = false
      window.clearTimeout(timer)
      sub.subscription.unsubscribe()
    }
  }, [redirect])

  // Move on to onboarding a moment after the success state shows.
  useEffect(() => {
    if (state.kind !== 'confirmed') return
    const t = window.setTimeout(() => window.location.assign(next), REDIRECT_DELAY)
    return () => window.clearTimeout(t)
  }, [state.kind, next])

  if (state.kind === 'confirmed') {
    return (
      <AuthShell title="Email" accentWord="confirmed" subtitle="Your smartagri account is ready. One more step: tell us about yourself.">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4 rounded-2xl border border-[#14919B]/20 bg-[#45DFB1]/10 p-4">
            <motion.span
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 18 }}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#45DFB1] text-[#0B2A22]"
            >
              <Check className="h-5 w-5" strokeWidth={3} />
            </motion.span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-900">Verified</p>
              <p className="truncate text-sm text-[#0B6477]">{state.email}</p>
            </div>
          </div>
          <ol className="flex flex-col gap-3 text-sm text-neutral-600">
            {[
              { label: 'Create account', done: true },
              { label: 'Confirm email', done: true },
              { label: 'Complete your profile', done: false },
              { label: 'Approval by a lab admin', done: false },
            ].map((s, i) => (
              <li key={s.label} className="flex items-center gap-3">
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                    s.done ? 'bg-[#0B6477] text-white' : i === 2 ? 'border-2 border-[#14919B] text-[#0B6477]' : 'border border-[#0B6477]/20 text-neutral-400'
                  }`}
                >
                  {s.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                </span>
                <span className={s.done ? 'text-neutral-400 line-through decoration-neutral-300' : i === 2 ? 'font-medium text-neutral-900' : ''}>
                  {s.label}
                </span>
              </li>
            ))}
          </ol>
          <div>
            <a href={next} className={AUTH_BUTTON}>
              Continue to your profile
              <ArrowRight className="h-4 w-4" />
            </a>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#0B6477]/10">
              <motion.div
                className="h-full origin-left bg-[#14919B]"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: REDIRECT_DELAY / 1000, ease: 'linear' }}
              />
            </div>
            <p className="mt-2 text-xs text-neutral-400">Taking you there automatically.</p>
          </div>
        </div>
      </AuthShell>
    )
  }

  if (state.kind === 'failed') {
    return (
      <AuthShell title="Link" accentWord="not valid" subtitle="The confirmation could not be completed.">
        <div className="flex flex-col gap-6">
          <p className="flex items-start gap-3 rounded-2xl border border-[#F59E0B]/25 bg-[#F59E0B]/[0.07] p-4 text-sm leading-relaxed text-[#8A5300]" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {state.reason}
          </p>
          {isAuthConfigured && <ResendConfirmation redirect={redirect} />}
          <p className="text-sm text-neutral-500">
            Already confirmed?{' '}
            <Link to="/sign-in" search={{ redirect }} className="font-medium text-[#0B6477] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Confirming your" accentWord="email" subtitle="This takes a moment.">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="flex items-center gap-3 text-sm text-neutral-500"
      >
        <Loader2 className="h-5 w-5 animate-spin text-[#0B6477]" />
        Checking your confirmation link...
      </motion.div>
    </AuthShell>
  )
}
