// Lab account state on top of Supabase Auth (supabase/accounts.sql): approval
// status, admin flag, onboarding. Before accounts.sql is installed the columns
// are missing and every signed-in user counts as an onboarded, active member,
// so the site keeps working during the switch.
import { supabase } from './auth/supabase'
import type { Profile } from './profile'

export type AccountStatus = 'pending' | 'active' | 'suspended' | 'rejected'

export type LabRole = 'dosen' | 'peneliti' | 'staf' | 's3' | 's2' | 's1' | 'alumni' | 'mitra'

export const LAB_ROLES: { value: LabRole; label: string }[] = [
  { value: 'dosen', label: 'Lecturer' },
  { value: 'peneliti', label: 'Researcher' },
  { value: 'staf', label: 'Staff' },
  { value: 's3', label: 'Doctoral student (S3)' },
  { value: 's2', label: 'Master student (S2)' },
  { value: 's1', label: 'Undergraduate (S1)' },
  { value: 'alumni', label: 'Alumni' },
  { value: 'mitra', label: 'Partner' },
]

export function labRoleLabel(role: string | null | undefined): string {
  return LAB_ROLES.find((r) => r.value === role)?.label ?? ''
}

export function isStudentRole(role: string | null | undefined): boolean {
  return role === 's1' || role === 's2' || role === 's3'
}

export interface Account {
  status: AccountStatus
  isAdmin: boolean
  onboarded: boolean
  /** Preferred or full name from the profile; empty when not set. */
  name: string
  /** Profile photo URL, shown in the header avatars. */
  avatarUrl: string | null
}

// What a signed-in user gets when the profile cannot be read at all (no
// profiles table yet); RLS still has the last word on every table.
export const OPEN_ACCOUNT: Account = { status: 'active', isAdmin: false, onboarded: true, name: '', avatarUrl: null }

export interface AccountProfile extends Profile {
  status?: AccountStatus
  is_admin?: boolean
  lab_role?: string
  cohort?: number | null
  research_topic?: string
  supervisor_id?: string | null
  onboarded_at?: string | null
}

export function accountFromProfile(p: Partial<AccountProfile> | null): Account {
  if (!p) return OPEN_ACCOUNT
  const identity = { name: (p.preferred_name || p.full_name || '').trim(), avatarUrl: p.avatar_url ?? null }
  // Columns missing (accounts.sql not run): treat as before.
  if (!('status' in p)) return { ...OPEN_ACCOUNT, ...identity }
  return {
    status: (p.status ?? 'pending') as AccountStatus,
    isAdmin: !!p.is_admin,
    onboarded: !!p.onboarded_at,
    ...identity,
  }
}

export async function getAccountProfile(): Promise<{ profile: AccountProfile | null; error: string | null }> {
  if (!supabase) return { profile: null, error: null }
  const { data, error } = await supabase.from('profiles').select('*').maybeSingle()
  return { profile: (data as AccountProfile | null) ?? null, error: error?.message ?? null }
}

export interface OnboardingFields {
  full_name: string
  preferred_name: string
  lab_role: LabRole
  cohort: number | null
  staff_id: string
  research_topic: string
  supervisor_id: string | null
}

export async function saveOnboarding(userId: string, fields: OnboardingFields): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Not configured' }
  const now = new Date().toISOString()
  // upsert: an account created before profiles.sql may have no row yet.
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...fields, onboarded_at: now, updated_at: now }, { onConflict: 'id' })
  return { error: error?.message ?? null }
}

export async function listSupervisors(): Promise<{ id: string; full_name: string; lab_role: string }[]> {
  if (!supabase) return []
  const { data } = await supabase.rpc('lab_supervisors')
  return (data as { id: string; full_name: string; lab_role: string }[] | null) ?? []
}

// Validation for the onboarding form; returns the first problem or null.
export function onboardingError(f: OnboardingFields, currentYear: number): string | null {
  if (f.full_name.trim().length < 3) return 'Enter your full name.'
  if (!LAB_ROLES.some((r) => r.value === f.lab_role)) return 'Choose your role in the lab.'
  if (isStudentRole(f.lab_role)) {
    if (!f.cohort || f.cohort < 1990 || f.cohort > currentYear) return 'Enter your cohort as the year you started, for example 2024.'
    if (!f.staff_id.trim()) return 'Enter your student ID (NIM).'
    if (!f.research_topic.trim()) return 'Enter your research topic (a working title is fine).'
  }
  return null
}
