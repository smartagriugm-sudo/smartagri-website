# Setup agrosphere

Rencana lengkap: `docs/agrosphere/RENCANA-AGROSPHERE.md`. Panduan ini bertambah setiap tahap selesai.

## Tahap 1: izin per dashboard (`web/supabase/agrosphere.sql`)

Setelah file ini dijalankan, **hanya admin lab** yang otomatis melihat semua dashboard. Peneliti
yang selama ini membuka Plant Factory tanpa peran ERP, atau melihat lokasi greenhouse tanpa
didaftarkan, akan kehilangan aksesnya sampai admin memberikannya. Mitra tidak lagi bisa membaca data
Plant Factory.

### 1. Sebelum menjalankan: catat siapa yang perlu akses

Jalankan di Supabase SQL editor untuk melihat akun aktif bukan admin beserta izinnya saat ini:

```sql
select u.email, p.lab_role,
       (select string_agg(r.role, ', ') from public.pf_user_role r where r.profile_id = p.id) as peran_erp,
       (select string_agg(s.code, ', ') from public.edge_site_member m
          join public.edge_site s on s.id = m.site_id where m.user_id = p.id) as lokasi
  from public.profiles p join auth.users u on u.id = p.id
 where p.status = 'active' and not p.is_admin
 order by p.lab_role, u.email;
```

Peneliti yang `peran_erp`-nya kosong tetapi perlu Plant Factory: beri peran di
`/erp/settings/roles` (peran `peneliti` untuk akses baca). Peneliti yang perlu greenhouse: tambahkan
email-nya di layar Field > Access untuk lokasi itu. Keduanya bisa dilakukan sebelum atau sesudah
langkah 2.

### 2. Jalankan

1. Buka Supabase > SQL editor.
2. Tempel seluruh isi `web/supabase/agrosphere.sql`, lalu Run. File ini aman dijalankan ulang.

### 3. Periksa

- Login sebagai akun mitra: Plant Factory kosong, Field hanya menampilkan lokasi miliknya.
- Login sebagai peneliti tanpa izin: Plant Factory kosong, Field menampilkan "No field site is
  shared with this account yet".
- Login sebagai admin: semua tetap terlihat seperti sebelumnya.

## Tahap 4: mengatur akses (halaman Access)

Login sebagai admin lab, buka `/agrosphere/settings/access` (menu **Access** di header agrosphere):

- **Waiting for approval**: setujui atau tolak akun baru. Untuk akun mitra, centang lokasi greenhouse
  yang dibagikan sebelum menekan Approve.
- **Accounts**: per akun, sakelar Plant Factory (akses baca lewat peran ERP "Researchers and
  students"), chip lokasi greenhouse, dan sakelar Indoor. Peran ERP lain tetap diatur di
  `/erp/settings/roles`.
- Database menolak Plant Factory dan Indoor untuk akun mitra; halaman menampilkan alasannya bila
  terjadi.

## Tahap 5: login sekali (tanpa langkah manual)

Sesi login kini disimpan di cookie untuk `.smart-agri.id`, jadi satu login berlaku di
`smart-agri.id`, `www.smart-agri.id`, dan nanti `agrosphere.smart-agri.id`. Logout di salah satunya
juga berlaku untuk semuanya.

- Tidak ada yang perlu diatur di Supabase atau Vercel untuk tahap ini.
- Pengguna yang sudah login tidak perlu login ulang: sesi lamanya dipindah otomatis saat pertama
  membuka situs setelah deploy.
- Di localhost dan preview Vercel (`*.vercel.app`) cookie hanya berlaku untuk host itu, sehingga
  preview tidak membaca sesi produksi.
- Jangan arahkan subdomain `smart-agri.id` mana pun ke layanan pihak ketiga yang bisa menjalankan
  skrip milik orang lain, karena skrip di subdomain itu bisa membaca cookie sesi.

## Tahap 6: agrosphere.smart-agri.id

Satu deployment Vercel melayani dua host. Di `agrosphere.smart-agri.id` alamatnya pendek:

| Alamat agrosphere | Halaman |
|-------------------|---------|
| `/` | Launcher dashboard |
| `/sign-in`, `/sign-up` | Login dan pendaftaran mitra |
| `/plant-factory/...` | ERP (`/erp/...`) |
| `/greenhouse` | Lokasi greenhouse (`/indoor-farming/dashboard/field`) |
| `/indoor/...` | Dashboard indoor (`/indoor-farming/dashboard/...`) |
| `/settings/access` | Akses pengguna (admin) |
| `/account`, `/welcome`, `/auth/confirm` | Sama dengan situs utama |

Halaman lain yang dibuka di host agrosphere (misalnya `/research`) diarahkan ke `www.smart-agri.id`.

### Urutan menyalakan (harus berurutan)

1. **DNS.** Di pengelola DNS `smart-agri.id`, tambahkan record:
   `CNAME  agrosphere  cname.vercel-dns.com`
   (Vercel menampilkan nilai persisnya di langkah 2). Kalau DNS dikelola Cloudflare, set record ini
   ke **DNS only** (awan abu-abu) agar sertifikat Vercel bisa terbit.
2. **Vercel.** Project situs ini > Settings > Domains > Add > `agrosphere.smart-agri.id`. Tunggu
   sampai statusnya *Valid Configuration* dan sertifikat aktif.
3. **Supabase.** Authentication > URL Configuration > Redirect URLs, tambahkan
   `https://agrosphere.smart-agri.id/**`, supaya email konfirmasi dari pendaftaran mitra kembali ke
   agrosphere.
4. **Uji dulu sebelum flag dinyalakan.** Buka `https://agrosphere.smart-agri.id`: launcher dan
   login agrosphere sudah jalan di sini walau flag masih mati. Login sekali, lalu buka
   `https://www.smart-agri.id/account`: seharusnya sudah login juga (tahap 5).
5. **Flag.** Vercel > Settings > Environment Variables, tambahkan `VITE_AGROSPHERE_SUBDOMAIN` =
   `on` untuk Production, lalu **Redeploy** (variabel `VITE_` dibaca saat build). Setelah itu:
   - `www.smart-agri.id/erp`, `/indoor-farming/dashboard/...`, dan `/agrosphere/...` diarahkan ke
     alamat agrosphere yang sesuai, jadi bookmark lama tetap berfungsi;
   - tautan "agrosphere dashboards" di menu akun smartagri membuka agrosphere.

Redirect memakai status 302 (sementara), jadi bisa diubah atau dibatalkan kapan saja tanpa
tertinggal di cache browser. Untuk membatalkan, hapus variabel `VITE_AGROSPHERE_SUBDOMAIN` lalu
redeploy; situs utama kembali menyajikan `/erp` dan `/agrosphere` seperti biasa.

### Mencoba di laptop

`npm run dev`, lalu buka `http://agrosphere.localhost:3000` (browser meresolusi `*.localhost` ke
komputer sendiri). Untuk mencoba pengalihan dari situs utama, jalankan dengan
`VITE_AGROSPHERE_SUBDOMAIN=on`.
