# 🖼️ Setup Gallery Sync from Google Drive (sekali jalan)

Alih-alih mengunggah foto satu per satu lewat `/admin`, taruh foto di sebuah
folder Google Drive dan jalankan importer. Skrip akan mengambil setiap foto,
mengompres ke WebP, menempelkan watermark smartagri (ikon + `smart-agri.id` di
pojok kanan bawah), menyimpannya ke `public/brand/uploads/gallery/`, dan
memperbarui album di `src/content/gallery/`.

## Struktur folder di Drive

```
gallery smartagri (folder ROOT, share "anyone with the link")
├── 021224 - Pelatihan Drone VTOL      <- folder kegiatan: DDMMYY - NAMA KEGIATAN
│   └── Kurasi Konten Website          <- HANYA folder ini yang diimpor
│       ├── 01.jpg
│       └── 02.jpg
├── 150324 - Kunjungan Lapangan Sleman
│   └── Kurasi Konten Website
│       └── ...
└── ...
```

- **Satu folder kegiatan = satu album.** Namanya `DDMMYY - NAMA KEGIATAN`;
  importer mengambil **tanggal** dari `DDMMYY` dan **judul** dari bagian setelah
  " - ".
- Foto yang tampil di web hanya yang ada di subfolder **`Kurasi Konten Website`**.
  Foto lain di folder kegiatan diabaikan (belum dikurasi).
- Folder kegiatan yang **belum** punya `Kurasi Konten Website` otomatis dilewati.
- Metadata lain (kategori, lokasi, deskripsi) dirapikan lewat `/admin` setelah
  impor. Re-impor **tidak** menimpa metadata itu, hanya menyegarkan daftar foto.

## Langkah 1 — Share folder

Klik kanan folder ROOT → **Share** → **Anyone with the link** → **Viewer**.
Salin ID folder dari URL: `drive.google.com/drive/folders/<INI_ID_NYA>`.

## Langkah 2 — Google API key (Drive API)

1. Buka [console.cloud.google.com](https://console.cloud.google.com) → buat/pilih
   project.
2. **APIs & Services → Library** → aktifkan **Google Drive API**.
3. **APIs & Services → Credentials → Create credentials → API key**.
4. (Disarankan) **Restrict key** → API restrictions → hanya **Google Drive API**.
   Key ini hanya membaca file yang sudah publik.

## Langkah 3 — Jalankan importer

```bash
cd web
GOOGLE_API_KEY=<API_KEY> DRIVE_GALLERY_FOLDER_ID=<FOLDER_ID> npm run import-gallery
```

Skrip menampilkan tiap album + jumlah foto yang diimpor. Foto yang sudah pernah
diunduh dilewati (re-run cepat). Setelah selesai, commit hasilnya (foto WebP +
JSON album) lalu Vercel akan men-deploy.

> Ingin otomatis lewat GitHub Action (mirip importer berita WordPress)? Simpan
> `GOOGLE_API_KEY` dan `DRIVE_GALLERY_FOLDER_ID` sebagai **repository secrets**,
> lalu kita tambahkan workflow `workflow_dispatch`/terjadwal yang menjalankan
> `npm run import-gallery` dan meng-commit hasilnya.

## Catatan

- Watermark ditempel permanen saat impor; gambar yang tayang sudah ber-watermark.
- Menyajikan gambar **langsung** dari URL Drive tidak dipakai karena rawan
  throttle/kuota; importer ini membuat gambar tetap self-hosted (cepat & andal).
