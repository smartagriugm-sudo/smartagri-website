// Profile + account helpers backed by Supabase. Each function degrades
// gracefully when Supabase is not configured or the user is signed out.
import { supabase } from './auth/supabase'
import type { AvatarCrop } from './avatar'

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

// --- Avatar editing ----------------------------------------------------------
// The picture people see is a square WebP cut from the original upload
// (avatars/<userId>/avatar.webp). The original is kept beside it
// (avatars/<userId>/original.<ext>) so the crop can be adjusted later, and the
// crop itself rides along in the avatar URL's query string (z, x, y), which
// Storage ignores. No extra columns needed.

async function avatarFiles(userId: string): Promise<string[]> {
  if (!supabase) return []
  const { data } = await supabase.storage.from('avatars').list(userId, { limit: 100 })
  return (data ?? []).map((f) => `${userId}/${f.name}`)
}

/** Public URL of the kept original, or null for avatars uploaded before it was kept. */
export async function avatarOriginalUrl(userId: string): Promise<string | null> {
  if (!supabase) return null
  const path = (await avatarFiles(userId)).find((p) => p.split('/').pop()?.startsWith('original.'))
  if (!path) return null
  return `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}?t=${Date.now()}`
}

/** Store the cropped avatar (and a new original when given) and save its URL on the profile. */
export async function saveAvatar(
  userId: string,
  cropped: Blob,
  crop: AvatarCrop,
  original?: File,
): Promise<{ url: string | null; error: string | null }> {
  if (!supabase) return { url: null, error: 'Not configured' }
  const bucket = supabase.storage.from('avatars')
  if (original) {
    const old = (await avatarFiles(userId)).filter((p) => p.split('/').pop()?.startsWith('original.'))
    if (old.length) await bucket.remove(old)
    const ext = (original.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png'
    const { error } = await bucket.upload(`${userId}/original.${ext}`, original, {
      upsert: true,
      contentType: original.type || undefined,
      cacheControl: '3600',
    })
    if (error) return { url: null, error: error.message }
  }
  const path = `${userId}/avatar.webp`
  const { error } = await bucket.upload(path, cropped, { upsert: true, contentType: 'image/webp', cacheControl: '3600' })
  if (error) return { url: null, error: error.message }
  const q = new URLSearchParams({
    t: String(Date.now()),
    z: crop.zoom.toFixed(3),
    x: crop.x.toFixed(4),
    y: crop.y.toFixed(4),
  })
  const url = `${bucket.getPublicUrl(path).data.publicUrl}?${q}`
  const saved = await updateProfile(userId, { avatar_url: url })
  return { url: saved.error ? null : url, error: saved.error }
}

/** Delete every avatar file of the user and clear the profile picture. */
export async function removeAvatar(userId: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Not configured' }
  const files = await avatarFiles(userId)
  if (files.length) {
    const { error } = await supabase.storage.from('avatars').remove(files)
    if (error) return { error: error.message }
  }
  return updateProfile(userId, { avatar_url: null })
}
