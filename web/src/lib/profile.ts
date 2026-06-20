// Profile + account helpers backed by Supabase. Each function degrades
// gracefully when Supabase is not configured or the user is signed out.
import { supabase } from './auth/supabase'

export interface Profile {
  id: string
  full_name: string
  preferred_name: string
  occupation: string
  division: string
  staff_id: string
  title: string
  avatar_url: string | null
  about_me: string
  instructions: string
  ai_model: string | null
  ai_language: string
  ai_style: string
}

export type ProfileEdit = Partial<Omit<Profile, 'id'>>

export async function getProfile(): Promise<Profile | null> {
  if (!supabase) return null
  try {
    const { data } = await supabase.from('profiles').select('*').maybeSingle()
    return (data as Profile) ?? null
  } catch {
    return null
  }
}

export async function updateProfile(
  id: string,
  fields: ProfileEdit,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Not configured' }
  const { error } = await supabase
    .from('profiles')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
  return { error: error?.message ?? null }
}

// Uploads to avatars/<userId>/avatar.<ext> and returns a cache-busted URL.
export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<{ url: string | null; error: string | null }> {
  if (!supabase) return { url: null, error: 'Not configured' }
  const ext = (file.name.split('.').pop() || 'png').toLowerCase()
  const path = `${userId}/avatar.${ext}`
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, cacheControl: '3600' })
  if (error) return { url: null, error: error.message }
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return { url: `${data.publicUrl}?t=${Date.now()}`, error: null }
}

export async function changeEmail(email: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Not configured' }
  const { error } = await supabase.auth.updateUser({ email })
  return { error: error?.message ?? null }
}

export async function changePassword(
  password: string,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Not configured' }
  const { error } = await supabase.auth.updateUser({ password })
  return { error: error?.message ?? null }
}

export async function countConversations(): Promise<number> {
  if (!supabase) return 0
  try {
    const { count } = await supabase
      .from('conversations')
      .select('id', { count: 'exact', head: true })
    return count ?? 0
  } catch {
    return 0
  }
}

export async function exportConversations(): Promise<unknown[]> {
  if (!supabase) return []
  try {
    const { data } = await supabase
      .from('conversations')
      .select('id, title, messages, created_at, updated_at')
      .order('updated_at', { ascending: false })
    return data ?? []
  } catch {
    return []
  }
}

export async function deleteAllConversations(userId: string): Promise<void> {
  if (!supabase) return
  try {
    await supabase.from('conversations').delete().eq('user_id', userId)
  } catch {
    // ignore
  }
}
