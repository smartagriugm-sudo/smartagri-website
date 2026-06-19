import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isAuthConfigured, supabase } from './supabase'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  /** True when Supabase env is set; when false, auth is disabled site-wide. */
  isConfigured: boolean
  signOut: () => Promise<void>
}

const FALLBACK: AuthState = {
  user: null,
  session: null,
  loading: false,
  isConfigured: false,
  signOut: async () => {},
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isAuthConfigured)

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

  const value: AuthState = {
    user: session?.user ?? null,
    session,
    loading,
    isConfigured: isAuthConfigured,
    signOut: async () => {
      await supabase?.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  return useContext(AuthContext) ?? FALLBACK
}
