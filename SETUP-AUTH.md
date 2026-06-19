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

### 2. Aktifkan pendaftaran email/password
Buka **Authentication → Sign In / Providers** (atau **Settings**):
- Aktifkan **Email** provider (email + password).
- Karena memakai **sign-up terbuka**, biarkan **"Allow new users to sign up"
  tetap ON** (kalau OFF, halaman `/sign-up` akan gagal).
- (Opsional) aktifkan **Confirm email** kalau ingin verifikasi email sebelum
  user bisa login.

### 3. Akun asisten riset
Asisten riset mendaftar sendiri di halaman **`/sign-up`** (email + password).
Anda juga tetap bisa menambah/menghapus/reset akun manual lewat **Authentication
→ Users** di dashboard Supabase.

> Catatan keamanan: sign-up terbuka berarti siapa pun yang tahu URL `/sign-up`
> bisa membuat akun lalu mengakses AI. Pembatasan saat ini hanya "URL tidak
> dipublikasikan" + noindex. Kapan saja bisa diperketat: matikan "Allow new
> users to sign up" di Supabase (lalu kelola akun manual), atau minta saya
> tambahkan pembatasan domain email.

### Akses ke halaman login/daftar
- **Tidak ada tombol login publik.** `/sign-in` dan `/sign-up` hanya diakses
  lewat URL langsung yang Anda bagikan ke asisten riset.
- Kedua halaman (dan seluruh `/ai*`) sudah diberi **`noindex`** agar tidak
  muncul di hasil pencarian.
- Setelah login, menu **"AI Assistant"** muncul otomatis di nav; saat **Sign
  out**, hilang lagi.

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
