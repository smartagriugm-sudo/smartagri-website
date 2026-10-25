# Import board Trello ke Kanban smartagri

Skrip satu kali: `web/scripts/import-trello.mjs` (pemetaan di `web/scripts/trello-map.mjs`,
panggilan Trello API di `web/scripts/trello-api.mjs`). Menulis lewat anon key dengan sesi
akun Anda sendiri, jadi RLS tetap berlaku (tanpa `service_role`). Akun yang menjalankan
menjadi owner board baru.

Tanpa Trello API, import memakai isi file ekspor saja. Ekspor JSON Trello hanya memuat
1000 aksi terakhir (komentar lama hilang) dan tidak menyertakan file gambar. Dengan API key
dan token Trello milik Anda (hanya baca), skrip juga mengambil **seluruh riwayat komentar**
dan menyalin **gambar cover** ke Supabase Storage dalam format WebP (lebar maksimal 1200 px).

## 1. Ekspor dari Trello

Di board Trello: **Menu > Print, export, and share > Export as JSON**. Di tab yang terbuka,
tekan **Ctrl+S** dan simpan sebagai `board.json` di folder **Downloads**, **di luar repo**.
File itu berisi data tim dan repo ini publik.

## 2. (Opsional) Peta anggota

Buat `members.json` di Downloads (Notepad, Save as type: All Files, encoding UTF-8) yang
memetakan username atau nama lengkap Trello ke email akun smartagri:

```json
{
  "andrewnugroho": "andrew@ugm.ac.id",
  "Ardan Wiratmoko": "ardan@ugm.ac.id"
}
```

Orang yang dipetakan ditambahkan sebagai member board dan dipasang ke card. Akunnya harus
sudah terdaftar di smartagri. Orang yang tidak dipetakan tidak dipasang ke card, tetapi nama
mereka tetap tercantum di setiap komentar yang diimpor. Anggota juga bisa ditambahkan nanti
lewat **Menu > Members** di board.

## 3. (Opsional, disarankan) Buat API key dan token Trello

1. Buka <https://trello.com/power-ups/admin> dan klik **New**. Pilih **My app doesn't use
   Power-up capabilities** (skrip hanya membaca lewat API, jadi kolom *Iframe connector URL*
   tidak diperlukan dan akan hilang). Isi nama (misalnya "smartagri import"), pilih
   Workspace, email, support contact, dan author, lalu **Create**.
2. Di halaman app, menu kiri **Authorization > Trello Auth** (bukan *OAuth 2.0*: halaman itu
   tidak perlu diisi), klik **Generate a new API key**, lalu salin **API key**.
3. Buka alamat ini (ganti `KEY_ANDA` dengan key tadi). Token yang diminta hanya bisa
   **membaca** dan kedaluwarsa dalam **1 hari**:

   ```
   https://trello.com/1/authorize?expiration=1day&scope=read&response_type=token&name=smartagri%20import&key=KEY_ANDA
   ```

4. Klik **Allow**, salin token yang muncul. Jangan simpan key dan token di repo atau `.env`.

## 4. Buka PowerShell di folder `web`

```
cd "C:\Users\USER\Research\Landing Page SmartAgri\web"
```

Kalau memakai Trello API, isi key dan token untuk sesi terminal ini (token ditanyakan tanpa
ditampilkan dan tidak masuk riwayat PowerShell):

```
$env:TRELLO_KEY = "KEY_ANDA"
$t = Read-Host "Token Trello" -AsSecureString
$env:TRELLO_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($t))
```

## 5. Coba dulu tanpa menulis apa pun

```
node scripts/import-trello.mjs --file $HOME\Downloads\board.json --dry-run
```

Tambahkan `--members $HOME\Downloads\members.json` kalau memakai peta anggota. Hasilnya
ringkasan jumlah list, card, label, checklist, komentar, lampiran, dan (dengan API) jumlah
cover yang akan disalin. Dengan API, dry run juga sudah membaca seluruh komentar dari Trello
(hanya membaca), jadi angka komentarnya adalah angka sebenarnya.

## 6. Import

Kalau sebelumnya sudah pernah import, hapus dulu board lama lewat **Menu (⋯) > Archive or
delete board > Delete board permanently**, supaya tidak ada dua salinan.

Lalu, di jendela PowerShell yang sama:

```
$env:IMPORT_EMAIL = "anda@ugm.ac.id"
$pw = Read-Host "Password smartagri" -AsSecureString
$env:IMPORT_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pw))
node scripts/import-trello.mjs --file $HOME\Downloads\board.json --name "Smart Agriculture UGM"
```

Dengan API, skrip menampilkan kemajuan `Reading comments from Trello: N` lalu
`Covers 120/378`, dan di akhir `Done. Open /kanban/<slug>`. Cover yang gagal diunduh
dilewati dan disebutkan di akhir, tanpa membatalkan import. Kalau langkah lain gagal,
board yang setengah jadi otomatis dihapus lagi (kecuali dengan `--keep-partial`).

## 7. Bersihkan kredensial

```
Remove-Item Env:IMPORT_PASSWORD, Env:TRELLO_TOKEN, Env:TRELLO_KEY; Remove-Variable pw, t
```

Lalu cabut token di Trello: avatar Anda > **Settings** > **Applications** (atau
<https://trello.com/my/account>), cari "smartagri import", klik **Revoke**. Integrasi di
<https://trello.com/power-ups/admin> boleh dihapus juga.

## Opsi

| Opsi | Arti |
|---|---|
| `--members <file>` | peta anggota (langkah 2) |
| `--name <teks>` | nama board (bawaan: nama board Trello) |
| `--visibility team` | semua pengguna login bisa melihat (bawaan: private) |
| `--no-comments` | lewati komentar |
| `--include-trello-files` | ikutkan file yang di-upload ke Trello sebagai tautan (hanya bisa dibuka dengan login Trello) |
| `--dry-run` | hanya laporan, tidak menulis ke Supabase |
| `--keep-partial` | jika gagal, jangan hapus board yang setengah jadi |

## Yang diimpor dan yang tidak

| Trello | Hasil di smartagri |
|---|---|
| List (termasuk yang diarsip) | list, urutan sama; list arsip masuk Archived items |
| Card (termasuk yang diarsip) | card, urutan dan nomor mengikuti Trello; judul, deskripsi, start/due, status selesai |
| Label | label board; warna dipetakan ke palet smartagri (pink menjadi merah, hitam menjadi slate) |
| Anggota card | hanya yang ada di peta anggota |
| Checklist dan item | checklist, item, dan status centang |
| Komentar | komentar atas nama pengimpor, dengan baris "From Trello, by Nama on tanggal" dan tanggal asli; dengan API seluruh riwayat, tanpa API hanya yang ada di 1000 aksi terakhir |
| Cover gambar | dengan API: disalin sebagai WebP ke Storage dan dipasang sebagai cover; tanpa API: dilewati |
| Cover warna | cover warna |
| Lampiran tautan ke situs lain | lampiran tautan |
| File lain yang di-upload ke Trello | dilewati (sekitar 12,8 GB di board tim); bisa diikutkan sebagai tautan dengan `--include-trello-files` |
| Riwayat aktivitas Trello | tidak diimpor; log aktivitas smartagri mulai dari saat import |
| Power-Ups, custom fields, stickers, vote | tidak diimpor |

## Kalau ada masalah

| Pesan | Artinya |
|---|---|
| `Could not read Trello export ...` | file tidak ditemukan atau bukan JSON |
| `This does not look like a Trello board export` | file yang dipilih bukan ekspor board |
| `Trello rejected the key or token (401)` | key atau token salah atau sudah kedaluwarsa; buat token baru (langkah 3) |
| `Set IMPORT_EMAIL and IMPORT_PASSWORD` | baris email/password di langkah 6 terlewat |
| `Sign-in failed` | email atau password smartagri salah |
| `Note: could not add email@...` | email itu belum punya akun smartagri; import tetap jalan |
| `Stopped: ... The new board was deleted again` | ada langkah yang gagal; tidak ada data yang tersisa |

## Lanjutan: pecah board hasil impor menjadi 5 board

`scripts/restructure-kanban.mjs` menyalin board hasil impor ke lima board sesuai
`docs/kanban/rekomendasi-workflow.md` (Publikasi, Hibah/Proyek/Lomba, SmartAgri Library,
Riset Mahasiswa, SmartAgri Assistant; visibilitas Team). Board asal hanya dibaca, tidak diubah.
Card tanpa aktivitas lebih dari setahun dan isi list Arsip langsung diarsipkan (Library tetap aktif).
SmartAgri Assistant dibuat kosong; jenjang S1/S2/S3 di Riset Mahasiswa ditandai manual dengan label.

Dari folder `web/` di PowerShell:

```powershell
$env:IMPORT_EMAIL = "anda@ugm.ac.id"
$pw = Read-Host "Password smartagri" -AsSecureString
$env:IMPORT_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pw))
node scripts/restructure-kanban.mjs --from 5394811a --trello-export "$HOME\Downloads\board.json" --dry-run
node scripts/restructure-kanban.mjs --from 5394811a --trello-export "$HOME\Downloads\board.json"
Remove-Item Env:IMPORT_PASSWORD; Remove-Variable pw
```

`--trello-export` opsional; tanpa itu tanggal aktivitas terakhir diperkirakan dari komentar dan lampiran.
Kalau gagal di tengah, kelima board baru dihapus lagi otomatis.
