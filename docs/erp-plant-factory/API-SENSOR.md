# API sensor ERP smartagri

Kontrak untuk firmware dan perangkat yang mengirim bacaan ke ERP. ERP hanya memantau: tidak ada perintah yang
dikirim balik ke alat.

## Alur singkat

1. Teknisi mendaftarkan perangkat di `/erp/perangkat`: kode, lokasi, jenis bacaan, dan interval kirim.
2. Teknisi menekan **Buat token**. Token tampil sekali, lalu ditanam di firmware. Yang disimpan ERP hanya hash-nya.
3. Perangkat mengirim bacaan lewat HTTPS.

## Permintaan

```
POST https://smart-agri.id/api/pf/ingest
Authorization: Bearer pfd_xxxxxxxx
Content-Type: application/json
```

```json
{
  "readings": [
    { "metric": "suhu", "value": 24.3, "ts": "2026-11-06T04:00:00Z" },
    { "metric": "rh", "value": 71.5, "ts": "2026-11-06T04:00:00Z" }
  ]
}
```

| Kolom | Isi |
|---|---|
| `metric` | Salah satu kode di bawah, dan harus terdaftar pada perangkat itu |
| `value` | Angka mentah dari sensor. Koreksi kalibrasi diterapkan di ERP, bukan di firmware |
| `ts` | Waktu pengukuran dari alat, format ISO 8601 dengan zona waktu (UTC disarankan) |

Satu kiriman paling banyak 1000 bacaan. Bacaan dalam satu kiriman boleh berbeda waktu dan metrik.

### Kode metrik

| Kode | Bacaan | Satuan | Batas wajar |
|---|---|---|---|
| `suhu` | Suhu udara | °C | -10 sampai 60 |
| `rh` | Kelembapan relatif | % RH | 0 sampai 100 |
| `vpd` | Vapour pressure deficit | kPa | 0 sampai 10 |
| `co2` | CO₂ | ppm | 0 sampai 10000 |
| `cahaya` | Pencahayaan | lux | 0 sampai 200000 |
| `ph` | pH larutan | | 0 sampai 14 |
| `ec` | EC larutan | mS/cm | 0 sampai 20 |
| `do` | Oksigen terlarut | mg/L | 0 sampai 30 |
| `suhu_larutan` | Suhu larutan | °C | 0 sampai 60 |

## Jawaban

`200` berarti kiriman diproses. Periksa angka di dalamnya, karena sebagian bacaan bisa saja ditolak:

```json
{ "accepted": 2, "duplicates": 0, "rejected": 0, "errors": [] }
```

| Status | Arti | Yang sebaiknya dilakukan firmware |
|---|---|---|
| `200` | Diproses | Buang dari antrean, termasuk yang `rejected`, karena mengirim ulang tidak akan mengubah hasilnya |
| `400` | Isi kiriman tidak bisa dibaca | Jangan kirim ulang apa adanya, laporkan |
| `401` | Token tidak ada, salah, sudah diganti, atau perangkat dipensiunkan | Berhenti mengirim sampai token diperbarui |
| `413` | Lebih dari 1000 bacaan | Pecah kirimannya |
| `503` | Database tidak bisa dihubungi | Simpan dan kirim ulang nanti, dengan jeda yang makin panjang |

## Aturan yang perlu diketahui firmware

- **Interval kirim bebas.** API tidak bergantung pada interval. Nilai interval di `/erp/perangkat` hanya dipakai untuk
  menentukan kapan perangkat dianggap berhenti: setelah 3 kali interval tanpa kiriman.
- **Kirim ulang aman.** Bacaan dengan perangkat, metrik, dan `ts` yang sama diabaikan dan dihitung sebagai `duplicates`.
  Jadi, saat koneksi putus, firmware bisa mengantre lalu mengirim ulang tanpa takut data ganda.
- **`ts` harus waktu pengukuran**, bukan waktu kirim, dan jam alat harus benar (NTP). Ditolak bila lebih dari 5 menit di
  masa depan atau lebih dari 30 hari lalu.
- **Bacaan terlambat tetap tersimpan** di riwayat, tetapi tidak mengubah "bacaan terakhir" dan tidak memicu alarm.
- **Perangkat berstatus Perawatan** tetap diterima, tetapi tidak memicu alarm.
- **Lokasi tidak dikirim oleh alat.** ERP mencatat lokasi perangkat saat bacaan masuk. Kalau alat dipindah, ubah
  lokasinya di `/erp/perangkat`; bacaan lama tetap di lokasi lamanya.

## Contoh

```bash
curl -X POST https://smart-agri.id/api/pf/ingest \
  -H "Authorization: Bearer pfd_xxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"readings":[{"metric":"suhu","value":24.3,"ts":"2026-11-06T04:00:00Z"}]}'
```

Token adalah rahasia. Jangan menaruhnya di repo publik atau di log. Kalau bocor, tekan **Buat token** lagi: token lama
langsung mati.
