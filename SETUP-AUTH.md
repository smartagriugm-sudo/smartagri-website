# 🔐 Setup login asisten riset (Supabase Auth)

Fitur AI Assistant (`/ai`, `/ai/chat`, `/ai/generate`) dibatasi hanya untuk
asisten riset yang sudah login. Login memakai **Supabase Auth**.

Selama `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` **belum diisi**, auth
nonaktif: menu "AI Assistant" tampil untuk semua dan route AI terbuka (mode
pengembangan). Begitu kedua env diisi, gerbang aktif otomatis.

## Cara kerja gerbang
- **Nav**: menu "AI Assistant" hanya muncul saat sudah login.
- **Halaman `/ai*`**: pengunjung yang belum login dialihkan ke `/sign-in`.
- **API `/api/ai/*`**: setiap permintaan diverifikasi di server (token Supabase).
  Tanpa sesi valid → **401**. Ini gerbang keamanan sebenarnya; menyembunyikan
  menu hanyalah kenyamanan UI.

## Langkah setup (sekali jalan)

### 1. Buat project Supabase
1. Buat akun di https://supabase.com (gratis) → **New project**.
2. Setelah project jadi, buka **Project Settings → API**, salin:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`
   (Keduanya publik/aman dipakai di browser. Jangan pakai `service_role` key.)

### 2. Batasi pendaftaran (penting)
Buka **Authentication → Sign In / Providers** (atau **Settings**):
- **Matikan "Allow new users to sign up"** supaya tidak ada pendaftaran publik.
- Aktifkan **Email** provider (email + password).

### 3. Tambah akun asisten riset
Buka **Authentication → Users → Add user** untuk tiap asisten riset
(email + password), atau **Invite** lewat email. Hanya user yang Anda buat di
sini yang bisa login. Pengelolaan akun (tambah/hapus/reset password) dilakukan
dari dashboard Supabase ini.

### 4. Isi environment
- Lokal: file `web/.env`
  ```
  VITE_SUPABASE_URL=https://xxxx.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
  ```
- Vercel: Project → Settings → Environment Variables, tambah dua variabel yang
  sama (Production). VITE_ harus tersedia saat build.

### 5. Uji
- Buka `/ai` tanpa login → dialihkan ke `/sign-in`.
- Login dengan akun yang dibuat → "AI Assistant" muncul di nav, `/ai/chat` dan
  `/ai/generate` bisa dipakai.
- Klik "Sign out" → menu AI hilang, akses tertutup kembali.

## Catatan
- Sesi disimpan di browser oleh Supabase (localStorage). Ini perlu untuk login;
  halaman publik lain tidak terpengaruh.
- Verifikasi token di server hanya butuh URL + anon key (tanpa secret), jadi
  tidak ada kunci rahasia yang perlu disimpan untuk gerbang ini.
- AI tetap butuh server Ollama yang terjangkau dari produksi (lihat
  `.env.example` / SETUP AI), terpisah dari konfigurasi login ini.
