# 📋 Form Konten Website smartagri

Isi bagian-bagian di bawah ini (langsung ketik setelah tanda `➡`), lalu serahkan
kembali file ini. Semua yang belum diisi akan tetap memakai placeholder yang
sekarang — website tetap jalan, jadi isi bertahap pun tidak masalah.

Penanda prioritas:
- 🔴 **WAJIB** — placeholder-nya terlihat jelas oleh pengunjung
- 🟡 **PENTING** — meningkatkan kredibilitas, tapi placeholder masih masuk akal
- ⚪ **OPSIONAL** — pelengkap

---

## 0. Keputusan Dasar (jawab dulu, memengaruhi semua konten)

1. 🔴 **Bahasa situs** — saat ini seluruh konten berbahasa **Inggris**.
   Pilih: `[ ] Inggris saja  [ ] Indonesia saja  [ ] Bilingual (jelaskan prioritasnya)`
   ➡ Bilingual (Inggris dan Indonesia sama sama menjadi prioritas)

2. 🔴 **Nama resmi lembaga & afiliasi** — nama lengkap pusat riset dan
   universitas/fakultas induknya (dipakai di About Us, footer, copyright).
   ➡ Smart Agriculture Research Center, Departemen Teknik Pertanian dan Biosistem, Fakultas Teknologi Pertanian, Universitas Gadjah Mada
   ➡ Smart Agriculture Research Center, Departmen of Agricultural and Biosystems Engineering, Faculty of Agricultural Technology, Universitas Gadjah Mada

3. 🟡 **Domain resmi** — sekarang memakai contoh `smartagri.id` (email & link).
   ➡ domain: smartagri.id; email: hello@smartagri.id 

4. 🟡 **Backend form kontak** — sekarang tombol Submit membuka draf email
   (`mailto:`), tanpa menyimpan data. Kalau ingin form yang mengirim langsung,
   perlu layanan gratis seperti Formspree/Web3Forms (saya yang pasang, Anda
   cukup buat akunnya). Pilih: `[ ] mailto saja (sekarang)  [ ] Formspree  [ ] Web3Forms  [ ] lainnya`
   ➡ gunakan seadanya dulu, nanti akan saya update pilihan mana yang akan saya pilih

---

## 1. Aset Media (taruh file di `web/public/brand/` dengan nama persis ini)

| Status | File | Spesifikasi | Dipakai di |
|---|---|---|---|
| 🔴 | `hero.mp4` | Video drone/lahan, landscape, ideal 1920×1080, ≤10 MB, tanpa audio penting (diputar mute & loop) | Latar hero landing |
| 🔴 | `field.jpg` | Foto lahan/greenhouse, landscape, ≥1200px | Latar kartu carousel riset |
| 🔴 | `farmer.jpg` | Foto petani/kegiatan lapangan, portrait/square, ≥800px | Seksi Voices |
| 🟡 | Foto tim (8 file) | Square, ≥400×400px, beri nama `team-<nama>.jpg` | Halaman About Us |
| 🟡 | Logo mitra (per mitra) | SVG/PNG transparan, beri nama `partner-<nama>.svg` | Marquee Partners & blok Voices |
| ⚪ | Foto sampul artikel | Landscape ≥800px, `note-<slug>.jpg` | Kartu Field Notes |

> Logo smartagri (4 varian) sudah terpasang — tidak perlu dikirim ulang.

---

## 2. Landing Page

### 2a. Hero 🔴
- Headline saat ini: "Meet smartagri. *Cultivating the future* with intelligent farming" — ganti? (kosongkan jika sudah pas)
  ➡ pakai yang sudah ada dulu
- Paragraf kiri-bawah (deskripsi 2–3 kalimat tentang pusat riset):
  ➡ pakai yang sudah ada dulu
- Dua pill kanan-bawah (frasa singkat, mis. "Solutions for real-world fields"):
  ➡ pakai yang sudah ada dulu

### 2b. Partners (marquee) 🔴
Daftar mitra nyata (institusi/perusahaan/koperasi). Placeholder sekarang: AgriTech Lab, GreenField Institute, FieldWorks, AgroNova, TerraSense, CropMind.
Format: `Nama mitra — (ada logo? ya/tidak)`
➡ 1. Kyushu University, Japan (College) (ada logo)
➡ 2. Kangwon National University, South Korea (College) (ada logo)
➡ 3. Chungnam National University, South Korea (College) (ada logo)
➡ 4. Seoul National University, South Korea (College) (ada logo)
➡ 5. Maejo University, Thailand (College) (ada logo)
➡ 6. Kasetsart University, Thailand (College) (ada logo)
➡ 7. Universiti Putra Malaysia, Malaysia (College) (ada logo)
➡ 8. Wageningen University & Research, Netherlands (College) (ada logo)
➡ 9. Badan Meteorologi, Klimatologi, dan Geofisika (BMKG), Indonesia (Institutions) (ada logo)
➡ 10. Kementerian Pekerjaan Umum (PU), Indonesia (Ministry) (ada logo)
➡ 11. Kementerian Pertanian, Indonesia (Ministry) (ada logo)
➡ 12. Pertamina Patra Niaga, Indonesia (BUMN) (ada logo)
➡ 13. Wilmar International, Indonesia (Private) (ada logo)
➡ 14. Bisi International, Indonesia (Private) (ada logo)
➡ 15. Hidronav Tehnikatama, Indonesia (Private) (ada logo)
➡ 16. Quantum System, Indonesia (Private) (ada logo)
➡ 17. Tribuana Solusi Inovasi Teknologi, Indonesia (Private) (ada logo)
➡ 18. Indosat Ooredoo Hutchison, Indonesia (Private) (ada logo)
➡ 19. NVIDIA, USA (Private) (ada logo)
➡ 20. Inamas Sintesis Teknologi, Indonesia (Private) (ada logo)
➡ 21. Cendekia Prima Inovasi, Indonesia (Private) (ada logo)
➡ 22. Adidaya Pertanian dan Pangan Indonesia (AGRARISE), Indonesia (Private) (ada logo)
➡ 23. Berkah Harmoni Makmur (BHM), Indonesia (Private) (ada logo)
➡ 24. Sistem Pengelolaan Irigasi (SIPASI), Indonesia (ada logo)
➡ 25. Pusat Kajian Modernisasi Irigasi dan Pertanian, Indonesia (ada logo)
➡ 26. PUAPT UGM (ada logo)
➡ 27. WGFS 1.2 Precision Agriculture and Smart Farming (ada logo)
➡ 28. Ehime University, Japan (College) (ada logo)
➡ 29. Perhimpunan Teknik Pertanian, Indonesia (Organization) (ada logo)
➡ (tambah sesuai kebutuhan, minimal 5 agar marquee terlihat bagus)

### 2c. Voices (testimonial) 🔴
- Kutipan testimonial (2–4 kalimat, dari mitra/petani nyata):
  ➡
- Nama pemberi testimonial: ➡
- Jabatan & organisasi: ➡
- Nama & logo mitra untuk blok kecil di bawah foto (sekarang "GreenField"):
  ➡

---

## 3. Statistik Impact 🔴
(dipakai di landing & halaman /impact — angka boleh dibulatkan, sebutkan jika perlu kata "+")

| Placeholder sekarang | Angka asli | Label asli (jika beda) |
|---|---|---|
| 24+ proyek riset aktif | ➡ | ➡ |
| 120+ mitra tani & koperasi | ➡ | ➡ |
| 38 publikasi peer-review | ➡ | ➡ |
| 12k+ hektar termonitor | ➡ | ➡ |

Konten halaman /impact lainnya (3 kartu "For farmers / For science / For policy" dan kutipan) — koreksi bila perlu:
➡

---

## 4. Area Riset (7 kartu, dipakai di landing & /research) 🟡
Placeholder sekarang: Precision Irrigation, Crop Disease Detection, Yield Prediction, Soil Health Monitoring, Drone Field Mapping, Climate Analytics, Smart Greenhouse — masing-masing dengan deskripsi 1–2 kalimat.

- Apakah 7 area itu sudah sesuai? `[ ] ya  [ ] revisi (tulis di bawah)`
- Format revisi: `Nama area — deskripsi singkat`
  ➡ revisi
  ➡ Open Field Technology
  ➡ Modernization Irrigation
  ➡ Smart Estate Technology
  ➡ Smart UAV Technology
  ➡ Indoor Farming Technology
  ➡ Agro-Informatics

Alur kerja "Sense → Model → Act" di /research — koreksi bila perlu:
➡

---

## 5. Publications (8 entri placeholder) 🔴
Ganti dengan publikasi asli. Format per entri (urutkan terbaru dulu):

```
Tahun  : 
Judul  : 
Penulis: (format "Nama B., Nama C.")
Jurnal/venue:
Link DOI/URL:
```
➡ 1.
➡ 2.
➡ 3.
➡ (lanjutkan — berapa pun jumlahnya, saya sesuaikan)

---

## 6. Field Notes / Artikel (9 placeholder) 🟡
Berita, panduan, dan kegiatan nyata. Format per artikel:

```
Kategori : News / Research / Knowledge / Events
Tanggal  : 
Judul    : 
Ringkasan: (2–3 kalimat)
Isi penuh / link: (opsional — kalau ada, nanti dibuatkan halaman detail)
Foto sampul: (nama file, opsional)
```
➡ 1.
➡ 2.
➡ 3.
➡ (idealnya ≥6 agar halaman terasa hidup)

---

## 7. About Us

### 7a. Misi & profil 🔴
- Kalimat misi (1–2 kalimat, sekarang: "Harness AI, sensing, and agronomy so every farmer... can grow more with less"):
  ➡
- Paragraf sejarah/afiliasi ("Rooted in research" — kapan berdiri, fakultas/universitas, fokus):
  ➡

### 7b. Bidang keahlian (4 kartu) 🟡
Sekarang: AI & Machine Learning, IoT Sensing Systems, Agronomy & Field Science, Extension & Partnerships — masing-masing dengan deskripsi + nama lead.
Koreksi nama bidang/deskripsi/lead:
➡

### 7c. Roster tim 🔴
Format per orang (urutan = urutan tampil; foto opsional, lihat §1):

```
Nama lengkap + gelar:
Jabatan/peran:
Foto: (nama file / "pakai avatar inisial")
```
➡ 1.
➡ 2.
➡ 3.
➡ (berapa pun jumlahnya — grid menyesuaikan)

---

## 8. Kontak & Lokasi 🔴

- Alamat lengkap (gedung, jalan, kecamatan, kota, kode pos):
  ➡ Jl. Flora Bulaksumur No.1, Kocoran, Caturtunggal, Kec. Depok, Kabupaten Sleman, Daerah Istimewa Yogyakarta 55281
- Titik koordinat / link Google Maps lokasi persis (untuk marker peta):
  ➡ 7°46'07.0"S 110°22'47.5"E
- Email resmi (tujuan form & footer; sekarang `hello@smartagri.id`):
  ➡ hello@smartagri.id
- Telepon/WhatsApp resmi:
  ➡
- Jam operasional (sekarang "Monday–Friday, 08.00–16.00 WIB"):
  ➡ Monday-Friday, 08.00-16.00 WIB

---

## 9. Footer & Legal

- 🔴 Akun sosial media (URL lengkap; yang kosong akan disembunyikan):
  - Instagram ➡ https://www.instagram.com/smartagri.ugm/
  - LinkedIn ➡ https://www.linkedin.com/company/sarc-ugm
  - YouTube ➡
  - GitHub ➡
  - Lainnya ➡
- 🟡 Deskripsi singkat lembaga di footer (1–2 kalimat):
  ➡
- 🟡 Teks copyright (sekarang "© 2026 Smart Agriculture Research Center"):
  ➡
- ⚪ Halaman Privacy Policy & Terms of Use — sekarang link mati. Pilih:
  `[ ] hapus link  [ ] buatkan halaman standar  [ ] saya punya dokumen sendiri`
  ➡

---

## 10. Lain-lain (opsional)

- Konten/halaman tambahan yang diinginkan (mis. galeri, agenda, halaman detail artikel, versi bahasa kedua):
  ➡
- Hal lain yang perlu saya tahu:
  ➡
