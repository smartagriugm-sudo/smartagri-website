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
