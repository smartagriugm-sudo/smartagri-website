# Setup model 3D ERP

Model plant factory dan growth chamber tidak disimpan di repo publik. Situs yang sudah deploy membacanya dari
bucket Supabase privat lewat tautan berumur satu jam, yang hanya bisa didapat anggota lab yang sudah login.

## Paket di repo

`web/vendor/plant-factory-3d-1.4.2-engine.tgz` berisi kode mesin saja, tanpa model, manifest, atau CSV. Paket ini
masuk git supaya Vercel dan workflow impor berita bisa menjalankan `npm ci` tanpa token. Paket lengkap dari sumbernya
tidak boleh masuk git: simpan di `web/vendor/private/`, yang ada di `.gitignore`.

## Pengembangan lokal

Saat `npm run dev`, situs membaca model dari `web/public/brand/plant-factory/`, yang juga ada di `.gitignore`. Setelah
clone baru, salin paket lengkap ke `web/vendor/private/`, lalu jalankan dari `web/`:

```bash
mkdir -p public/brand/plant-factory
```

```bash
tar -xzf vendor/private/plant-factory-3d-1.4.1.tgz --strip-components=2 -C public/brand/plant-factory package/assets
```

Lalu kemas modelnya, sama seperti yang ada di bucket (lihat bagian berikut):

```bash
node scripts/pack-model.mjs public/brand/plant-factory
```

Tanpa folder ini, test yang membandingkan data dengan manifest model dilewati, dan test lain tetap berjalan.

## Mengemas model

Model dikemas sebelum diunggah supaya cepat dimuat: geometrinya dikompres dengan `EXT_meshopt_compression`, lalu
filenya di-gzip. `plant_factory.glb` turun dari 3,45 MB menjadi 0,38 MB dan `seed_chamber.glb` dari 0,84 MB menjadi
0,07 MB, tanpa perubahan tampilan. Situs membuka keduanya di browser (`web/src/lib/pf/model-load.ts` dan
`MeshoptDecoder` di mesin 1.4.2). File yang belum dikemas tetap terbaca, hanya lebih lambat.

Jalankan dari `web/`, setiap kali model baru datang dari paket lengkap:

```bash
node scripts/pack-model.mjs public/brand/plant-factory
```

Skrip ini mengubah file di tempat dan melewati file yang sudah dikemas, jadi aman dijalankan dua kali. Posisi titik
sengaja tidak dikuantisasi, karena mesin membaca tinggi titik dalam meter untuk tampilan dinding rendah.

## Bucket produksi

1. Jalankan `web/supabase/pf-model-storage.sql` di SQL Editor Supabase.
2. Di Supabase, buka Storage, lalu bucket `pf-model`.
3. Unggah empat file ini dari `web/public/brand/plant-factory/` (setelah dikemas), langsung di akar bucket:
   - `plant_factory.glb`
   - `manifest.json`
   - `seed_chamber.glb`
   - `seed_chamber_manifest.json`

Setiap pembaruan model, kemas dulu, lalu ulangi langkah 3 dan timpa file lama. File CSV di `erp_seed/` tidak perlu
diunggah.

## Disimpan di perangkat

Setelah unduhan pertama, browser menyimpan model di Cache Storage (`smartagri-pf-model`), dengan kunci nama file dan
ETag-nya di bucket. Kunjungan berikutnya membuka model dari perangkat tanpa mengunduh lagi. Begitu file di bucket
ditimpa, ETag-nya berubah, sehingga model baru diunduh sekali dan salinan lama dihapus. Saat `npm run dev`, model
lokal tidak disimpan.

Di koneksi lambat atau mode Hemat Data, model kedua tidak dimuat lebih awal. Perangkat dengan RAM 4 GB atau kurang,
atau 4 inti prosesor atau kurang, memakai mode ringan mesin (resolusi 1x, bayangan lebih kecil, tanpa GTAO).

## Memperbarui mesin

Kalau paket lengkap versi baru tiba: buang `assets`, `examples`, `bin`, dan `README.md`, ubah `package.json`-nya sesuai
paket `-engine` yang lama (tanpa `bin`, tanpa ekspor `assets`, versi berakhiran `-engine`), jalankan `npm pack`, lalu
`npm install` paket hasilnya. Periksa dengan `tar -tzf` bahwa hanya ada `src/`, `index.d.ts`, dan `package.json`.

## Batas perlindungan

Cara ini mencegah orang luar mengunduh model. Kode mesin sendiri bersifat publik, karena ada di repo dan terkirim ke
browser pengunjung. Anggota lab yang sudah login secara teknis tetap bisa mengambil file
yang tampil di browsernya.
