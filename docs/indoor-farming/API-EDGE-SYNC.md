# Field sites: data PC edge ke smart-agri.id

Layar **Field sites** (`/indoor-farming/dashboard/field`) menampilkan data terukur dari lokasi lapangan,
misalnya Smart Greenhouse Grabag. Data dikirim oleh **PC edge** di lokasi (dashboard lokal SGH), bukan oleh
tiap sensor. Website hanya membaca: tidak ada perintah yang dikirim balik ke lokasi.

```
[Engrow / Nutrigrow / AWS / relay] -> [PC edge: dashboard lokal + Postgres]
                                            |  HTTPS keluar, rata-rata 10 menit, sekali tiap 10 menit
                                            v
                         POST https://smart-agri.id/api/edge/ingest  (token lokasi)
                                            v
                         Supabase: edge_site, edge_device, edge_reading, edge_latest, edge_actuator
                                            v
             /indoor-farming/dashboard/field  (login; RLS memilah lokasi per akun)
```

## Siapa melihat apa

Diatur di database (RLS di `web/supabase/edge-sync.sql`), bukan hanya di tampilan:

| Akun | Akses |
|---|---|
| Admin lab | semua lokasi, plus panel **Manage field sites** |
| Anggota lab aktif (peran selain Mitra) | semua lokasi |
| Mitra (lab_role `mitra`) yang sudah disetujui | hanya lokasi yang ditambahkan admin untuknya |
| Akun pending, ditangguhkan, ditolak, atau pengunjung | tidak ada |

## Setup (sekali)

1. **SQL**: Supabase Dashboard > SQL Editor, jalankan isi `web/supabase/edge-sync.sql` (setelah
   `accounts.sql`). Aman dijalankan ulang. Lokasi pertama `sgh-grabag` ikut dibuat.
2. **Deploy website** seperti biasa. Route `POST /api/edge/ingest` memakai env yang sudah ada
   (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`); tidak ada secret baru.
3. **Token**: login sebagai admin, buka Field sites > Manage field sites > pilih lokasi > **Create token**.
   Token `edg_...` tampil sekali. Salin ke `.env` PC edge (lihat bawah). Membuat token baru langsung
   mematikan token lama.
4. **PC edge**: isi `.env` di folder dashboard edge, lalu `docker compose up -d --build goappu`:
   ```
   CLOUD_SYNC_URL=https://www.smart-agri.id/api/edge/ingest
   CLOUD_SYNC_TOKEN=edg_...
   ```
   Panduan lengkap sisi edge: `SGH/dashboard-main/SINKRON-WEBSITE.md` (di luar repo ini).
5. **Mitra**: mitra mendaftar di `/sign-up`, mengisi onboarding dengan peran **Partner**, admin
   menyetujui di Account > Lab members, lalu admin menambahkan email mitra di panel
   Manage field sites > Partner access.

## Permintaan

```
POST https://www.smart-agri.id/api/edge/ingest
Authorization: Bearer edg_xxxxxxxx
Content-Type: application/json
```

```json
{
  "devices": [
    { "source_id": "dev-1", "name": "Engrow 1", "kind": "engrow", "zone": "Zona A",
      "metrics": ["temperature", "humidity", "co2", "vpd", "battery"] }
  ],
  "actuators": [
    { "source_id": "act-4", "name": "Exhaust 1", "kind": "exhaust", "zone": "Zona A",
      "on": true, "mode": "auto", "online": true, "changed_at": "2026-11-16T03:10:00Z" }
  ],
  "actuators_complete": true,
  "readings": [
    { "device": "dev-1", "metric": "temperature", "value": 27.4, "ts": "2026-11-16T03:20:00Z" }
  ]
}
```

| Kolom | Isi |
|---|---|
| `devices[].source_id` | id perangkat di PC edge (`dev-<id>`). Apikey perangkat **tidak** dikirim |
| `devices[].kind` | `engrow`, `nutrigrow`, `aws`, atau `other` |
| `actuators[].mode` | `auto`, `manual` (override manual aktif), atau `pause` (node dijeda) |
| `actuators_complete` | `true` = daftar aktuator lengkap; aktuator yang tidak ada di daftar dihapus dari website |
| `readings[].device` | `source_id` perangkat (harus ada di `devices` kiriman ini atau sebelumnya) |
| `readings[].metric` | huruf kecil/angka/garis bawah. Dipakai: `temperature`, `humidity`, `co2`, `vpd`, `battery`, `water_temp`, `ph`, `ec`, `do`, `pressure`, `wind_speed`, `wind_dir` |
| `readings[].ts` | waktu ukur ISO 8601 dengan zona (UTC disarankan); maks 5 menit ke depan, maks 90 hari lalu |

Batas: 2000 bacaan dan 200 perangkat/aktuator per kiriman. Bacaan dengan perangkat, metrik, dan `ts`
yang sama **menimpa** nilai lama (rata-rata 10 menit di PC edge masih bisa berubah selama jendelanya
terbuka), jadi kirim ulang aman.

## Jawaban

| Status | Arti | Tindakan PC edge |
|---|---|---|
| `200` `{accepted, rejected, errors, devices, actuators}` | diproses | maju ke data berikutnya |
| `400` | isi tidak terbaca | laporkan, jangan ulang apa adanya |
| `401` | token salah atau sudah diganti | berhenti sampai token diperbarui |
| `413` | terlalu banyak bacaan | pecah kiriman |
| `503` | database tidak terjangkau | simpan, kirim ulang dengan jeda makin panjang |

## Volume dan perawatan

PC edge hanya mengirim **rata-rata 10 menit yang jendelanya sudah tutup**, satu kiriman per 10 menit
(sekitar 1,5 menit setelah jendela tutup). Satu lokasi dengan 3 Engrow, 1 Nutrigrow, 1 AWS: sekitar
25 bacaan per kiriman, 144 kiriman dan sekitar 3.600 bacaan per hari, kira-kira 1,3 juta baris per
tahun. Data di website paling baru berumur sekitar 12–22 menit. Pakai `www.smart-agri.id`: alamat tanpa
`www` dialihkan (308). Untuk menghapus data lama:
`select public.edge_prune(400);` (simpan 400 hari terakhir) di SQL Editor.
