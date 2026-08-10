# smartagri

Situs Smart Agriculture Research Center, Universitas Gadjah Mada.
Live di **[smart-agri.id](https://www.smart-agri.id)**.

## Stack

TanStack Start v1 · React 19 · TypeScript · Tailwind v4 · framer-motion
Di-deploy otomatis oleh Vercel dari branch `main`.

Aplikasinya ada di folder `web/`.

## Menjalankan secara lokal

Butuh **Node 20 atau lebih baru** (versi yang dipakai ada di `.nvmrc`).
Node 18 akan gagal saat build dengan `ReferenceError: CustomEvent is not defined`.

```bash
nvm use            # membaca .nvmrc (22)
cd web
npm install
npm run dev        # http://localhost:3000
```

Perintah lain:

```bash
npm run build      # build produksi
npx tsc --noEmit   # typecheck
npm test           # vitest
```

## Variabel lingkungan

Salin `web/.env.example` menjadi `web/.env` lalu isi seperlunya. Semuanya
opsional untuk sekadar menjalankan situs:

| Variabel | Untuk apa | Kalau dikosongkan |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Login, buku tamu, inventaris PUAPT, insights | Fitur ber-login mati, sisa situs tetap jalan |
| `AI_API_BASE_URL`, `AI_MODEL`, `AI_API_KEY` | AI Assistant | Halaman `/ai` tidak berfungsi |

Keduanya adalah kunci publik yang aman dipakai di browser. **Jangan** memasukkan
`service_role` key Supabase ke repo ini (repo bersifat publik).

Di produksi, nilai-nilai ini diatur di dashboard Vercel, bukan di repo.

## Isi repo

| Lokasi | Isi |
|---|---|
| `web/src/routes/` | Halaman (routing berbasis file) |
| `web/src/components/` | Komponen bersama |
| `web/src/lib/` | Data & helper (riset, teknologi, tim, publikasi, indoor farming) |
| `web/src/content/notes/`, `.../publications/`, `.../gallery/` | Konten per-entri (JSON), dikelola lewat CMS `/admin` |
| `web/public/brand/` | Semua aset media, dirujuk lewat `src/lib/assets.ts` |
| `web/supabase/*.sql` | Migrasi Supabase, dijalankan manual sekali di SQL editor |

## Alur deploy

`main` adalah sumber kebenaran dan yang di-deploy. Konten berita juga bisa masuk
ke `main` lewat importer otomatis, jadi **selalu mulai dari `main` yang terbaru**
sebelum bekerja:

```bash
git checkout design-sync/ui-kit
git merge --ff-only origin/main      # samakan dulu dengan main
```

Lalu seperti biasa:

```bash
git add <file>
git commit -m "pesan"
git push origin design-sync/ui-kit
gh pr create --base main --head design-sync/ui-kit --title "..." --body "..."
gh pr merge <nomor> --merge
```

Merge ke `main` memicu deploy Vercel. Butuh sekitar 1 sampai 2 menit sampai
perubahannya tayang.

> Kalau branch kerja tertinggal dari `main` lalu dipakai membuat PR, perubahan
> yang sudah ada di `main` bisa ikut terbalik. Karena itu langkah `merge
> --ff-only origin/main` di atas penting, terutama saat berpindah komputer.

## Dokumentasi lain

- **`CLAUDE.md`** — aturan brand dan konvensi kode. **Baca ini sebelum mengubah
  kode apa pun.**
- `SETUP-*.md` — panduan sekali-jalan per fitur (CMS admin, auth, inventaris
  PUAPT, sinkronisasi galeri, server AI, dan lainnya).
- `INDOOR-FARMING-PHOTOS.md` — daftar dan brief foto untuk seksi Indoor Farming.
