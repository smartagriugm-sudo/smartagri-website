# Prompt untuk melanjutkan di sesi Claude Code baru

Salin blok di bawah ini sebagai pesan pertama di sesi Claude Code yang baru
(buka sesi dengan folder `Landing Page SmartAgri` sebagai working directory).

---

Saya melanjutkan pengembangan situs **smartagri** (Smart Agriculture Research
Center UGM, live di smart-agri.id). Folder ini adalah repo
`smartagriugm-sudo/smartagri-website`, aplikasinya di subfolder `web/`.

Sebelum mengubah kode apa pun:
1. Baca `CLAUDE.md` (aturan brand dan konvensi kode, WAJIB diikuti) dan
   `STATUS-PENGEMBANGAN.md` (ringkasan semua fitur yang sudah dibangun).
2. Pastikan `git config core.longpaths true` sudah aktif (repo punya nama file
   panjang; tanpa ini pull/checkout bisa gagal "Filename too long").
3. Mulai dari `main` terbaru: `git fetch origin && git merge --ff-only origin/main`
   (importer berita rutin menambah commit ke `main`).

Konteks penting yang perlu diingat:
- Stack: TanStack Start v1, React 19, TypeScript, Tailwind v4, framer-motion.
  Deploy via Vercel dari `main`. Dev dari `web/` dengan `npm run dev` (port 3000);
  Node lewat nvm-windows (versi di `.nvmrc`).
- AI Assistant (`/ai`) memakai server Ollama on-prem sendiri (GPU RTX 4090),
  bukan API pihak ketiga. Fitur sudah ada: chat streaming, pemilih model + toggle
  thinking, personalisasi profil, riwayat chat di Supabase, RAG (pgvector +
  embedding bge-m3, data sendiri saja), knowledge base, unggah PDF/DOCX/XLSX.
- Supabase hanya pakai **anon key** (publik). **Jangan** pernah memasukkan
  `service_role` key atau token/secret apa pun ke repo atau ke chat.
- Aturan konten: wordmark selalu `smartagri` huruf kecil; aset hanya lewat
  `src/lib/assets.ts`; **jangan gunakan em dash** di teks mana pun.

Pekerjaan yang masih tertunda (urut prioritas, lihat detail di
`STATUS-PENGEMBANGAN.md`):
1. Setelah nameserver `smartagri.id` dipindah ke Cloudflare (menunggu akses
   registrar Digital Registra): aktifkan Named Tunnel `ai.smartagri.id` (URL
   tetap server AI) dan email `hello@smartagri.id` (Cloudflare Email Routing,
   panduan di `Panduan-Email-hello-smartagri-id.docx`).
2. Backfill terjemahan berita lama ke Inggris: set repo secret/var GitHub
   `TRANSLATE_OLLAMA_URL` (= https://ai.smartagri.id/v1), `TRANSLATE_OLLAMA_KEY`
   (secret Caddy), var `TRANSLATE_OLLAMA_MODEL` (= qwen2.5:32b), lalu Actions >
   Import WordPress news > Run workflow > centang **retranslate**.
3. Document generator (`ai/generate`) masih disembunyikan; aktifkan bila sudah
   siap.

Tugas saya sekarang: **[ISI DI SINI apa yang ingin Anda kerjakan]**.
