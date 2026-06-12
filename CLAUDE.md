# smartagri — Landing Page

Landing page satu halaman untuk Smart Agriculture Research Center.
Baca file ini sebelum membuat atau mengubah kode apa pun, dan ikuti aturan brand di bawah secara ketat.

## Stack
- TanStack Start v1, React 19, TypeScript
- Tailwind v4, framer-motion, lucide-react
- Routes: `index.tsx` (landing), `research.tsx`, `impact.tsx`, `publications.tsx`,
  `field-notes.tsx`, `about-us.tsx`, `contact-us.tsx` (peta + form pertanyaan;
  form membuka draf email via `mailto:` — tanpa backend).
- Header sticky `SiteHeader` dipakai semua halaman (mode `overlay` khusus landing);
  halaman non-landing: `SiteHeader` + `PageHero` + konten + `Footer` (CTA banner hanya di landing).
- Data bersama di `src/lib/`: `notes.ts` (artikel), `publications.ts`, `research.ts`, `partners.ts`.
- Konten Field Notes & Publications: file JSON per-entri di `src/content/notes/` dan
  `src/content/publications/`, di-load via `import.meta.glob` di `lib/notes.ts`/`lib/publications.ts`,
  dikelola admin lewat CMS `/admin` (Sveltia, config di `public/admin/config.yml`;
  setup eksternal: lihat `SETUP-ADMIN-CMS.md`). Jangan tulis data artikel/publikasi
  hardcoded di komponen.
- Komponen di `src/components/`, aset di `src/lib/assets.ts`

## Brand — WAJIB diikuti
- Tipografi: sistem satu-suara ala Linear — **Inter** (Google Fonts) untuk semua peran,
  didefinisikan di `src/lib/fonts.ts` (pakai object `display`/`body`/`serif`/`accent`,
  jangan hardcode fontFamily):
  - Heading: weight 600 (judul kartu 500), tracking negatif agresif
    (H1/page-hero −0.035em, H2 besar −0.03em, H2 sedang −0.025em; baseline
    `h1,h2,h3 { letter-spacing: -0.02em }` ada di `styles.css`)
  - Body & tombol: weight 400/500, ukuran 14–18px, leading 1.5
  - Eyebrow: 13px weight 500 tracking +0.03em (TANPA uppercase)
  - Kata aksen (`accent`): BUKAN italic — penekanan warna teal `#14919B`
    (override ke mint `#45DFB1`/`#80ED99` di latar gelap), weight 600
  - Display 700+ dihindari; tanpa font kedua
- Palet warna — pakai inline hex / arbitrary Tailwind value. JANGAN membuat sistem design-token.
  - teal900 `#0B6477`, teal600 `#14919B`, cyan500 `#0AD1C8`, mint400 `#45DFB1`, green300 `#80ED99`
  - kartu gelap: `#08313A`
- Wordmark selalu huruf kecil: `smartagri`
- CTA utama: background `#45DFB1`, teks `#0B2A22`, hover `#80ED99`

## Aset
- Semua media direferensikan HANYA lewat object `A` di `src/lib/assets.ts` (BASE = `/brand`).
- File fisik ada di `public/brand/`: hero.mp4, smartagri-white.svg, smartagri-color.svg,
  icon-white.svg, icon-color.svg, field.jpg, farmer.jpg
- Jangan hardcode URL eksternal untuk aset.

## Aturan implementasi
- Ikuti spesifikasi animasi & layout di prompt secara PERSIS: nilai delay, easing,
  breakpoint (sm/md/lg), dan ukuran seperti tertulis.
- Mobile-responsive penuh. Halaman harus scroll natural: video hero full-bleed, lalu seksi putih.
- Tanpa backend, tanpa localStorage.
- Inject font Google Fonts lewat `head()` route root; pastikan `src/styles.css` meng-`@import "tailwindcss";`
  dan berisi keyframes `marquee` + class `.animate-marquee`.

## Perintah
- Dev: `npm run dev`
- Build: `npm run build`
