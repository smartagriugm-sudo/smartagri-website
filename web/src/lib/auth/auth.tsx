import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isAuthConfigured, supabase } from './supabase'
import { OPEN_ACCOUNT, accountFromProfile, getAccountProfile } from '../account'
import type { Account } from '../account'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  /** True when Supabase env is set; when false, auth is disabled site-wide. */
  isConfigured: boolean
  /** Approval status, admin flag and onboarding of the signed-in user (lib/account.ts). */
  account: Account | null
  /** True while the account of a signed-in user is being read. */
  accountLoading: boolean
  /** Read the account again, e.g. after onboarding. */
  refreshAccount: () => Promise<void>
  signOut: () => Promise<void>
}

const FALLBACK: AuthState = {
  user: null,
  session: null,
  loading: false,
  isConfigured: false,
  account: null,
  accountLoading: false,
  refreshAccount: async () => {},
  signOut: async () => {},
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isAuthConfigured)
  const [account, setAccount] = useState<Account | null>(null)
  const [accountFor, setAccountFor] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user.id ?? null

  const readAccount = useCallback(async (id: string) => {
    const { profile, error } = await getAccountProfile()
    // A read error (e.g. no profiles table yet) leaves the site as it was.
    setAccount(error ? OPEN_ACCOUNT : accountFromProfile(profile))
    setAccountFor(id)
  }, [])

  // Keyed on the user id: token refreshes hand out a new session object for
  // the same user and must not trigger another read.
  useEffect(() => {
    if (!userId) {
      setAccount(null)
      setAccountFor(null)
      return
    }
    void readAccount(userId)
  }, [userId, readAccount])

  const value: AuthState = {
    user: session?.user ?? null,
    session,
    loading,
    isConfigured: isAuthConfigured,
    account: userId && accountFor === userId ? account : null,
    accountLoading: !!userId && accountFor !== userId,
    refreshAccount: async () => {
      if (userId) await readAccount(userId)
    },
    signOut: async () => {
      // "local" ends only this browser's session; the default ("global")
      // would sign the person out on every device at once.
      await supabase?.auth.signOut({ scope: 'local' })
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  return useContext(AuthContext) ?? FALLBACK
}
