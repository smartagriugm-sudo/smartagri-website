import { useEffect, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowRight, Check, Loader2 } from 'lucide-react'
import { isAuthConfigured, supabase } from '../lib/auth/supabase'
import { DEFAULT_SIGNED_IN_PATH } from '../lib/features'
import AuthShell, { AUTH_BUTTON } from '../components/AuthShell'
import { AGROSPHERE_HOME } from '../lib/agrosphere'
import ResendConfirmation from '../components/ResendConfirmation'
import { headLang, readLang, useT } from '../lib/i18n'
import type { Lang } from '../lib/i18n'
import { authErrorText } from '../components/auth/authErrors'

export const Route = createFileRoute('/auth/confirm')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect:
      typeof search.redirect === 'string' && search.redirect.startsWith('/') && !search.redirect.startsWith('//')
        ? search.redirect
        : undefined,
  }),
  component: ConfirmPage,
  head: ({ matches }) => ({
    meta: [
      {
        title: headLang(matches) === 'id' ? 'Konfirmasi email Anda | smartagri' : 'Confirm your email | smartagri',
      },
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
function readUrlError(lang: Lang): string | null {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const query = new URLSearchParams(window.location.search)
  const code = params.get('error_code') ?? query.get('error_code')
  const desc = params.get('error_description') ?? query.get('error_description')
  if (!code && !desc) return null
  if (code === 'otp_expired')
    return lang === 'id'
      ? 'Tautan konfirmasi ini sudah kedaluwarsa atau sudah pernah dipakai. Minta tautan baru di bawah.'
      : 'This confirmation link has expired or has already been used. Request a new one below.'
  if (desc) return authErrorText(desc.replace(/\+/g, ' '), lang)
  return lang === 'id' ? 'Tautan konfirmasi tidak valid.' : 'The confirmation link is not valid.'
}

function ConfirmPage() {
  const { redirect } = Route.useSearch()
  const target = redirect ?? DEFAULT_SIGNED_IN_PATH
  const next = `/welcome?redirect=${encodeURIComponent(target)}`
  // An agrosphere sign-up comes back here on its way to the agrosphere launcher.
  const brand = target.startsWith(AGROSPHERE_HOME) ? 'agrosphere' : 'smartagri'
  const t = useT()
  const [state, setState] = useState<State>({ kind: 'checking' })

  useEffect(() => {
    // Read once here (not from context) so the effect keeps running only on redirect.
    const lang = readLang()
    if (!supabase) {
      setState({
        kind: 'failed',
        reason: lang === 'id' ? 'Fitur masuk belum dikonfigurasi di lingkungan ini.' : 'Sign-in is not configured on this environment.',
      })
      return
    }
    const urlError = readUrlError(lang)
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
          ? {
              kind: 'failed',
              reason:
                lang === 'id'
                  ? 'Kami tidak dapat mengonfirmasi email Anda dari tautan ini. Minta tautan baru di bawah.'
                  : 'We could not confirm your email from this link. Request a new one below.',
            }
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
      <AuthShell
        brand={brand}
        title={t({ en: 'Email', id: 'Email' })}
        accentWord={t({ en: 'confirmed', id: 'terkonfirmasi' })}
        subtitle={t({
          en: `Your ${brand} account is ready. One more step: tell us about yourself.`,
          id: `Akun ${brand} Anda sudah siap. Satu langkah lagi: ceritakan tentang diri Anda.`,
        })}
      >
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
              <p className="text-sm font-medium text-neutral-900">{t({ en: 'Verified', id: 'Terverifikasi' })}</p>
              <p className="truncate text-sm text-[#0B6477]">{state.email}</p>
            </div>
          </div>
          <ol className="flex flex-col gap-3 text-sm text-neutral-600">
            {[
              { label: t({ en: 'Create account', id: 'Buat akun' }), done: true },
              { label: t({ en: 'Confirm email', id: 'Konfirmasi email' }), done: true },
              { label: t({ en: 'Complete your profile', id: 'Lengkapi profil Anda' }), done: false },
              { label: t({ en: 'Approval by a lab admin', id: 'Persetujuan oleh admin lab' }), done: false },
            ].map((s, i) => (
              <li key={i} className="flex items-center gap-3">
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
              {t({ en: 'Continue to your profile', id: 'Lanjut ke profil Anda' })}
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
            <p className="mt-2 text-xs text-neutral-400">
              {t({ en: 'Taking you there automatically.', id: 'Anda akan dialihkan secara otomatis.' })}
            </p>
          </div>
        </div>
      </AuthShell>
    )
  }

  if (state.kind === 'failed') {
    return (
      <AuthShell
        brand={brand}
        title={t({ en: 'Link', id: 'Tautan' })}
        accentWord={t({ en: 'not valid', id: 'tidak valid' })}
        subtitle={t({ en: 'The confirmation could not be completed.', id: 'Konfirmasi tidak dapat diselesaikan.' })}
      >
        <div className="flex flex-col gap-6">
          <p className="flex items-start gap-3 rounded-2xl border border-[#F59E0B]/25 bg-[#F59E0B]/[0.07] p-4 text-sm leading-relaxed text-[#8A5300]" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {state.reason}
          </p>
          {isAuthConfigured && <ResendConfirmation redirect={redirect} />}
          <p className="text-sm text-neutral-500">
            {t({ en: 'Already confirmed?', id: 'Sudah dikonfirmasi?' })}{' '}
            <Link to="/sign-in" search={{ redirect }} className="font-medium text-[#0B6477] hover:underline">
              {t({ en: 'Sign in', id: 'Masuk' })}
            </Link>
          </p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      brand={brand}
      title={t({ en: 'Confirming your', id: 'Mengonfirmasi' })}
      accentWord={t({ en: 'email', id: 'email Anda' })}
      subtitle={t({ en: 'This takes a moment.', id: 'Mohon tunggu sebentar.' })}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="flex items-center gap-3 text-sm text-neutral-500"
      >
        <Loader2 className="h-5 w-5 animate-spin text-[#0B6477]" />
        {t({ en: 'Checking your confirmation link...', id: 'Memeriksa tautan konfirmasi Anda...' })}
      </motion.div>
    </AuthShell>
  )
}
