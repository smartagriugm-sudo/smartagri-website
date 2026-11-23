import type { Lang } from '../../lib/i18n'

// Supabase Auth answers in English. In Indonesian we show the known messages in
// our own words and fall back to the original text for anything else.
const EXACT: Record<string, string> = {
  'invalid login credentials': 'Email atau kata sandi salah.',
  'email not confirmed': 'Email belum dikonfirmasi. Buka tautan konfirmasi yang kami kirim ke kotak masuk Anda.',
  'user already registered': 'Email ini sudah terdaftar. Silakan masuk.',
  'signup requires a valid password': 'Masukkan kata sandi yang valid.',
  'signups not allowed for this instance': 'Pendaftaran akun baru sedang ditutup.',
  'email rate limit exceeded': 'Terlalu banyak email yang dikirim. Silakan coba lagi beberapa saat lagi.',
  'email link is invalid or has expired': 'Tautan email tidak valid atau sudah kedaluwarsa.',
  'token has expired or is invalid': 'Tautan sudah kedaluwarsa atau tidak valid.',
  'user not found': 'Akun tidak ditemukan.',
  'failed to fetch': 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
  'new password should be different from the old password.': 'Kata sandi baru harus berbeda dari kata sandi lama.',
}

export function authErrorText(message: string, lang: Lang): string {
  if (lang !== 'id') return message
  const m = message.trim().toLowerCase()
  if (EXACT[m]) return EXACT[m]
  const wait = m.match(/only request this (?:after|once every) (\d+) seconds?/)
  if (wait) return `Demi keamanan, Anda baru dapat meminta ini lagi setelah ${wait[1]} detik.`
  const min = m.match(/password should be at least (\d+) characters/)
  if (min) return `Kata sandi minimal ${min[1]} karakter.`
  if (m.includes('invalid format') || m.includes('unable to validate email')) return 'Format email tidak valid.'
  if (m.includes('rate limit')) return 'Terlalu banyak percobaan. Silakan coba lagi beberapa saat lagi.'
  if (m.includes('weak') && m.includes('password')) return 'Kata sandi terlalu lemah. Gunakan kombinasi yang lebih kuat.'
  if (m.includes('network') || m.includes('fetch')) return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'
  return message
}
