// agrosphere: the hub for every smartagri dashboard (docs/agrosphere/RENCANA-AGROSPHERE.md).
// Who may open what is decided in the database (supabase/agrosphere.sql); this file only
// asks. The pages use the answer to show the right cards and to turn away early, but the
// data stays protected by Row Level Security either way.
import { useEffect, useState } from 'react'
import { supabase } from './auth/supabase'
import { useAuth } from './auth/auth'

/** Where an agrosphere sign-in lands: the launcher that lists the dashboards an account may open. */
export const AGROSPHERE_HOME = '/agrosphere'

/** agrosphere's own sign-in page; the dashboards send signed-out visitors here. */
export const AGROSPHERE_SIGN_IN = '/agrosphere/sign-in'

/** Put in a new account's metadata when it signs up on agrosphere, so onboarding suggests the Partner role. */
export const AGROSPHERE_SIGNUP = 'agrosphere'

export type AgroApp = 'plant-factory' | 'greenhouse' | 'indoor'

/** One row of agro_my_apps(): a dashboard, and for the greenhouse one row per site. */
export type AgroEntry = {
  app: AgroApp
  site_id: string | null
  site_code: string | null
  site_name: string | null
}

export const AGRO_APPS: { app: AgroApp; name: string; to: string; blurb: string }[] = [
  {
    app: 'plant-factory',
    name: 'Plant Factory',
    to: '/erp',
    blurb: 'Batches, trays and harvests, stock, sales and the team that runs the plant factory.',
  },
  {
    app: 'greenhouse',
    name: 'Greenhouse',
    to: '/indoor-farming/dashboard/field',
    blurb: 'Climate, nutrient and weather readings measured on site and pushed by its edge computer.',
  },
  {
    app: 'indoor',
    name: 'Indoor Farming',
    to: '/indoor-farming/dashboard',
    blurb: 'Rooms, climate, nutrition and sensors of the indoor facility.',
  },
]

export type AgroAccess =
  /** Still asking. */
  | { state: 'loading' }
  /** No Supabase settings (local development): every dashboard is open, as elsewhere on the site. */
  | { state: 'open' }
  | { state: 'ready'; entries: AgroEntry[] }
  | { state: 'error'; message: string }

// One answer per signed-in account, shared by every page until the account changes,
// so moving between dashboards does not ask again.
let cache: { userId: string; promise: Promise<AgroAccess> } | null = null

async function fetchAccess(): Promise<AgroAccess> {
  if (!supabase) return { state: 'open' }
  const { data, error } = await supabase.rpc('agro_my_apps')
  if (error) {
    return {
      state: 'error',
      message: /agro_my_apps/.test(error.message)
        ? 'The access rules are not installed yet (supabase/agrosphere.sql).'
        : error.message,
    }
  }
  return { state: 'ready', entries: (data ?? []) as AgroEntry[] }
}

/** The dashboards the signed-in account may open. */
export function useAgroAccess(): AgroAccess {
  const { user, isConfigured } = useAuth()
  const userId = user?.id ?? null
  const [access, setAccess] = useState<AgroAccess>(() => (isConfigured ? { state: 'loading' } : { state: 'open' }))

  useEffect(() => {
    if (!isConfigured) {
      setAccess({ state: 'open' })
      return
    }
    if (!userId) {
      cache = null
      setAccess({ state: 'loading' })
      return
    }
    if (!cache || cache.userId !== userId) cache = { userId, promise: fetchAccess() }
    let active = true
    void cache.promise.then((a) => {
      if (!active) return
      if (a.state === 'error') cache = null // ask again next time
      setAccess(a)
    })
    return () => {
      active = false
    }
  }, [isConfigured, userId])

  return access
}

/** Whether the access answer lets the account open this dashboard (open counts as yes). */
export function canOpen(access: AgroAccess, app: AgroApp): boolean {
  if (access.state === 'open') return true
  return access.state === 'ready' && access.entries.some((e) => e.app === app)
}
