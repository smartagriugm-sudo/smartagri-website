# 🔄 Sinkronisasi berita dari situs lama (WordPress) ke situs baru

Berita dari situs lama (`smartagri.tp.ugm.ac.id`) ditarik otomatis menjadi
Field Notes di situs baru: gambar dikonversi ke WebP, isi HTML diubah ke
Markdown, lalu di-commit, sehingga Vercel otomatis rebuild dan tayang.

- Skrip: `web/scripts/import-wp.mjs` (sumber data: WordPress REST API).
- Otomatisasi: `.github/workflows/import-wp-news.yml`.
- Gambar tersimpan di `web/public/brand/uploads/notes/`.
- Tiap artikel impor menyimpan `wpId` (anti-duplikat) dan `sourceUrl` (tautan
  "Read the original" di halaman artikel).

## Cara kerja

1. **Webhook (near-real-time):** saat Anda klik Publish di WordPress, WordPress
   mengirim sinyal ke GitHub → workflow jalan → berita baru di-commit →
   Vercel deploy. Jeda total ±1-3 menit.
2. **Jadwal (cadangan):** workflow juga jalan tiap 15 menit sebagai jaring
   pengaman kalau webhook terlewat. Jadi tanpa webhook pun berita tetap masuk,
   hanya lebih lambat (maks ~15 menit).
3. **Manual:** bisa dijalankan kapan saja dari tab Actions GitHub (tombol
   "Run workflow") atau lokal: `cd web && node scripts/import-wp.mjs`.

Skrip bersifat idempoten: artikel yang sudah ada (berdasar `wpId` atau nama
file) dilewati, jadi aman dijalankan berkali-kali.

## Mengaktifkan webhook near-real-time (sekali setup)

### Langkah 1 - Buat GitHub token
1. GitHub → Settings → Developer settings → **Fine-grained tokens** → Generate.
2. Repository access: pilih repo `smartagriugm-sudo/smartagri-website`.
3. Permissions → Repository → **Contents: Read and write** (cukup untuk memicu
   `repository_dispatch`). Metadata otomatis read-only.
4. Salin tokennya (hanya tampil sekali).

### Langkah 2 - Kirim sinyal dari WordPress saat publish
Pilih salah satu:

**A. Lewat snippet (mu-plugin), paling ringan.** Buat file
`wp-content/mu-plugins/notify-new-site.php` di situs lama:

```php
<?php
// Beritahu situs baru setiap ada post dipublikasikan.
add_action('publish_post', function ($post_id) {
  if (wp_is_post_revision($post_id)) return;
  wp_remote_post(
    'https://api.github.com/repos/smartagriugm-sudo/smartagri-website/dispatches',
    [
      'headers' => [
        'Authorization' => 'Bearer ' . GITHUB_DISPATCH_TOKEN,
        'Accept'        => 'application/vnd.github+json',
        'Content-Type'  => 'application/json',
        'User-Agent'    => 'smartagri-wp',
      ],
      'body'    => wp_json_encode(['event_type' => 'wp-publish']),
      'timeout' => 15,
    ]
  );
}, 10, 1);
```

Lalu tambahkan token di `wp-config.php`:

```php
define('GITHUB_DISPATCH_TOKEN', 'ghp_xxx_token_dari_langkah_1');
```

**B. Lewat plugin tanpa koding.** Pasang plugin "WP Webhooks":
- Trigger: **Post published**.
- Action: kirim **POST** ke
  `https://api.github.com/repos/smartagriugm-sudo/smartagri-website/dispatches`
- Header: `Authorization: Bearer <token>`, `Accept: application/vnd.github+json`,
  `User-Agent: smartagri-wp`.
- Body (JSON): `{"event_type":"wp-publish"}`.

### Uji
Publikasikan satu berita uji di situs lama, lalu cek tab **Actions** di GitHub:
workflow "Import WordPress news" harus jalan, dan berita muncul di situs baru
dalam beberapa menit.

## Terjemahan otomatis ke Inggris (opsional)

Karena situs baru default berbahasa Inggris sedangkan situs lama berbahasa
Indonesia, importer bisa menerjemahkan judul, excerpt, dan isi artikel ke
Inggris memakai Anthropic Claude API, sambil menjaga format Markdown, gambar,
dan nama diri. Versi Indonesia asli tetap disimpan di field `original` untuk
fitur dwibahasa (toggle EN/ID) yang akan ditambahkan nanti.

Aktif **hanya** bila environment `ANTHROPIC_API_KEY` tersedia. Tanpa itu,
artikel diimpor apa adanya dalam bahasa Indonesia (tanpa error).

**Mengaktifkan:**
1. Buat API key di https://console.anthropic.com/ .
2. GitHub repo → Settings → Secrets and variables → Actions → New repository
   secret → nama `ANTHROPIC_API_KEY`, isi tokennya. Workflow sudah membaca
   secret ini otomatis.
3. Opsional: `TRANSLATE_MODEL` (default `claude-haiku-4-5-20251001`, model cepat
   dan murah untuk terjemahan).

**Menerjemahkan berita yang sudah terlanjur diimpor (backfill):** artikel yang
sudah ada normalnya dilewati, jadi sediakan sekali pemicu khusus. Paling mudah,
**tanpa koding**: setelah secret `ANTHROPIC_API_KEY` terpasang, buka GitHub →
tab **Actions** → workflow **Import WordPress news** → **Run workflow** →
centang **retranslate** → Run. Workflow akan mengimpor ulang semua berita dalam
bahasa Inggris dan commit otomatis (gambar tidak diunduh ulang).

Alternatif lokal (kalau key ada di mesin Anda):

```
# dari folder web/
RETRANSLATE=true ANTHROPIC_API_KEY=sk-ant-... node scripts/import-wp.mjs
```

Biaya terjemahan kecil (model Haiku, sekitar beberapa dolar untuk seluruh
backfill, lalu sen per artikel baru).

## Batasan saat ini
- Hanya **menambah berita baru**. Perubahan/edit atau penghapusan artikel di
  situs lama belum ikut tersinkron (bisa ditambahkan nanti bila perlu).
- Pemetaan kategori mengikuti daftar tetap situs baru; tag yang tidak cocok
  diabaikan. Setelah terimpor, artikel tetap bisa disunting via `/admin`.
- Konten impor berbahasa Indonesia (sesuai situs lama), jadi akan bercampur
  dengan artikel berbahasa Inggris yang sudah ada, sesuaikan bila perlu.
