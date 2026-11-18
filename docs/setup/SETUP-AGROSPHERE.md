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

### Memberi akses Indoor

Halaman pengaturan akses dibuat di tahap 4. Sampai saat itu, admin bisa memberi akses Indoor lewat
SQL editor:

```sql
insert into public.agro_app_member (app, user_id)
select 'indoor', id from auth.users where lower(email) = lower('nama@ugm.ac.id');
```

Akun mitra ditolak otomatis.
