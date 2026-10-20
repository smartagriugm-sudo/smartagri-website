# Dashboard Indoor Farming

Catatan pengembangan aplikasi dashboard di `/indoor-farming/dashboard`.
Dokumen ini menjelaskan apa yang sudah dibangun, mengapa dibangun begitu, dan
apa yang masih menggantung.

Terakhir diperbarui: Oktober 2026.

## 1. Di mana semuanya berada

Folder induk proyek: **`smartagri-website/`**, dan aplikasinya ada di
sub-folder **`web/`**. Tidak ada kode yang berada di luar folder ini.

```
smartagri-website/          <- folder induk, ini akar repositori git
├─ CLAUDE.md                <- aturan brand & implementasi, baca sebelum ngoding
├─ README.md                <- ringkasan proyek
├─ INDOOR-FARMING-DASHBOARD.md   <- dokumen ini
├─ SETUP-*.md               <- panduan setup per fitur (auth, CMS, dll)
├─ design assets/
└─ web/                     <- aplikasinya
   ├─ src/routes/           <- satu berkas = satu halaman
   ├─ src/components/
   │  └─ dashboard/         <- komponen khusus dashboard
   ├─ src/lib/              <- data & logika bersama
   ├─ src/content/          <- JSON artikel & publikasi (dikelola lewat /admin)
   ├─ public/brand/         <- seluruh aset gambar, video, logo
   └─ scripts/              <- skrip impor konten
```

Repositori online: `github.com/smartagriugm-sudo/smartagri-website`, branch
produksi `main`, di-deploy otomatis oleh Vercel ke
[smart-agri.id](https://www.smart-agri.id).

Untuk mendapatkan seluruh isinya di komputer Anda:

```bash
git clone https://github.com/smartagriugm-sudo/smartagri-website.git
cd smartagri-website/web
npm install
npm run dev     # buka http://localhost:3000
```

## 2. Alamat halaman

Dashboard diberi namespace di bawah bidang risetnya, bukan di `/dashboard`
polos, supaya riset lain bisa punya dashboard sendiri nanti
(`/smart-uav/dashboard/...`) tanpa salah satunya harus pindah.

| Alamat | Isi |
| --- | --- |
| `/indoor-farming/dashboard` | Overview, ringkasan seluruh fasilitas |
| `/indoor-farming/dashboard/rooms` | Daftar ruang, peta lokasi, layout tanam |
| `/indoor-farming/dashboard/sensors` | Daftar instrumen dan aktuator |
| `/indoor-farming/dashboard/nutrition` | Kimia larutan: pH, EC, DO, dosing |
| `/indoor-farming/dashboard/climate` | Iklim udara vs cuaca luar |
| `/indoor-farming/dashboard/analytics` | Time in band, ekstrem harian |
| `/indoor-farming/dashboard/calibration` | Jadwal kalibrasi instrumen |
| `/indoor-farming/instrumentation` | Halaman publik penjelasan 12 parameter |

Dashboard berada di balik `RequireAuth`. Halaman instrumentation sengaja
dibiarkan terbuka: isinya untuk calon mitra yang belum punya akun.

## 3. Berkas yang penting

| Berkas | Perannya |
| --- | --- |
| `src/lib/indoor-dashboard.ts` | Seluruh model data dan simulasi. Jantungnya. |
| `src/lib/dashboard-state.tsx` | React context: jam, zona terpilih, rentang waktu |
| `src/components/dashboard/AppShell.tsx` | Sidebar, top bar, nav mobile |
| `src/components/dashboard/parts.tsx` | Panel, grafik, bar, kartu KPI |
| `src/components/dashboard/DashboardOverview.tsx` | Layar Overview |
| `src/components/dashboard/FacilityMap.tsx` | Peta Leaflet |
| `src/routes/indoor-farming_.dashboard.tsx` | Layout induk, gerbang login |

## 4. Keputusan rancangan dan alasannya

Bagian ini yang paling berguna dibaca sebelum mengubah apa pun.

### State ada di context, bukan di halaman

Dashboard terdiri dari tujuh layar yang harus sepakat soal satu jam dan satu
ruang terpilih. Kalau state disimpan di masing-masing halaman, berpindah dari
Overview ke Rooms akan mereset jam dan pilihan, lalu dua layar berbeda pendapat
soal "sekarang jam berapa". Itu sebabnya ada `dashboard-state.tsx`.

### Jam mulai dari nilai tetap

`INITIAL_TICK` bernilai tetap dan jamnya baru berjalan setelah mount. Ini
bukan gaya-gayaan: render server dan render browser harus identik, kalau tidak
akan terjadi hydration mismatch. Jangan membaca `Date.now()` saat render.

### Data sintetis tapi deterministik

Tidak ada sensor sungguhan di balik layar ini. Semua angka dihasilkan fungsi
murni dari seed per ruang, jadi tick yang sama selalu menghasilkan angka yang
sama. `dayDrift(0)` sengaja menghasilkan offset nol persis, supaya menambahkan
riwayat hari-hari sebelumnya tidak mengubah data hari ini.

### Metrik berjadwal tidak dihitung sebagai kegagalan

PPFD, DLI, dan irrigation flow digerakkan jadwal, bukan ditahan di setpoint.
Ruangan gelap pukul 02.00 dan katup tertutup di antara siklus adalah keadaan
benar. Ketiganya dikecualikan saat menggulung status ruang dan tidak diwarnai
terhadap pita target. Kalau menambah metrik serupa, tambahkan ke pengecualian
yang sama.

### Warna parameter ditugaskan per panel

Ada 12 parameter tapi hanya 8 hue yang lolos validasi kontras dan buta warna.
Aturannya: **tidak ada dua parameter sewarna di dalam satu panel**. Empat set
yang pernah muncul bersama (pemilih grafik, baris KPI, bar root zone, panel
cahaya) sudah divalidasi masing-masing. Kalau menambah parameter ke salah satu
panel, validasi ulang set itu.

### Pita target mengikuti warna parameternya

Dulu selalu mint, sehingga garis merah dinilai di atas latar hijau. Sekarang
pita memakai hue parameter, dengan garis batas putus-putus supaya tidak
melebur dengan area di bawah garis.

### Peta dimuat hanya di klien

Leaflet menyentuh `window` begitu diimpor, jadi impornya dinamis di dalam
`useEffect`. Marker dibuat dari HTML (`divIcon`), bukan pin gambar bawaan,
untuk menghindari masalah path aset. Panel juga merender daftar situs biasa di
server, sehingga tetap berguna sebelum peta termuat.

### Layout digambar sesuai sistem tanamnya

Lima sistem (polybag, dutch bucket, gully trapesium, rak vertikal, tray
persemaian) digambar berbeda, supaya operator bisa mencocokkan layar dengan
ruangan di depannya tanpa membaca label.

## 5. Yang masih menggantung

Hal-hal ini sengaja dibiarkan dan perlu keputusan atau data dari tim.

1. **Koordinat situs masih perkiraan.** `SITES` di `indoor-dashboard.ts` berisi
   tiga lokasi dengan lat/lng kasar, bukan hasil survei. Ganti angkanya saja,
   tidak ada bagian lain yang bergantung padanya.
2. **Pembagian ruang ke situs masih tebakan.** Lihat `siteId` di
   `ROOM_LAYOUTS`.
3. **Label "Active" bermakna ganda.** Diminta menggantikan "In band", padahal
   ruang berstatus Warning sebenarnya juga aktif. "Normal" lebih tepat kalau
   nanti terasa rancu.
4. **Ada dua proyek Vercel untuk satu repo**, `smartagri-website` dan
   `smartagriugm-sudo-smartagri-website`. Keduanya ikut build tiap push dan
   pernah membuat deploy produksi terlihat tertinggal padahal preview sudah
   baru. Layak dibersihkan.
5. **Dua teknologi peta berbeda.** Halaman contact-us memakai iframe Google
   Maps, dashboard memakai Leaflet. Belum tentu masalah, tapi perlu disadari.
6. **Gerbang login bergantung env Supabase.** Kalau variabelnya belum diisi di
   Vercel, `RequireAuth` meloloskan semua orang. Datanya sintetis jadi bukan
   kebocoran, tapi dashboard jadi terbuka untuk publik.
7. **Delapan gambar catatan masih hotlink ke server luar.** Lihat bagian
   berikut.

## 6. Gambar yang masih di luar folder

Sebagian besar gambar artikel sudah diunduh ke
`web/public/brand/uploads/notes/` (346 berkas). Delapan belum, tersebar di lima
artikel: tujuh dari `lh7-rt.googleusercontent.com` dan satu dari situs
WordPress lama.

Penyebabnya sudah ditemukan dan diperbaiki: `scripts/import-wp.mjs` dulu
menolak URL yang tidak berekstensi, padahal Google Docs mengekspor gambarnya ke
alamat tanpa ekstensi. URL Google itu bertanda tangan dan bisa kedaluwarsa,
jadi gambarnya bisa hilang dari situs tanpa ada perubahan apa pun di repo.

Untuk menariknya masuk, jalankan dari folder `web/`:

```bash
npm run fetch-note-images -- --dry-run   # lihat dulu apa yang akan diambil
npm run fetch-note-images                # unduh, ubah ke webp, tulis ulang rujukan
```

Skripnya idempoten: berkas yang sudah ada dilewati, dan menjalankannya dua kali
tidak mengubah apa pun. Setelah itu commit hasilnya.

**Ini belum dijalankan** karena lingkungan cloud tempat pengembangan dilakukan
memblokir kedua host tersebut. Harus dijalankan dari komputer Anda.

## 7. Perintah

Semua dijalankan dari folder `web/`.

```bash
npm run dev                 # server pengembangan
npm run build               # build produksi
npx tsc --noEmit            # periksa tipe
npm run generate-routes     # regenerasi route tree setelah menambah rute
npm run fetch-note-images   # tarik gambar artikel yang masih hotlink
```

Setelah menambah berkas rute baru, `npm run generate-routes` wajib dijalankan,
kalau tidak TypeScript akan menolak alamat rutenya.
