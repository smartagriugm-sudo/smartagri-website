# Desain akun smartagri: sign up, login, onboarding, persetujuan, dan integrasi Kanban

Status: **usulan, menunggu persetujuan**. Belum ada kode atau SQL yang diubah untuk bagian ini.

Keputusan yang sudah diambil:
- Siapa pun boleh mendaftar, tetapi akun **menunggu persetujuan admin** sebelum bisa memakai alat internal.
- Saat login pertama, pengguna mengisi **nama lengkap dan panggilan, peran di lab, angkatan dan NIM,
  topik riset dan pembimbing**.

## 1. Kondisi sekarang dan masalahnya

| Bagian | Sekarang | Masalah |
|---|---|---|
| Sign up | email + password, langsung aktif setelah verifikasi email | siapa pun di internet bisa masuk |
| Hak akses data | RLS hanya mengecek "sudah login" (`to authenticated using (true)`) | akun asing bisa membaca dan **mengubah** inventaris, membaca buku tamu (data pribadi pengunjung), dan melihat board Team |
| Profil | `profiles` diisi manual di `/account`, banyak yang kosong | Kanban menampilkan "Unnamed member" |
| Lupa password | belum ada | pengguna harus minta reset ke admin Supabase |
| Admin | tidak ada konsep admin di aplikasi | persetujuan dan peran hanya bisa lewat dasbor Supabase |
| Kanban | anggota board ditambah lewat email | harus hafal email; tidak ada direktori anggota lab |

## 2. Alur pengguna

```
Sign up (email, password, nama lengkap)
  -> verifikasi email (Supabase Auth)
  -> Sign in
  -> /welcome  langkah 1: identitas (nama, panggilan, peran di lab)
               langkah 2: khusus mahasiswa (angkatan, NIM, topik riset, pembimbing)
  -> status "Menunggu persetujuan" (halaman tunggu, bisa ubah isian)
  -> admin menyetujui di /account > Anggota lab (sekaligus memilih board awal)
  -> akses penuh: Kanban, Inventory, dll.
```

Status akun:

| Status | Arti | Akses |
|---|---|---|
| `pending` | baru daftar atau belum disetujui | hanya `/welcome` dan `/account` (profil sendiri) |
| `active` | anggota lab | semua alat internal sesuai peran |
| `suspended` | dinonaktifkan (mis. sudah tidak di lab) | seperti `pending`; data dan riwayatnya tetap ada |
| `rejected` | pendaftaran ditolak | hanya pesan penolakan dan Sign out |

Peran:
- **Peran sistem**: `admin` atau anggota biasa. Admin menyetujui akun, mengubah status, dan menunjuk admin lain.
- **Peran di lab** (informasi, dipakai untuk default dan filter): Dosen, Peneliti, Staf, Mahasiswa S3,
  Mahasiswa S2, Mahasiswa S1, Alumni, Mitra.

Halaman:

| Route | Isi |
|---|---|
| `/sign-up` | tambah kolom nama lengkap, centang persetujuan Terms of Use, keterangan bahwa akun perlu disetujui |
| `/sign-in` | tambah link "Lupa password?"; setelah login diarahkan sesuai status |
| `/forgot-password`, `/reset-password` | kirim email reset (Supabase) dan form password baru |
| `/welcome` (baru) | onboarding dua langkah dan halaman tunggu persetujuan |
| `/account` | bagian Profil ditambah peran, angkatan, NIM, topik, pembimbing; bagian baru **Anggota lab** khusus admin |
| `AuthGate` | selain cek login, cek status `active`; selain itu dialihkan ke `/welcome` |

## 3. Model data (`web/supabase/accounts.sql`, dijalankan manual)

Kolom baru di `profiles`:

| Kolom | Tipe | Catatan |
|---|---|---|
| `status` | text: pending, active, suspended, rejected | default `pending` |
| `is_admin` | boolean | default false |
| `lab_role` | text | salah satu peran di lab |
| `cohort` | integer | angkatan, khusus mahasiswa |
| `student_id` | text | NIM/NIP; hanya terlihat oleh pemilik dan admin |
| `research_topic` | text | |
| `supervisor_id` | uuid ke `profiles` | dipilih dari direktori Dosen dan Peneliti |
| `onboarded_at`, `approved_at`, `approved_by` | | jejak onboarding dan persetujuan |

Keamanan (semuanya ditegakkan di database, bukan hanya di tampilan):
- Trigger penjaga: pengguna biasa **tidak bisa** mengubah `status`, `is_admin`, `approved_*` miliknya sendiri.
- Fungsi `is_lab_member()` (status active) dan `is_lab_admin()`.
- RPC admin (security definer, cek `is_lab_admin()`): `lab_accounts()` (daftar akun beserta email),
  `lab_review_account(id, status, boards)`, `lab_set_admin(id, flag)`.
- `lab_directory()`: anggota aktif dengan nama, panggilan, peran, angkatan, topik, pembimbing, avatar.
  Tanpa email dan NIM.
- Policy yang sekarang `using (true)` untuk `authenticated` diganti `is_lab_member()`: inventaris,
  log pemakaian, buku tamu (baca), link events (baca). Isian publik buku tamu dan link events tetap terbuka.
- Bootstrap: semua akun yang sudah ada diset `active` agar tidak ada yang terkunci; admin pertama
  ditunjuk dengan satu baris SQL (email Anda) di SQL editor.

## 4. Integrasi Kanban

| Fitur | Perubahan |
|---|---|
| Hak akses | `kanban_role()` mensyaratkan `is_lab_member()`: akun pending atau suspended tidak melihat board apa pun, termasuk Team |
| Board awal | saat menyetujui akun, admin mencentang board yang langsung diikuti, dengan default per peran (mahasiswa: Riset Mahasiswa dan Publikasi sebagai member; asisten riset: juga SmartAgri Assistant; dosen: semua board sebagai member) |
| Tambah anggota | Menu > Members memakai pencarian nama dari `lab_directory()`; email tetap bisa sebagai cadangan |
| Nama dan avatar | otomatis rapi karena nama wajib diisi saat onboarding |
| Riset Mahasiswa | saat mahasiswa disetujui, dibuat card "Nama (angkatan)" di list Mahasiswa dengan label jenjang (S1, S2, S3) dari profil, serta mahasiswa dan pembimbingnya sebagai anggota card |
| Filter | filter tambahan "Pembimbing" dan "Peran" di panel filter, memakai data profil |
| Akun dinonaktifkan | tetap tercatat sebagai penulis komentar dan anggota card lama, tetapi tidak bisa membuka board |

## 5. Pengaturan Supabase yang perlu Anda lakukan (sekali)

- Authentication > Providers > Email: **Confirm email** aktif.
- Authentication > URL Configuration: Site URL `https://smart-agri.id`, Redirect URLs ditambah
  `https://smart-agri.id/reset-password` dan `http://localhost:3000/reset-password`.
- Authentication > Policies: panjang password minimal 8 (form juga akan meminta 8).
- Templat email (opsional): ubah teks email konfirmasi dan reset ke Bahasa Indonesia.

## 6. Tahapan implementasi

| Tahap | Isi | Perlu dari Anda |
|---|---|---|
| A | `accounts.sql` (kolom, trigger penjaga, fungsi, RPC, policy baru), `AuthGate` cek status, `/welcome` onboarding dan halaman tunggu, sign up dengan nama | jalankan SQL, tunjuk admin pertama |
| B | bagian **Anggota lab** di `/account` (setujui, tolak, nonaktifkan, jadikan admin, pilih board awal), profil diperluas | |
| C | integrasi Kanban: `kanban_role` mensyaratkan anggota aktif, pemilih anggota dari direktori, card Riset Mahasiswa otomatis, filter Pembimbing/Peran | jalankan SQL tambahan |
| D | lupa password dan reset password, perapian teks dan email | atur Redirect URLs di Supabase |

Tidak ada dependency atau layanan pihak ketiga baru; semuanya memakai Supabase Auth dan Postgres yang sudah ada.
