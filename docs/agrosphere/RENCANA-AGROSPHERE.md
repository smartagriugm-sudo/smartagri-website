# Rencana agrosphere: satu pintu untuk semua dashboard

Status: disetujui 18 November 2026. Tahap 1 berjalan di Supabase; tahap 2 dan 3 selesai di kode (branch `agrosphere/login`).

agrosphere menjadi merek untuk semua dashboard operasional smartagri. Orang membuka
`agrosphere.smart-agri.id`, login, lalu memilih dashboard yang boleh ia buka. Situs publik
`smart-agri.id` tetap smartagri.

## 1. Keputusan

| # | Keputusan | Alasan |
|---|-----------|--------|
| 1 | Alamatnya `agrosphere.smart-agri.id`, tanpa `www.` | `www.` di depan subdomain tidak lazim dan menambah satu record DNS serta satu sertifikat. |
| 2 | Tetap satu aplikasi (`web/`), dibedakan lewat nama host | Komponen, Supabase, dan route Nitro dipakai bersama, tanpa kode ganda dan tanpa deploy kedua. |
| 3 | Login sekali untuk semua (SSO lintas subdomain) | Lihat bagian 3. |
| 4 | Izin per dashboard, dan untuk greenhouse per lokasi | Mitra hanya melihat yang diberikan kepadanya. Lihat bagian 4. |
| 4a | Peneliti juga tidak otomatis mendapat dashboard apa pun; hanya yang diberikan admin | Keputusan pengguna. Hanya admin lab yang melihat semuanya. |
| 4b | Mitra tidak pernah mendapat Plant Factory, termasuk hanya-baca | Keputusan pengguna. Dijaga di database, bukan hanya di halaman. |
| 4c | Mitra tidak mendapat Indoor selama datanya masih simulasi | Keputusan pengguna. Indoor nanti memakai perangkat asli. |
| 4d | Tagline panel login: "Monitor. Manage. Grow." | Disetujui pengguna. |
| 5 | Halaman login agrosphere meniru `AuthShell` smartagri, animasinya diganti logo agrosphere tanpa batang daun dan jalur sirkuit | Permintaan pengguna. Lihat bagian 5. |
| 6 | Kanban, AI Assistant, Inventory, Guestbook, dan halaman publik indoor farming tetap di smartagri | Itu alat dan konten lab, bukan produk operasional. |

## 2. Kondisi sekarang

| Dashboard | Route sekarang | Data | Aturan akses sekarang |
|-----------|----------------|------|------------------------|
| Plant Factory (ERP) | `/erp/*` | Supabase `pf_*` | Gerbang `ErpGate` (login + aktif). Tabel dasar (`pf_location`, `pf_crop`, `pf_recipe`, batch, dst.) dibaca dengan `is_lab_member()`, artinya **semua akun aktif, termasuk mitra**. Data sensitif (biaya, penjualan, pembelian, audit) sudah dibatasi lewat `pf_user_role`. |
| Greenhouse / lahan (SGH Grabag) | `/indoor-farming/dashboard/field` | Supabase `edge_*` dari edge PC | Sudah per lokasi: admin dan anggota internal melihat semua lokasi, mitra hanya lokasi di `edge_site_member`. |
| Indoor farming monitoring | `/indoor-farming/dashboard/*` (selain `field`) | Simulasi di `lib/dashboard-state.tsx` | Hanya `RequireAuth` (login). |

**Celah yang harus ditutup:** akun mitra BISI yang sudah disetujui saat ini bisa membaca tanaman,
resep, dan batch plant factory lewat API Supabase, walaupun tidak pernah diberi akses. Tahap 1
menutup celah ini sebelum agrosphere dibuka untuk mitra.

## 3. Login sekali atau dua kali

**Rekomendasi: login sekali (SSO lintas subdomain), untuk semua akun.**

- **Peneliti internal** memakai keduanya (AI, Kanban di smartagri; ERP dan greenhouse di
  agrosphere). Login dua kali hanya menambah gesekan tanpa menambah keamanan, karena akunnya
  tetap satu.
- **Mitra** cukup mengenal agrosphere. Sesi yang ikut berlaku di `smart-agri.id` tidak membuka
  apa pun bagi mereka, karena setiap tabel tetap dijaga RLS dan alat lab sudah menolak akun
  `mitra`.
- **Logout** di salah satu domain berlaku untuk keduanya, jadi tidak ada sesi yang tertinggal.

Cara kerjanya: sekarang `supabase-js` menyimpan sesi di `localStorage`, yang terikat pada satu
domain. Sesi dipindah ke cookie dengan `Domain=.smart-agri.id; Secure; SameSite=Lax`, memakai
`createBrowserClient` dari `@supabase/ssr` (paket resmi Supabase, bukan layanan baru) dengan
`cookieOptions.domain`. Sesi yang besar otomatis dipecah ke beberapa cookie. Di localhost dan
preview Vercel, cookie tetap host-only. Ini juga merapikan aturan "tanpa localStorage" di
CLAUDE.md.

Saat peralihan, sesi lama di `localStorage` dipindah sekali ke cookie supaya pengguna yang sudah
login tidak terlempar keluar.

Yang perlu diperhatikan: cookie bisa dibaca semua subdomain `smart-agri.id`. Itu aman selama
semua subdomain dikelola tim sendiri. Jangan arahkan subdomain ke layanan pihak ketiga yang bisa
menjalankan kode milik orang lain.

## 4. Model izin

### 4.1 Daftar aplikasi

| Kode | Nama di launcher | Isi |
|------|------------------|-----|
| `plant-factory` | Plant Factory | ERP `/erp/*` |
| `greenhouse` | Greenhouse | Dashboard lokasi dari edge PC, per lokasi (`edge_site`) |
| `indoor` | Indoor Farming | Monitoring indoor (masih simulasi) |

### 4.2 Aturan

| Akun | Plant Factory | Greenhouse | Indoor |
|------|---------------|------------|--------|
| Admin lab | semua | semua lokasi | ya |
| Peneliti aktif (bukan `mitra`) | hanya bila diberi peran ERP (`pf_user_role`) | hanya lokasi yang diberikan | hanya bila diberi |
| Mitra aktif | **tidak pernah** | hanya lokasi yang diberikan | **tidak** (data simulasi) |
| Pending, suspended, rejected, tamu | tidak | tidak | tidak |

Peran ERP sudah menjadi tanda izin Plant Factory: admin memberi peran `peneliti` untuk akses baca,
atau peran kerja lain (operator, teknisi, dan seterusnya) bila perlu.

Contoh: mitra BISI diberi lokasi SGH Grabag saja. Di launcher ia hanya melihat kartu Greenhouse,
dan request ke tabel `pf_*` menghasilkan nol baris.

### 4.3 Perubahan database (`supabase/agrosphere.sql`, dijalankan manual setelah `edge-sync.sql`)

- **Plant Factory:** fungsi baru `pf_is_member()` = admin lab, atau akun aktif bukan `mitra` yang
  punya minimal satu peran di `pf_user_role`. Semua policy, view, dan fungsi `pf_*` yang tadinya
  memakai `is_lab_member()` kini memakai `pf_is_member()`, termasuk bucket `pf-model` dan
  `pf-media`. `pf_has_role()` ikut memakainya. Trigger `pf_user_role_partner_guard` menolak
  peran ERP untuk akun mitra.
- **Greenhouse:** `edge_readable_sites()` kini hanya admin lab atau anggota di `edge_site_member`.
- **Indoor:** tabel `agro_app_member (app, user_id, added_at, added_by)`, saat ini hanya untuk
  `indoor`. Trigger menolak akun mitra.
- `agro_can(app)`: satu jawaban "boleh buka dashboard ini?" untuk halaman.
- `agro_my_apps()`: daftar dashboard (dan lokasi greenhouse) akun yang sedang login, untuk launcher.
- Admin: `agro_admin_access()` (semua akun beserta peran ERP, lokasi, dan Indoor) dan
  `agro_admin_set_app('indoor', user, true/false)`. Lokasi greenhouse tetap lewat
  `edge_admin_add_member`/`edge_admin_remove_member`, peran ERP lewat `/erp/settings/roles`.
- File sumber `pf-*.sql` dan `edge-sync.sql` memuat aturan yang sama, jadi menjalankan ulang
  salah satunya tidak membuka celah lagi.

Diuji di Postgres 16 lokal dengan enam akun uji (admin, peneliti berperan ERP, peneliti tanpa
izin, peneliti Indoor, mitra BISI, akun pending), baik sebagai migrasi di atas skema lama maupun
pemasangan baru. Sebelum migrasi, akun mitra membaca 541 lokasi plant factory; sesudahnya nol, dan
ia hanya melihat lokasi SGH Grabag.

Pemeriksaan di halaman hanya untuk kenyamanan. Yang benar-benar menjaga data adalah RLS.

### 4.4 Pengaturan akses di admin

Halaman baru **Akses pengguna** di agrosphere (`/settings/access`, hanya admin):

- Daftar akun dengan filter (internal, mitra, pending).
- Per akun: sakelar Plant Factory dan Indoor, centang lokasi greenhouse, serta tautan ke peran
  ERP (`/erp/settings/roles`) untuk akun internal.
- Persetujuan akun mitra baru dilakukan di halaman ini juga, sekaligus memberi izinnya.

## 5. Halaman login agrosphere

- `AgrosphereAuthShell` meniru `AuthShell`: tata letak terbelah, panel merek di kiri, form di
  kanan, input dan tombol yang sama (`AuthInput`, `AUTH_BUTTON`).
- Panel merek: logo `A.agrosphereLogo`, eyebrow "by smartagri", tagline
  "Monitor. Manage. Grow.", satu kalimat penjelasan.
- Animasi `AgrosphereMark` menggantikan `GrowthPrism`, tanpa batang daun dan tanpa sirkuit atau
  node:
  - Tiga bagian ikon agrosphere (bingkai cyan dan dua lengkung mint) masuk satu per satu dan
    menyatu.
  - Ikon diekstrusi 3D tipis dengan teknik lapisan yang sama seperti `GrowthPrism`, lalu condong
    mengikuti pointer.
  - Gelombang bingkai membulat bergerak pelan keluar dari ikon (makna "sphere").
  - Satu loop `requestAnimationFrame` tanpa re-render React. `prefers-reduced-motion`
    menampilkan satu frame diam.
- Mobile: panel merek disembunyikan dan logo agrosphere tampil di atas form, sama seperti
  smartagri.
- Tautan "Home" diganti "smart-agri.id", dan sign-up mengarah ke pendaftaran mitra.
- Sesuai cara kerja yang disepakati, tampilan login ditunjukkan dulu untuk disetujui sebelum
  dilanjutkan ke bagian lain.

### Pendaftaran mitra

Sign-up di agrosphere mengisi `lab_role = 'mitra'` dengan status `pending`. Email konfirmasi
kembali ke `agrosphere.smart-agri.id/auth/confirm`. Admin menyetujui akun dan memberi izin di
halaman Akses pengguna. Sampai disetujui, launcher menampilkan pesan "menunggu persetujuan".

## 6. Domain dan routing

Satu deployment Vercel melayani dua host. Router TanStack (v1.170, opsi `rewrite` input/output)
memetakan URL rapi di agrosphere ke route yang sudah ada:

| URL di agrosphere | Route internal |
|-------------------|----------------|
| `/` | `/agrosphere` (launcher) |
| `/sign-in`, `/sign-up` | `/agrosphere/sign-in`, `/agrosphere/sign-up` |
| `/plant-factory/*` | `/erp/*` |
| `/greenhouse` | `/indoor-farming/dashboard/field` |
| `/indoor/*` | `/indoor-farming/dashboard/*` |
| `/settings/access` | `/agrosphere/settings/access` |
| `/auth/confirm`, `/account` | sama |
| lainnya | redirect ke `https://www.smart-agri.id/...` |

- Di `smart-agri.id`, `/erp/*` dan `/indoor-farming/dashboard/*` di-redirect 301 ke agrosphere
  setelah peluncuran, sehingga bookmark lama tetap berfungsi. Halaman publik indoor farming
  tidak berubah.
- Tombol menu ke dashboard di header smartagri diarahkan ke agrosphere.
- Seluruh agrosphere `noindex, nofollow`, dengan favicon `A.agrosphereIcon`.
- Dev lokal: `http://agrosphere.localhost:3000` (browser meresolusi `*.localhost` otomatis),
  sehingga perilaku dua host bisa diuji tanpa DNS.

## 7. Tahapan (satu PR per tahap)

1. **Keamanan dan izin** (selesai, sudah dijalankan di Supabase). `agrosphere.sql` (tabel, `agro_can`, `agro_my_apps`, RPC admin),
   policy baca `pf_*` diganti, uji RLS dengan akun mitra uji. Tidak ada perubahan tampilan.
2. **Login agrosphere** (selesai di kode, tampilan disetujui; logo menyatu dua tahap: bingkai lalu daun). `AgrosphereAuthShell`, `AgrosphereMark`, route `/agrosphere/sign-in` dan
   `/agrosphere/sign-up`. Ditunjukkan untuk disetujui.
3. **Launcher** (selesai di kode). `/agrosphere`: kartu per aplikasi dari `agro_my_apps()`, status pending, dan
   gerbang per aplikasi di ERP, field, dan indoor (`AgroGate app="..."`) yang menggantikan
   `RequireAuth`/`ErpGate` untuk pengecekan izin.
4. **Pengaturan akses** (selesai di kode). Halaman `/agrosphere/settings/access`: persetujuan akun baru (mitra langsung diberi lokasi greenhouse), lalu per akun: baca Plant Factory (peran ERP `peneliti`), lokasi greenhouse, dan Indoor.
5. **SSO** (selesai di kode). Sesi Supabase disimpan di cookie `Domain=.smart-agri.id`
   (`lib/auth/cookie-storage.ts`, dipecah per 3.180 karakter), bukan localStorage, tanpa paket baru.
   Sesi lama di localStorage dipindah sekali saat halaman dibuka. Di localhost dan preview Vercel cookie
   hanya untuk host itu. Alur konfirmasi email tidak berubah.
6. **Subdomain.** `rewrite` router per host, redirect 301, tautan header, serta dokumen
   `docs/setup/SETUP-AGROSPHERE.md`.
7. **Rapikan.** CLAUDE.md (merek agrosphere, route baru), `STATUS-PENGEMBANGAN.md`.

Tahap 1 sampai 5 bisa diuji penuh di `smart-agri.id/agrosphere` dan `agrosphere.localhost`
sebelum DNS disentuh.

## 8. Yang dikerjakan di luar kode (oleh pengelola)

- DNS di registrar: `CNAME agrosphere -> cname.vercel-dns.com`.
- Vercel: tambahkan domain `agrosphere.smart-agri.id` ke proyek yang sama.
- Supabase Auth > URL Configuration: tambahkan `https://agrosphere.smart-agri.id/**` ke Redirect
  URLs.
- Supabase SQL editor: jalankan `supabase/agrosphere.sql` pada tahap 1.
- Template email Supabase: pertimbangkan teks yang netral merek, karena email yang sama dipakai
  dua merek.

## 9. Pertanyaan terbuka

Keempat pertanyaan awal sudah dijawab (keputusan 4a sampai 4d). Belum ada pertanyaan baru.
