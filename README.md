# smartagri

Situs resmi **Smart Agriculture Research Center (SARC), Universitas Gadjah Mada**.
Live di **[smart-agri.id](https://www.smart-agri.id)**.

Repo ini berisi situs publik (riset, teknologi, publikasi, berita, galeri, tim)
dan aplikasi internal yang berjalan di domain yang sama: AI Assistant, indoor
farming, inventaris, buku tamu, dan ERP plant factory **agrosphere**.

## Struktur repo

```
.
├── web/                 aplikasi situs (TanStack Start)
│   ├── src/routes/      halaman, routing berbasis file
│   ├── src/components/  komponen bersama
│   ├── src/lib/         data, helper, dan logika (termasuk ERP di src/lib/pf/)
│   ├── src/content/     berita, publikasi, galeri (JSON per entri, dikelola lewat CMS /admin)
│   ├── server/api/      route server Nitro (mis. AI chat)
│   ├── public/brand/    semua aset media, dirujuk lewat src/lib/assets.ts
│   └── supabase/        migrasi SQL, dijalankan manual di SQL editor Supabase
├── docs/                dokumentasi (lihat docs/README.md)
├── .github/workflows/   impor berita otomatis dari situs lama
└── CLAUDE.md            aturan brand dan konvensi kode
```

## Stack

TanStack Start v1 · React 19 · TypeScript · Tailwind v4 · framer-motion ·
Supabase (Auth, Postgres, pgvector). Di-deploy otomatis oleh Vercel dari branch `main`.

## Menjalankan secara lokal

Butuh **Node 20 atau lebih baru** (versi yang dipakai ada di `.nvmrc`).

```bash
nvm use
cd web
npm install
npm run dev        # http://localhost:3000
```

Perintah lain (dari `web/`):

```bash
npm run build      # build produksi
npx tsc --noEmit   # typecheck
npm test           # vitest
```

## Variabel lingkungan

Salin `web/.env.example` menjadi `web/.env` lalu isi seperlunya. Semuanya
opsional untuk sekadar menjalankan situs publik:

| Variabel | Untuk apa | Kalau dikosongkan |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Login, ERP, buku tamu, inventaris | Fitur ber-login mati, situs publik tetap jalan |
| `AI_API_BASE_URL`, `AI_MODEL`, `AI_API_KEY` | AI Assistant | Halaman `/ai` tidak berfungsi |

Kunci Supabase di atas adalah kunci publik (anon) yang aman dipakai di browser.
**Jangan** memasukkan `service_role` key atau secret lain ke repo ini, karena repo
bersifat publik. Di produksi, nilai-nilai ini diatur di dashboard Vercel.

## Alur kerja

`main` adalah sumber kebenaran dan yang di-deploy. Berita dari situs lama juga
masuk ke `main` lewat importer otomatis, jadi selalu mulai dari `main` terbaru:

```bash
git switch main
git pull
git switch -c nama-branch
```

Setelah selesai, push branch, buat pull request ke `main`, lalu merge. Merge ke
`main` memicu deploy Vercel, biasanya tayang dalam 1 sampai 2 menit.

## Dokumentasi

- [`CLAUDE.md`](CLAUDE.md): aturan brand dan konvensi kode. Baca sebelum mengubah kode.
- [`docs/`](docs/README.md): status pengembangan, panduan setup per fitur,
  brief konten, dan rancangan fitur.
