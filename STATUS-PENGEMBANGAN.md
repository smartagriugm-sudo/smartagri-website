# Status Pengembangan smartagri

Ringkasan semua yang sudah dibangun untuk situs Smart Agriculture Research
Center UGM (**[smart-agri.id](https://www.smart-agri.id)**), per 20 Oktober 2026.
Dokumen ini bersifat naratif (menjelaskan "apa saja yang sudah ada"); untuk cara
menjalankan dan men-deploy lihat `README.md`, dan untuk aturan brand/kode lihat
`CLAUDE.md`.

## Gambaran singkat
- **Repo**: `github.com/smartagriugm-sudo/smartagri-website`, branch produksi `main`.
- **Folder kerja (induk)**: `D:\College\Smart Agriculture Research Center\Branding Smartagri\Landing Page SmartAgri`.
  Aplikasinya ada di subfolder **`web/`**.
- **Stack**: TanStack Start v1, React 19, TypeScript, Tailwind v4, framer-motion,
  lucide-react. Deploy otomatis oleh Vercel dari `main`.
- **Backend data**: Supabase (Auth + Postgres + pgvector). AI pakai server
  on-prem sendiri (Ollama di GPU RTX 4090), bukan API pihak ketiga.

## Peta fitur yang sudah jadi

### 1. Situs publik (marketing)
Routing berbasis file di `web/src/routes/`. Halaman: landing (`index`), `research`
(+ detail), `impact`, `publications` (+ detail), `field-notes` (+ detail),
`technology`, `team` (+ detail), `gallery`, `exhibition`, `demo`, `about-us`,
`contact-us`, `privacy-policy`, `terms-of-use`, `links` (+ `insights`).
Header sticky `SiteHeader` (mode overlay di landing), `PageHero`, `Footer`, dan
CTA banner khusus landing. Sistem brand Inter + palet teal sesuai `CLAUDE.md`.

### 2. CMS konten (`/admin`, Sveltia)
Field Notes, Publications, dan Gallery disimpan sebagai file JSON per-entri di
`web/src/content/{notes,publications,gallery}/`, di-load lewat `import.meta.glob`.
Dikelola non-teknis lewat CMS di `/admin`. Setup: `SETUP-ADMIN-CMS.md`.

### 3. Login research assistant (Supabase Auth)
Halaman `sign-in` dan `sign-up`. Auth memagari seluruh `/ai/*`. Setup:
`SETUP-AUTH.md`.

### 4. AI Assistant (`/ai`) — fitur terbesar
Gaya antarmuka mirip Gemini (composer di tengah lalu nempel bawah, sidebar bisa
ditutup, incognito). Route: `ai/chat`, `ai/generate` (document generator, saat
ini di-hide), `ai/knowledge`, `ai/profile`.
- **Model**: terhubung ke Ollama on-prem (OpenAI-compatible). Pemilih model
  banyak (qwen2.5 7b/14b/32b, llama3.1, mistral-nemo, gemma2, qwen3 reasoning),
  dengan toggle "thinking" untuk model reasoning. Definisi di `lib/ai/models.ts`.
- **Chat UX**: salam bervariasi (berbasis waktu + nama), aksi pesan (waktu kirim,
  retry, edit, copy), tanpa helper text/saran kosong.
- **Riwayat chat**: disimpan di Supabase (lazy-load: judul dulu, isi saat
  diklik). `lib/ai/chat-store.ts`, `supabase/conversations.sql`,
  `SETUP-CHAT-HISTORY.md`.
- **Profil & personalisasi**: identitas, nama panggilan, fokus kerja, custom
  instructions, preferensi bahasa/gaya; AI benar-benar menyesuaikan jawaban.
  `routes/ai/profile.tsx`, `lib/profile.ts`, `supabase/profiles.sql`.
- **RAG (hanya data sendiri)**: embedding multibahasa `bge-m3` (1024-dim),
  pgvector + fungsi `match_chunks`. Chat menyuntik konteks dari data pusat riset.
  `supabase/rag.sql`, `lib/ai/embed.ts`, `lib/ai/retrieve.ts`,
  `server/api/ai/chat.post.ts`.
- **Knowledge base tim**: halaman unggah (`ai/knowledge`) + `server/api/ai/ingest.post.ts`.
  Dukungan unggah **PDF, DOCX, XLSX** (ekstraksi di sisi klien) di chat maupun
  knowledge base. `lib/ai/extract-text.ts`.
- **Server AI**: panduan setup Ollama + Caddy (gateway auth) + Cloudflare Tunnel
  di `SETUP-AI-SERVER.md`.

### 5. Indoor Farming + dashboard kendali
- Seksi publik: `indoor-farming` (+ `$section`, `$group`).
- **Dashboard operator** (aplikasi nyata): `dashboard` dengan layar `climate`,
  `nutrition`, `sensors`, `rooms`, `analytics`, `calibration`, plus
  `instrumentation` dan `knowledge`. Komponen di `components/dashboard/`
  (AppShell, DashboardOverview, FacilityMap, parts): peta fasilitas, tampilan
  per ruang tanam, sidebar collapsible, palet chart tervalidasi.
- Brief foto: `INDOOR-FARMING-PHOTOS.md`, `INDOOR-DASHBOARD-IMAGES.md`.

### 6. Buku tamu (guestbook)
`guestbook` + `guestbook.admin`. `supabase/guestbook.sql`.

### 7. Inventaris PUAPT
`inventory` (+ detail, + `stats`). `supabase/inventory*.sql`, `SETUP-INVENTORY.md`.

### 8. Links & insights
Pemendek/trek tautan (`links`, `links.insights`). `supabase/link_events.sql`.

### 9. Sinkronisasi otomatis dari situs lama (WordPress)
- **Berita → Field Notes**: `scripts/import-wp.mjs` + GitHub Actions
  (`.github/workflows/import-wp-news.yml`). Gambar ke WebP, HTML ke Markdown,
  anti-duplikat via `wpId`. **Terjemahan otomatis ke Inggris** lewat Ollama
  on-prem (gratis) atau Anthropic (cadangan); versi Indonesia disimpan di field
  `original`. `SETUP-NEWS-SYNC.md`.
- **Galeri**: `scripts/import-gallery.mjs`, `SETUP-GALLERY-SYNC.md`.
- Ingest konten existing untuk RAG: `scripts/ingest.mjs`.

### 10. Formulir kontak & inventaris pertanyaan
Form kontak membuka draf email via `mailto:` (tanpa backend). `SETUP-INQUIRIES.md`,
`smartagri-inquiries-template.xlsx`, `FORM-KONTEN-SMARTAGRI.md`.

## Tabel Supabase (dijalankan manual sekali di SQL editor)
`conversations`, `profiles`, `rag` (doc_chunks + match_chunks), `guestbook`,
`inventory` (+ batch2/3/4 + updates), `link_events`, `usage-logs-seed`.
Hanya **anon key** yang dipakai (publik, aman di browser). **`service_role` key
tidak boleh** masuk repo (repo publik).

## Variabel lingkungan (`web/.env`, di produksi diset di Vercel)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` - login, buku tamu, inventaris, insights, RAG.
- `AI_API_BASE_URL`, `AI_MODEL`, `AI_API_KEY`, `AI_TIMEOUT_MS` - AI Assistant.
- `AI_EMBED_MODEL` - model embedding RAG (bge-m3).
- (Importer berita, sebagai repo secret/var GitHub) `TRANSLATE_OLLAMA_URL`,
  `TRANSLATE_OLLAMA_KEY`, `TRANSLATE_OLLAMA_MODEL`; atau `ANTHROPIC_API_KEY`.

## Yang masih tertunda / terblokir
1. **Named Tunnel `ai.smartagri.id`** (URL tetap untuk server AI) dan
   **email `hello@smartagri.id`** (Cloudflare Email Routing). Keduanya menunggu
   satu hal yang sama: nameserver domain `smartagri.id` dipindah ke Cloudflare
   (kimora/sam.ns.cloudflare.com) di registrar PT Digital Registra Indonesia,
   yang aksesnya belum ada. Panduan email: `Panduan-Email-hello-smartagri-id.docx`.
2. **Backfill terjemahan berita lama ke Inggris**: kode siap. Setelah Named
   Tunnel stabil, set 3 repo secret/var di atas (model `qwen2.5:32b`), lalu
   Actions > Import WordPress news > Run workflow > centang **retranslate**.
   Sebagian besar catatan sudah punya field `original`; sisanya (slug masih
   Indonesia) perlu dicek ulang.
3. **Document generator** (`ai/generate`) sementara disembunyikan.

## Catatan lingkungan dev (Windows)
- Node lewat **nvm-windows** (versi di `.nvmrc`). Jalankan dev dari `web/`
  (`npm run dev`, port 3000).
- Repo berisi nama file sangat panjang (gambar galeri). Aktifkan sekali:
  `git config core.longpaths true`, jika tidak, checkout/pull bisa gagal dengan
  "Filename too long".
- **Selalu mulai dari `main` terbaru** sebelum bekerja (importer berita
  menambah commit ke `main` sendiri). Branch kerja: `design-sync/ui-kit`.
