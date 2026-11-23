import { useEffect, useState } from 'react'
import { AtSign, Loader2, MailCheck } from 'lucide-react'
import { supabase } from '../lib/auth/supabase'
import { confirmRedirectUrl } from '../lib/auth/redirects'
import { AUTH_BUTTON, AuthInput } from './AuthShell'
import { useLang, useT } from '../lib/i18n'
import { authErrorText } from './auth/authErrors'

// Sends a fresh confirmation email to an address that has not confirmed yet.
export default function ResendConfirmation({ redirect, initialEmail = '' }: { redirect?: string; initialEmail?: string }) {
  const lang = useLang()
  const t = useT()
  const [email, setEmail] = useState(initialEmail)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  const send = async () => {
    if (!supabase || !email.trim()) return
    setBusy(true)
    setMsg(null)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: confirmRedirectUrl(redirect) },
    })
    setBusy(false)
    if (error) setMsg({ ok: false, text: authErrorText(error.message, lang) })
    else {
      setMsg({
        ok: true,
        text: t({
          en: 'A new confirmation link is on its way. Check your inbox and spam folder.',
          id: 'Tautan konfirmasi baru sedang dikirim. Periksa kotak masuk dan folder spam Anda.',
        }),
      })
      setCooldown(60)
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void send()
      }}
      className="flex flex-col gap-3"
    >
      {!initialEmail && (
        <AuthInput
          icon={AtSign}
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t({ en: 'you@ugm.ac.id', id: 'anda@ugm.ac.id' })}
        />
      )}
      <button type="submit" disabled={busy || cooldown > 0} className={AUTH_BUTTON}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
        {cooldown > 0
          ? t({ en: `Resend available in ${cooldown}s`, id: `Kirim ulang tersedia dalam ${cooldown} detik` })
          : t({ en: 'Send a new confirmation link', id: 'Kirim tautan konfirmasi baru' })}
      </button>
      {msg && (
        <p className={`text-sm ${msg.ok ? 'text-[#0B6477]' : 'text-[#B91C1C]'}`} role="status">
          {msg.text}
        </p>
      )}
    </form>
  )
}
