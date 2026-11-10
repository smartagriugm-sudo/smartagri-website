# Dokumentasi smartagri

| Dokumen | Isi |
|---|---|
| [STATUS-PENGEMBANGAN.md](STATUS-PENGEMBANGAN.md) | Ringkasan naratif semua fitur yang sudah dibangun |

## Setup per fitur (`setup/`)

Panduan sekali jalan untuk menyiapkan layanan luar yang dipakai situs.

| Dokumen | Fitur |
|---|---|
| [SETUP-ADMIN-CMS.md](setup/SETUP-ADMIN-CMS.md) | CMS `/admin` untuk berita, publikasi, galeri |
| [SETUP-AUTH.md](setup/SETUP-AUTH.md) | Login dan daftar akun (Supabase Auth) |
| [SETUP-AI-SERVER.md](setup/SETUP-AI-SERVER.md) | Server AI on-prem (Ollama) untuk AI Assistant |
| [SETUP-CHAT-HISTORY.md](setup/SETUP-CHAT-HISTORY.md) | Riwayat percakapan AI Assistant |
| [SETUP-ERP-MODEL.md](setup/SETUP-ERP-MODEL.md) | Model 3D plant factory untuk ERP |
| [SETUP-GALLERY-SYNC.md](setup/SETUP-GALLERY-SYNC.md) | Sinkronisasi galeri dari Google Drive |
| [SETUP-INQUIRIES.md](setup/SETUP-INQUIRIES.md) | Inbox pertanyaan dari form kontak (Google Sheet) ([template](setup/smartagri-inquiries-template.xlsx)) |
| [SETUP-INVENTORY.md](setup/SETUP-INVENTORY.md) | Inventaris dan logbook instrumen PUAPT |
| [SETUP-NEWS-SYNC.md](setup/SETUP-NEWS-SYNC.md) | Impor berita otomatis dari situs lama |

## Brief konten (`konten/`)

| Dokumen | Isi |
|---|---|
| [FORM-KONTEN-SMARTAGRI.md](konten/FORM-KONTEN-SMARTAGRI.md) | Form isian konten situs |
| [INDOOR-FARMING-PHOTOS.md](konten/INDOOR-FARMING-PHOTOS.md) | Daftar dan brief foto Indoor Farming |
| [INDOOR-DASHBOARD-IMAGES.md](konten/INDOOR-DASHBOARD-IMAGES.md) | Brief gambar dashboard Indoor Farming |

## Rancangan fitur

| Folder | Isi |
|---|---|
| [erp-plant-factory/](erp-plant-factory/) | Rencana ERP plant factory (agrosphere), API sensor, diagram |
| [auth/](auth/) | Rancangan login |
| [kanban/](kanban/) | Rancangan papan kanban dan impor Trello |
