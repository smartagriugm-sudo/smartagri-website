# Rencana ERP Plant Factory (PFMS) · smartagri

Status: rancangan, dengan prototipe Overview 3D di `/erp` (data contoh). Rujukan: `plant-factory-management-system.md` (dokumen PFMS 4 lapisan).
Diagram pendukung (ERD, arsitektur, alur fase): buka `diagram-erp-plant-factory.html` di folder ini.

---

## 1. Ringkasan dokumen rujukan

Dokumen PFMS menyusun sistem dari bawah ke atas:

| Lapisan | Isi | Catatan untuk kita |
|---|---|---|
| 0 · Fondasi | Master lokasi (Rack · Tier · Lane · Hole), resep berversi, registry aset & kalibrasi, ingestion time-series, user/role/audit | Semua modul lain menempel ke `location_id` + waktu. Wajib dibangun dulu. |
| 1 · Inti operasional | Perencanaan, batch & lifecycle, lingkungan, fertigasi, lighting, tugas operator | Batch adalah "akar" data: costing, sales, dan traceability bergantung padanya. |
| 2 · Turunan bisnis | Inventori & pembelian, panen/QC, penjualan, CMMS, energi, biaya, SDM | Jangan dimulai sebelum batch tracking dipakai operator setiap hari. |
| 3 · Analitik | KPI plant factory, prediksi panen, computer vision, A/B resep, digital twin 2D/3D | Digital twin kita majukan ke Fase 1 sebagai *viewer* read-only (lihat §4). |

Prinsip kunci yang kita pegang: **lokasi + waktu adalah kunci join universal**, resep selalu berversi,
dan setiap perubahan setpoint/resep tercatat di audit log.

---

## 2. Penyesuaian terhadap codebase smartagri

Yang sudah ada dan bisa dipakai ulang:

- **Shell dashboard** `src/components/dashboard/AppShell.tsx` (`DashboardShell`), `parts.tsx`, `lib/dashboard-state`,
  serta pola route `indoor-farming_.dashboard.*` yang dipagari `RequireAuth`.
- **Model ruang & slot** di `lib/indoor-dashboard.ts` (`SITES`, `ROOM_LAYOUTS`, `GROW_SYSTEMS`, `Plant`, `batch`):
  saat ini data simulasi. ERP menggantinya dengan tabel `pf_location` yang nyata.
- **`FacilityMap`** (Leaflet, dimuat dinamis di browser): pola yang sama dipakai untuk viewer 3D (three.js tidak boleh ikut SSR).
- **`profiles`** (Supabase) sudah ada, dan peran ERP ditambahkan lewat `pf_user_role`. Persetujuan anggota lab oleh admin juga sudah ada.
- **Inventori instrumen lab** (`inventory.sql`) berbeda tujuan (alat riset, peminjaman). Inventori ERP (benih, nutrisi,
  media, kemasan, suku cadang) dibuat sebagai tabel `pf_item` tersendiri agar tidak mencampur dua domain.

Batasan dari `CLAUDE.md` yang memengaruhi desain:

- **Backend hanya Supabase (anon key) + route Nitro.** Akibatnya, data sensor dari perangkat tidak boleh ditulis langsung
  dengan key rahasia. Usulan: perangkat/edge mengirim ke `POST /api/pf/ingest` dengan **token perangkat**, lalu route
  memanggil RPC Postgres `pf_ingest(token, readings)` yang `security definer` dan memvalidasi hash token di `pf_asset`.
  Tanpa service_role key sama sekali.
- **Time-series:** Supabase tidak lagi menyediakan TimescaleDB di Postgres 17. Usulan: tabel `pf_sensor_reading`
  dipartisi per bulan (native partitioning) + index BRIN pada `ts`, ditambah tabel ringkasan `pf_reading_hourly`
  yang diisi `pg_cron`. Untuk volume lab (puluhan sensor, interval 1 menit) ini lebih dari cukup.
- **Layanan pihak ketiga baru perlu didiskusikan:** broker MQTT on-prem (Mosquitto) dan gateway notifikasi
  (WhatsApp/Telegram) adalah komponen baru. Keduanya baru dibutuhkan di Fase 1 akhir dan bisa ditunda (alarm awal
  cukup tampil di dashboard + email).
- Semua tabel ERP memakai prefiks `pf_` agar terpisah dari tabel situs (kanban, guestbook, dst.), dengan RLS per role.

---

## 3. Struktur menu ERP

Alamatnya `/erp/*`, karena SDM dan penjualan bukan bagian dari indoor farming.

| Menu | Isi versi pertama | Tahap |
|---|---|---|
| Dashboard | Batch per fase, jadwal pindah tanam dan panen, kondisi ruang, alarm, stok menipis, pesanan jatuh tempo. Kartu bertambah setiap modul selesai | 1 dan seterusnya |
| Budidaya | Batch, Persemaian (3D), Plant factory (3D), resep, catatan pertumbuhan, panen, standar grade dan QC. Input dari ponsel dan laptop | 2 |
| Monitoring | Daftar perangkat dan kalibrasi, grafik sensor, bacaan vs acuan resep, alarm | 2 |
| Penjualan | Pelanggan, pesanan, alokasi lot panen, pengiriman, invoice dengan pajak opsional, pembayaran, traceability | 3 |
| Inventory | Benih, nutrisi, media, kemasan, suku cadang; stok per lot; pembelian | 4 |
| SDM | Data orang, kontrak, jadwal, absensi dengan lokasi dan foto, izin, jam kerja per batch | 5 |
| Biaya | Biaya per batch dan per kg, pemeliharaan perangkat, laporan | 6 |
| Pengaturan | Peran pengguna dan audit log | 1 |

**Status saat ini: pemantauan saja.** ERP tidak mengirim perintah apa pun ke alat.

---

## 4. Digital twin 3D

Model dan mesin 3D berasal dari paket `plant-factory-3d` (dibangun di proyek sumbernya, `anyscene/plant-factory`):

- **Paket** ada di `web/vendor/plant-factory-3d-<versi>.tgz`, dengan `three` dikunci sesuai syarat paket (`0.170.0`).
- **Aset** (`plant_factory.glb`, `manifest.json`, `erp_seed/`) ada di `public/brand/plant-factory/`, direferensikan lewat
  `plantFactoryAssets` di `lib/assets.ts`. GLB tidak disunting di sini; perubahan model dibuat di proyek sumber.
- **Provider** `lib/pf/provider.ts` adalah cache yang dibaca mesin secara sinkron. Data ERP dimuat di luar mesin,
  disimpan di cache, lalu ditampilkan dengan `scene.refresh()`.
- **Overlay HTML** untuk kartu KPI, filter, dan panel detail tetap milik ERP, sesuai brand (Inter, teal).
- Mesin dimuat dinamis hanya di browser (`import()` di dalam effect), sehingga three.js tidak ikut halaman lain.

Aturan dari paket:

- **ID lubang** `R<rak>-T<tingkat>-G<talang>-H<lubang>` (contoh `R1-T2-G3-H12`) adalah kunci penghubung ERP dan model.
  R1 di barat, T1 di bawah, G1 di barat, H01 di utara.
- **Lampu dan pompa** hanya ditampilkan statusnya. Kalau kendali ditambahkan nanti, perintah harus lewat autentikasi,
  hak akses, dan konfirmasi, dan status berubah setelah server mengonfirmasi.
- **Objek `assumed: true`** (pompa dan sensor) belum dikonfirmasi, jadi tidak ditampilkan sebagai data pasti.

### Persemaian: growth chamber FPG450

Fase semai dan germinasi berjalan di growth chamber `CH1` (FAITHFUL FPG450), di `/erp/persemaian`.
Plant factory tetap di `/erp`. Keduanya memakai paket dan aset yang sama, tetapi mesin 3D masing-masing.

- **Satu batch, dua fasilitas.** `lib/pf/store.ts` (`ErpStore`) memegang batch, cache chamber, dan cache plant factory.
  Route layout ERP memilikinya, sehingga data tetap sama saat berpindah layar.
- **Pindah tanam** (`ErpStore.transplant`) memindahkan bibit dari nampan `siap_pindah` ke lubang kosong satu tingkat.
  Tiap lubang mencatat nampan asalnya. Bibit yang tidak muat tetap di nampan dan menunggu tingkat lain.
  Satu tingkat hanya menerima satu batch, dan tingkat yang masih sanitasi ditolak.
- **ID posisi** `CH<chamber>-S<rak>-P<nomor>` (contoh `CH1-S2-P03`) adalah kunci penghubung ERP dan model.
  Jumlah nampan per rak masih perkiraan dari foto, jadi tabel tidak boleh mengunci angka itu.
- **Pindah layar instan.** Kedua layar hidup di route layout (`ErpScreens`). Layar tersembunyi berhenti menggambar,
  tetapi tetap memakai memori GPU. Di layar lebar model kedua dimuat setelah yang pertama; di ponsel saat pertama dibuka.
- **Pintu** pada model hanya tampilan, bukan status pintu asli. **Nilai program germinasi** masih contoh, nantinya dari resep.

Pembaruan model: pasang `.tgz` versi baru, lalu jalankan `npx plant-factory-3d-assets public/brand/plant-factory` dari folder `web/`.

---

## 5. Alur pengembangan

| Tahap | Fokus | Hasil | Selesai bila |
|---|---|---|---|
| 0 | Dasar | Commit, kontrol alat dilepas, alamat pindah ke `/erp`, ERD disetujui | ERD disetujui |
| 1 | Fondasi | Lokasi, tanaman, resep berversi, peran, audit log, kerangka menu, dashboard awal | Semua lubang dan posisi nampan punya kode |
| 2 | Budidaya + sensor | Batch dari semai sampai panen, lot benih, input ponsel, API sensor, grafik, alarm | Operator mencatat batch harian; data sensor masuk stabil |
| 3 | Penjualan | Pelanggan, pesanan, alokasi lot panen, pengiriman, traceability | Satu pesanan bisa ditelusuri sampai lot benih |
| 4 | Inventory | Stok per lot, pemakaian otomatis per batch, pembelian | Stok fisik cocok dengan sistem |
| 5 | SDM | Data orang, kontrak, jadwal, absensi, izin, jam kerja per batch | Jadwal dan absensi dipakai satu bulan |
| 6 | Biaya | Biaya per batch dan per kg, pemeliharaan, laporan | Biaya per kg satu batch cocok dengan hitungan manual |

Penjualan dimajukan sebelum Inventory karena hasil panen harus segera tercatat. Agar jejak benih tidak terputus,
pencatatan lot benih dibangun sejak Tahap 2. Syarat lama "data sensor 7 hari tanpa putus" dipindah ke Tahap 2 dan
tidak lagi menjadi prasyarat modul lain.

Cara kerja per modul (sesuai kebiasaan proyek: satu komponen, disetujui satu per satu):

1. Migrasi SQL di `web/supabase/pf-<modul>.sql` (dijalankan manual) + RLS.
2. Tipe dan query di `web/src/lib/pf/<modul>.ts`.
3. Route ERP + komponen di `src/components/erp/`.

---

## 6. Model data (ERD)

Penjelasan dengan bahasa sehari-hari dan semua diagram ada di `diagram-erp-plant-factory.html`
(dibuat oleh `gen-erd.mjs`): perjalanan satu batch, traceability, jalur sensor, hak akses, lalu ERD per modul.

| Domain | Tabel |
|---|---|
| Fondasi | `pf_location` (satu pohon: site, ruang, rak, tingkat, talang, lubang; juga chamber, rak chamber, posisi nampan), `pf_crop`, `pf_recipe` (berversi), `pf_recipe_phase`, `pf_asset`, `pf_calibration`, `profiles` (sudah ada), `pf_user_role`, `pf_audit_log` |
| Budidaya | `pf_production_plan`, `pf_batch` (inti), `pf_batch_slot`, `pf_batch_event`, `pf_task`, `pf_harvest_lot`, `pf_grade`, `pf_grade_criterion`, `pf_qc_inspection`, `pf_qc_measurement` |
| Monitoring | `pf_sensor_reading` (partisi bulanan), `pf_reading_hourly`, `pf_recipe_target`, `pf_ingest_log`, `pf_alarm_rule`, `pf_alarm` |
| Penjualan | `pf_partner`, `pf_sales_order`, `pf_so_line` (kunci telusur), `pf_delivery`, `pf_invoice`, `pf_invoice_line`, `pf_tax_rate`, `pf_payment` |
| Inventory | `pf_item`, `pf_stock_lot`, `pf_stock_move`, `pf_purchase_order`, `pf_po_line` |
| SDM | `pf_person` (inti), `pf_contract` (sensitif), `pf_leave`, `pf_shift`, `pf_attendance`, `pf_labor_log` |
| Biaya | `pf_cost_entry`, `pf_maintenance_plan`, `pf_work_order` |

Keputusan desain penting:

- **Satu tabel lokasi**, supaya tabel lain cukup punya satu kolom `location_id`. ID model 3D (`R1-T2-G3-H12`, `CH1-S2-P03`)
  menjadi `code`. Jumlah nampan per rak hanya baris data, tidak terkunci di skema.
- **`pf_batch_slot` menyimpan `placed_at` / `removed_at`**, jadi "batch apa ada di mana pada waktu T" bisa dijawab.
  Pindah tanam menutup baris nampan dan membuka baris lubang, dengan `source_slot_id` menunjuk asalnya.
- **Sensor tidak menyimpan `batch_id`.** Kaitannya ditarik lewat lokasi + waktu.
- **Traceability:** `pf_so_line` wajib menunjuk `pf_harvest_lot`, `pf_harvest_lot` menunjuk `pf_batch`, dan satu batch memakai
  satu lot benih (`seed_lot_id`). Benih campur berarti dua batch.
- **Resep tidak pernah diedit di tempat.** Batch mengunci versi saat dibuat; `pf_recipe_target` memberi rentang acuan per fase.
- **Monitoring saja:** tabel setpoint dan log perintah alat dari rancangan lama dihapus.
- **`pf_person` terpisah dari `profiles`**, karena tidak semua orang punya akun login.
- **Grade berasal dari hasil ukur.** Sampel diukur (berat, ukuran, jumlah daun, warna, tekstur, cacat), dibandingkan dengan
  `pf_grade_criterion`, dan grade diusulkan dari kriteria terlemah. Petugas QC memastikan.
- **Invoice menyalin tarif pajak**, supaya invoice lama tidak berubah saat tarif berganti. Invoice terbit tidak diedit,
  melainkan dibatalkan dan diganti. Faktur pajak resmi lewat sistem DJP belum termasuk.
- **Absensi menyimpan lokasi dan foto saat absen saja.** Foto ada di bucket privat. Absen di luar area ditandai, bukan ditolak.
  Usulan masa simpan foto 90 hari. Lokasi dan foto adalah data pribadi, jadi perlu persetujuan pengguna.
- **API sensor tidak bergantung pada interval:** waktu bacaan berasal dari alat, dan kiriman ganda diabaikan.
- **Stok berubah hanya lewat `pf_stock_move`**, dan catatan produksi serta penjualan dikoreksi, bukan dihapus.

Hak akses per peran disimpan di `pf_user_role` (satu orang bisa punya beberapa peran) dan ditegakkan dengan RLS:
Pimpinan, Admin sistem, Manajer produksi, Staf penjualan, Staf SDM, Teknisi, Operator, Peneliti dan mahasiswa.

---

## 7. Keputusan yang sudah diambil

1. Tampilan 3D memakai three.js lewat paket `plant-factory-3d`.
2. Broker MQTT dan notifikasi WhatsApp/Telegram ditunda; alarm lewat dashboard dan email. Sensor mengirim lewat API HTTPS.
3. Kapasitas: 2 rak × 3 tingkat × 4 talang × 20 lubang = 480 lubang; chamber CH1 dengan 22 posisi nampan (perkiraan).
4. ERP hanya memantau; belum ada kendali alat.
5. Sensor yang diintegrasikan: mikroklimat (suhu, RH, VPD, CO2) dan nutrisi (pH, EC, DO, suhu larutan).
6. Operator mengisi data dari ponsel dan laptop.
7. SDM mencakup jadwal, tugas, absensi, dan kontrak untuk semua orang. Penggajian di luar lingkup versi ini.
8. Penjualan dan traceability hasil panen diprioritaskan.
9. Model 3D tidak dibuka di repo publik, tetapi tetap ditampilkan di ERP. Filenya ada di bucket Supabase privat
   (lihat `SETUP-ERP-MODEL.md`). Sumber paket mesin 3D untuk build Vercel belum diputuskan, jadi Tahap 0 belum boleh digabung ke `main`.
10. Sensor mikroklimat juga dipasang di dalam chamber. Interval kirim dibahas bersama pengembangan firmware.
11. Grade panen memakai A, B, dan Afkir. Batas angkanya menyusul dari data panen tim.
12. Tagihan memakai invoice dengan pajak opsional. Absensi memakai lokasi dan foto dari ponsel.

