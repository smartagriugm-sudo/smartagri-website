# smartagri · Website

Situs Smart Agriculture Research Center UGM, live di smart-agri.id.
Baca file ini sebelum membuat atau mengubah kode apa pun, dan ikuti aturan brand di bawah secara ketat.
Ringkasan naratif semua fitur yang sudah dibangun ada di `STATUS-PENGEMBANGAN.md`.

## Stack
- Aplikasi ada di subfolder **`web/`**; semua path di bawah relatif terhadap `web/`.
  Folder induk hanya berisi dokumentasi (`README.md`, `STATUS-PENGEMBANGAN.md`, `SETUP-*.md`).
- TanStack Start v1, React 19, TypeScript, Tailwind v4, framer-motion, lucide-react.
  Versi `@tanstack/*` dan `nitro` dikunci exact di `package.json`; naikkan dengan sengaja, bukan `latest`.
- Server: route Nitro berbasis file di `server/api/` (mis. `server/api/ai/chat.post.ts` = `POST /api/ai/chat`).
- Data: Supabase (Auth, Postgres, pgvector) via **anon key** saja; migrasi SQL di `supabase/`,
  dijalankan manual. JANGAN pernah memasukkan `service_role` key atau secret apa pun ke repo (repo publik).
- AI Assistant (`/ai/*`, dipagari login): Ollama on-prem lewat `lib/ai/`, RAG pgvector + bge-m3.
- Routes (`src/routes/`, routing berbasis file):
  - Situs publik: `index` (landing), `research`, `technology`, `impact`, `publications`, `field-notes`,
    `gallery`, `team`, `exhibition`, `demo`, `about-us`, `contact-us` (peta + form yang membuka
    draf email via `mailto:`), `privacy-policy`, `terms-of-use`.
  - Aplikasi: `ai/*`, `sign-in`, `sign-up`, `indoor-farming*` (termasuk dashboard operator),
    `inventory*`, `guestbook*`, `links*`.
- Header sticky `SiteHeader` dipakai semua halaman (mode `overlay` khusus landing);
  halaman non-landing: `SiteHeader` + `PageHero` + konten + `Footer` (CTA banner hanya di landing).
- Data bersama di `src/lib/` (mis. `notes.ts`, `publications.ts`, `research.ts`, `partners.ts`,
  `team.ts`, `technology.ts`, `indoor-farming.ts`, `indoor-dashboard.ts`).
- Konten Field Notes, Publications, dan Gallery: file JSON per-entri di `src/content/{notes,publications,gallery}/`,
  di-load via `import.meta.glob` di `lib/notes.ts`/`lib/publications.ts`/`lib/gallery.ts`,
  dikelola admin lewat CMS `/admin` (Sveltia, config di `public/admin/config.yml`;
  setup eksternal: lihat `SETUP-ADMIN-CMS.md`). Jangan tulis data artikel/publikasi
  hardcoded di komponen.
- Berita juga masuk otomatis dari WordPress lama lewat `scripts/import-wp.mjs`
  (GitHub Actions, commit langsung ke `main`). Selalu mulai kerja dari `main` terbaru.
- Komponen di `src/components/`, aset di `src/lib/assets.ts`

## Brand (WAJIB diikuti)
- Tipografi: sistem satu-suara ala Linear: **Inter** (Google Fonts) untuk semua peran,
  didefinisikan di `src/lib/fonts.ts` (pakai object `display`/`body`/`serif`/`accent`,
  jangan hardcode fontFamily):
  - Heading: weight 600 (judul kartu 500), tracking negatif agresif
    (H1/page-hero −0.035em, H2 besar −0.03em, H2 sedang −0.025em; baseline
    `h1,h2,h3 { letter-spacing: -0.02em }` ada di `styles.css`)
  - Body & tombol: weight 400/500, ukuran 14–18px, leading 1.5
  - Eyebrow: 13px weight 500 tracking +0.03em (TANPA uppercase)
  - Kata aksen (`accent`): BUKAN italic, melainkan penekanan warna teal `#14919B`
    (override ke mint `#45DFB1`/`#80ED99` di latar gelap), weight 600
  - Display 700+ dihindari; tanpa font kedua
- Palet warna: pakai inline hex / arbitrary Tailwind value. JANGAN membuat sistem design-token.
  - teal900 `#0B6477`, teal600 `#14919B`, cyan500 `#0AD1C8`, mint400 `#45DFB1`, green300 `#80ED99`
  - kartu gelap: `#08313A`
- Wordmark selalu huruf kecil: `smartagri`
- CTA utama: background `#45DFB1`, teks `#0B2A22`, hover `#80ED99`

## Aset
- Semua media direferensikan HANYA lewat `src/lib/assets.ts` (object `A` dan helper
  `indoorFarmingPhoto`, `partnerLogo`, `teamPhoto`, dst.; BASE = `/brand`).
- File fisik ada di `public/brand/` (logo/ikon SVG, `hero.webp`, subfolder `indoor-farming/`,
  `partners/`, `team/`, `uploads/`). Gambar baru disimpan sebagai WebP.
- Jangan hardcode URL eksternal untuk aset.

## Aturan implementasi
- Ikuti spesifikasi animasi & layout di prompt secara PERSIS: nilai delay, easing,
  breakpoint (sm/md/lg), dan ukuran seperti tertulis.
- Mobile-responsive penuh. Halaman harus scroll natural: hero full-bleed, lalu seksi putih.
- Backend hanya Supabase (anon key) dan route Nitro di `server/api/`; jangan menambah layanan
  pihak ketiga baru tanpa diskusi. Tanpa localStorage.
- JANGAN gunakan em dash (—) di teks mana pun (konten situs, komentar kode, dokumen).
  Pakai koma, titik dua, titik, tanda kurung, atau separator `·`/`|` sesuai konteks.
  En dash (–) hanya untuk rentang angka/tanggal (mis. 14–18px, 19–20).
  Importer berita menormalkan em dash otomatis (`noEmDash` di `scripts/import-wp.mjs`).
- Inject font Google Fonts lewat `head()` route root; pastikan `src/styles.css` meng-`@import "tailwindcss";`
  dan berisi keyframes `marquee` + class `.animate-marquee`.

## Perintah (dari `web/`, Node sesuai `.nvmrc`)
- Dev: `npm run dev` (port 3000)
- Build: `npm run build`
- Typecheck: `npx tsc --noEmit`
- Test: `npm test`
