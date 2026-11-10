# 🔧 Setup Admin CMS (sekali jalan)

Sistem admin sudah terpasang di kode (`/admin` — Sveltia CMS, berbasis Git).
Konten Field Notes, Publications, & Gallery kini berupa file JSON di
`web/src/content/` — setiap "Publish" dari admin menjadi commit Git, lalu
hosting otomatis rebuild dan tayang (±1–3 menit).

Tiga langkah di bawah hanya bisa dilakukan pemilik akun — kerjakan berurutan.
Setelah selesai, kirim info yang diminta dan saya rapikan konfigurasinya.

---

## Langkah 1 — Repo GitHub

1. Buat akun GitHub untuk lembaga (atau pakai yang ada): https://github.com
2. Buat repository baru: **New repository** → nama misal `smartagri-website`
   → **Private** → tanpa README (repo kosong).
3. Push proyek ini (Git lokal sudah saya siapkan; tinggal):
   ```
   git remote add origin https://github.com/<OWNER>/<REPO>.git
   git push -u origin main
   ```
4. Undang admin lain (jika ada): repo → Settings → Collaborators.
   ➡ Setiap admin CMS = collaborator repo dengan akun GitHub sendiri.

## Langkah 2 — Hosting dengan auto-deploy

Pilihan termudah (gratis): **Cloudflare Pages** atau **Netlify**.

- Login (bisa pakai akun GitHub) → "Import project / Add new site" →
  pilih repo `smartagri-website`.
- Pengaturan build:
  - Root directory / base: `web`
  - Build command: `npm run build`
  - Output: deteksi otomatis (TanStack Start/Nitro); jika diminta manual,
    output directory `web/.output/public` dengan preset sesuai platform.
- Setiap push/Publish ke branch `main` akan otomatis ter-deploy.
- Sambungkan domain `smartagri.id` di menu Custom Domains.

## Langkah 3 — Login GitHub untuk halaman /admin

CMS butuh "jembatan" OAuth supaya tombol login GitHub berfungsi.
Pakai **sveltia-cms-auth** (Cloudflare Worker, gratis, ±10 menit):

1. Buka https://github.com/sveltia/sveltia-cms-auth → ikuti tombol
   **Deploy to Cloudflare Workers** (butuh akun Cloudflare gratis).
2. Saat diminta, buat **GitHub OAuth App**
   (GitHub → Settings → Developer settings → OAuth Apps → New):
   - Homepage URL: `https://smartagri.id`
   - Callback URL: `https://<nama-worker>.workers.dev/callback`
   - Salin Client ID & Client Secret ke environment Worker.
3. Catat URL worker-nya, misal `https://sveltia-cms-auth.xxxx.workers.dev`.

## Terakhir — kirim ke saya / isi sendiri

Edit `web/public/admin/config.yml`, ganti dua baris TODO:

```yaml
backend:
  name: github
  repo: <OWNER>/<REPO>          # ← dari Langkah 1
  branch: main
  base_url: https://<worker-url> # ← dari Langkah 3
```

Selesai. Admin membuka `https://smartagri.id/admin`, login GitHub,
dan bisa menambah/mengedit/menghapus Publications & Field Notes lewat form.

---

## Cara pakai harian (untuk admin)

1. Buka `/admin` → **Sign in with GitHub**.
2. Pilih koleksi **Field Notes**, **Publications**, atau **Gallery**.
3. **New …** untuk entri baru, atau klik entri lama untuk edit/hapus.
4. Klik **Publish** — perubahan tayang otomatis dalam ±1–3 menit.
5. Riwayat lengkap & rollback tersedia di GitHub (menu commit history).

## Catatan

- Konten lain (statistik, tim, testimonial, mitra) masih diedit lewat kode /
  form konten — bisa ditambahkan ke CMS ini nanti dengan pola yang sama.
- Foto upload dari CMS tersimpan terpisah per koleksi supaya tidak menumpuk:
  Field Notes di `web/public/brand/uploads/notes/`, Publications di
  `.../uploads/publications/`, dan Gallery di `.../uploads/gallery/`.
- Gallery: tiap entri adalah satu album kegiatan. Isi judul, tanggal, kategori,
  lokasi, ringkasan, cover (opsional), dan daftar **Photos** (boleh banyak) yang
  tampil saat kartu album diklik di halaman `/gallery`.
- Selama belum di-setup, situs tetap normal — `/admin` hanya belum bisa login.
