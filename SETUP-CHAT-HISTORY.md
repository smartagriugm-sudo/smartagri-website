# 💬 Setup riwayat chat AI (Supabase)

Riwayat percakapan AI Assistant disimpan per asisten riset di **Supabase
Postgres**, memakai project Supabase yang sama dengan login. Dengan Row Level
Security (RLS), tiap user hanya bisa melihat chat miliknya sendiri.

Sebelum tabel dibuat, aplikasi tetap jalan: riwayat hanya di memori (hilang saat
reload). Setelah langkah di bawah, riwayat tersimpan dan tersinkron antar
perangkat.

## Langkah (sekali jalan)

1. Buka dashboard Supabase project Anda, masuk ke **SQL Editor**.
2. Tempelkan isi file [`web/supabase/conversations.sql`](web/supabase/conversations.sql)
   lalu **Run**. Ini membuat tabel `conversations` + index + policy RLS.
3. Tempelkan juga isi [`web/supabase/profiles.sql`](web/supabase/profiles.sql)
   lalu **Run**. Ini membuat tabel `profiles` (untuk halaman `/ai/profile`),
   trigger auto-create saat signup, backfill user lama, dan bucket Storage
   `avatars` untuk foto profil, semua dengan RLS.
4. Selesai. Login ke `/ai/chat`, kirim beberapa pesan, lalu reload. Percakapan
   akan muncul kembali di sidebar **Recent**. Buka **Profile & settings** (dari
   menu avatar header atau bagian akun di sidebar) untuk mengatur profil.

## Cara kerja

- Setiap percakapan = satu baris di tabel `conversations`, dengan daftar pesan
  disimpan sebagai `jsonb`.
- Disimpan otomatis setiap kali balasan AI selesai; dihapus dari DB saat Anda
  menghapus percakapan atau menekan **Clear conversation**.
- **Incognito chat tidak pernah disimpan** ke database.
- RLS: policy `auth.uid() = user_id` memastikan tiap RA hanya mengakses chat
  miliknya. Tidak ada kunci rahasia tambahan; cukup URL + anon key yang sudah
  dipakai untuk login.

## Catatan

- Hanya butuh anon key (publik) + sesi login user. Tidak memakai `service_role`.
- Jika tabel belum dibuat, penyimpanan gagal diam-diam (best-effort) dan chat
  tetap berfungsi di memori, jadi tidak ada error yang mengganggu.
