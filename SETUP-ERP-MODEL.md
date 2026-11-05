# Setup model 3D ERP

Model plant factory dan growth chamber tidak disimpan di repo publik. Situs yang sudah deploy membacanya dari
bucket Supabase privat lewat tautan berumur satu jam, yang hanya bisa didapat anggota lab yang sudah login.

## Pengembangan lokal

Paket `web/vendor/plant-factory-3d-1.4.1.tgz` dan folder `web/public/brand/plant-factory/` ada di `.gitignore`.
Setelah clone baru, salin `.tgz` ke `web/vendor/`, lalu jalankan dari `web/`:

```bash
npm install
```

```bash
npx plant-factory-3d-assets public/brand/plant-factory
```

## Bucket produksi

1. Jalankan `web/supabase/pf-model-storage.sql` di SQL Editor Supabase.
2. Di Supabase, buka Storage, lalu bucket `pf-model`.
3. Unggah empat file ini dari `web/public/brand/plant-factory/`, langsung di akar bucket:
   - `plant_factory.glb`
   - `manifest.json`
   - `seed_chamber.glb`
   - `seed_chamber_manifest.json`

Setiap pembaruan model, ulangi langkah 3 dan timpa file lama. File CSV di `erp_seed/` tidak perlu diunggah.

## Yang masih harus diputuskan sebelum digabung ke `main`

Vercel dan workflow impor berita menjalankan `npm ci`, sedangkan `.tgz` tidak ada di repo. Sebelum sumber paket
ditentukan, branch ini tidak bisa dibangun dari clone baru, dan menggabungkannya ke `main` akan menghentikan deploy
dan impor berita.

## Batas perlindungan

Cara ini mencegah orang luar mengunduh model. Anggota lab yang sudah login secara teknis tetap bisa mengambil file
yang tampil di browsernya.
