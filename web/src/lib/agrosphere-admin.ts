// Admin side of agrosphere access (supabase/agrosphere.sql): who may open which
// dashboard, and approving new accounts. Every call is checked in the database
// (is_lab_admin, the ERP role policies, the partner guards), so the page only asks.
import { supabase } from './auth/supabase'
import { addMember, removeMember } from './edge/field'
import { setRole } from './pf/foundation'
import { reviewLabAccount } from './lab-admin'
import type { Lang } from './i18n-core'

export type AccessRow = {
  user_id: string
  email: string
  full_name: string
  lab_role: string
  status: 'pending' | 'active' | 'suspended' | 'rejected' | ''
  is_admin: boolean
  pf_roles: string[]
  greenhouse_sites: string[]
  indoor: boolean
}

type Done = { error: string | null }

const GENERIC_ERROR = 'Something went wrong.'
const NOT_CONFIGURED = 'Sign-in is not configured on this deployment.'

/**
 * An error from these calls in the given language. Only the messages this file writes
 * itself are translated; the database's own reasons are shown as they come.
 */
export function accessAdminErrorText(error: string, lang: Lang): string {
  if (lang !== 'id') return error
  if (error === GENERIC_ERROR) return 'Terjadi kesalahan.'
  if (error === NOT_CONFIGURED) return 'Fitur masuk belum dikonfigurasi di deployment ini.'
  return error
}

const message = (e: unknown) => (e instanceof Error ? e.message : typeof e === 'string' ? e : GENERIC_ERROR)

export async function loadAccessRows(): Promise<{ data: AccessRow[]; error: string | null }> {
  if (!supabase) return { data: [], error: NOT_CONFIGURED }
  const { data, error } = await supabase.rpc('agro_admin_access')
  return { data: (data ?? []) as AccessRow[], error: error?.message ?? null }
}

/** Plant Factory read access is the ERP role "peneliti"; other ERP roles are set in the ERP. */
export async function setPlantFactoryRead(userId: string, on: boolean): Promise<Done> {
  try {
    await setRole(userId, 'peneliti', on)
    return { error: null }
  } catch (e) {
    return { error: message(e) }
  }
}

export async function setGreenhouseSite(siteId: string, row: AccessRow, on: boolean): Promise<Done> {
  const r = on ? await addMember(siteId, row.email) : await removeMember(siteId, row.user_id)
  return { error: r.error }
}

export async function setIndoor(userId: string, on: boolean): Promise<Done> {
  if (!supabase) return { error: NOT_CONFIGURED }
  const { error } = await supabase.rpc('agro_admin_set_app', { target_app: 'indoor', member: userId, allowed: on })
  return { error: error?.message ?? null }
}

/** Approve a waiting account and give it the greenhouse sites picked with it. */
export async function approveAccount(row: AccessRow, siteIds: string[]): Promise<Done> {
  const r = await reviewLabAccount(row.user_id, 'active')
  if (r.error) return r
  for (const site of siteIds) {
    const s = await setGreenhouseSite(site, row, true)
    if (s.error) return s
  }
  return { error: null }
}

export async function rejectAccount(userId: string): Promise<Done> {
  return reviewLabAccount(userId, 'rejected')
}
