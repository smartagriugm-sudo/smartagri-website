# Desain Kanban smartagri

Status: **draf, menunggu persetujuan**. Belum ada kode atau migrasi yang ditulis.

Acuan perilaku: `docs/kanban/trello-findings.md` (kode E1–E8 di sana). Dokumen ini
memilih apa yang direplikasi dan bagaimana dibangun di stack smartagri:
TanStack Start, Supabase (anon key + RLS), Tailwind v4, Inter, palet brand.
Implementasi ditulis sendiri; tidak memakai kode, ikon, ilustrasi, atau nama
produk Trello/Atlassian di UI.

## 1. Fitur dan prioritas

### MVP (tahap 1 sampai 3)

| Fitur | Catatan | Acuan |
|---|---|---|
| Daftar board `/kanban` | kartu board, buat board, board berbintang di atas | E5 |
| Board: list dan card | list horizontal, scroll samping, card berurut `pos` | E5 |
| Tambah list dan card (quick add) | composer di bawah list; Enter simpan dan buka composer berikutnya, Esc batal | E3, E7 |
| Ubah nama board, list, card inline | textbox inline | E3, E7 |
| Arsip list dan card (soft, `archived_at`) | tidak ikut dimuat; bisa dipulihkan | E5 |
| Drag & drop card (dalam dan antar-list) dan reorder list | placeholder, auto-scroll, update optimistik dengan rollback | E3 |
| Modal card ber-URL | board tetap dirender di belakang | E7 |
| Deskripsi markdown | pakai `react-markdown` + `remark-gfm` yang sudah ada | E7 |
| Label board (warna tetap + nama opsional) | 10 warna dari palet sendiri, bukan palet Trello | E5 |
| Member card | dari anggota board | E5, E7 |
| Start/due date + tanda selesai | `due_complete`; badge overdue | E5 |
| Checklist + item + progres | item dimuat saat modal dibuka | E5, E7 |
| Komentar | edit/hapus oleh penulis | E7 |
| Log aktivitas card | ditulis oleh trigger DB | E7 |
| Badge depan card | jumlah komentar, checklist x/y, lampiran, due | E5 |
| Peran owner, member, viewer | RLS | E5 |

### Lanjutan (tahap 4 sampai 6)

| Fitur | Tahap | Acuan |
|---|---|---|
| Filter: kata kunci, member, label, due, status selesai, aktivitas; mode any/all | 4 | E6 |
| Menu board: ganti nama, deskripsi, warna latar (dari palet brand), star, kelola label, kelola anggota | 4 | E6 |
| Archived items (pulihkan atau hapus permanen) | 4 | E6 |
| Activity feed board (tab Semua / Komentar, paginasi) | 4 | E7 |
| Move / copy card (termasuk ke board lain) | 4 | E7 |
| Real-time antar pengguna | 5 | E5 |
| Shortcut keyboard (subset, lihat bagian 8) | 5 | E7 |
| Lampiran (Supabase Storage) dan cover card | 5 | E5, E7 |
| Import satu kali dari ekspor JSON Trello | 6 | - |

### Tidak direplikasi

Power-Ups, Automation, Custom Fields, stickers, voting, email-to-board, template
gallery, tampilan Table/Calendar/Timeline/Map, undo/redo/repeat, bulk select. Bisa
dibahas setelah MVP.

## 2. Skema Supabase

File baru: `web/supabase/kanban.sql` (idempoten, dijalankan manual di SQL editor,
gaya mengikuti `inventory.sql`). Semua tabel di schema `public`, prefix `kanban_`
supaya tidak bentrok dengan tabel lain.

```sql
-- Board
kanban_boards (
  id           uuid pk default gen_random_uuid(),
  slug         text unique not null,          -- 8 karakter acak, dipakai di URL
  name         text not null,
  description  text not null default '',
  background   text not null default 'teal',  -- kunci warna dari palet brand
  visibility   text not null default 'private', -- private | team
  card_seq     integer not null default 0,    -- penghitung nomor card per board
  created_by   uuid not null references auth.users,
  created_at   timestamptz default now(),
  archived_at  timestamptz
)

kanban_board_members (
  board_id   uuid references kanban_boards on delete cascade,
  user_id    uuid references auth.users on delete cascade,
  role       text not null check (role in ('owner','member','viewer')),
  starred    boolean not null default false,  -- preferensi per pengguna
  added_at   timestamptz default now(),
  primary key (board_id, user_id)
)

kanban_lists (
  id uuid pk, board_id uuid not null references kanban_boards on delete cascade,
  name text not null, pos double precision not null,
  archived_at timestamptz, created_at timestamptz default now()
)

kanban_cards (
  id uuid pk,
  board_id    uuid not null references kanban_boards on delete cascade, -- denormal untuk RLS dan filter realtime
  list_id     uuid not null references kanban_lists on delete cascade,
  number      integer not null,              -- nomor urut per board (dari card_seq)
  title       text not null,
  description text not null default '',      -- markdown
  pos         double precision not null,
  start_at    timestamptz, due_at timestamptz,
  due_complete boolean not null default false,
  cover_attachment_id uuid, cover_color text,
  created_by  uuid references auth.users,
  created_at  timestamptz default now(), updated_at timestamptz default now(),
  archived_at timestamptz,
  unique (board_id, number)
)

kanban_labels (id uuid pk, board_id uuid not null ..., name text not null default '', color text not null)
kanban_card_labels  (card_id uuid, label_id uuid, board_id uuid, primary key (card_id, label_id))
kanban_card_members (card_id uuid, user_id uuid, board_id uuid, primary key (card_id, user_id))

kanban_checklists (id uuid pk, card_id uuid not null ..., board_id uuid not null, title text not null, pos double precision not null)
kanban_checklist_items (
  id uuid pk, checklist_id uuid not null ..., board_id uuid not null,
  text text not null, pos double precision not null,
  done boolean not null default false, due_at timestamptz, assignee_id uuid
)

kanban_card_comments (
  id uuid pk, card_id uuid not null ..., board_id uuid not null,
  author_id uuid not null references auth.users,
  body text not null, created_at timestamptz default now(), edited_at timestamptz
)

kanban_card_activity (
  id bigint generated always as identity pk,
  board_id uuid not null, card_id uuid,       -- card_id null untuk aksi level board/list
  actor_id uuid references auth.users,
  type text not null,                         -- card.created | card.moved | card.archived | label.added | ...
  data jsonb not null default '{}',           -- potongan nama + nilai lama (pola data/old Trello)
  created_at timestamptz default now()
)

kanban_card_attachments (
  id uuid pk, card_id uuid not null ..., board_id uuid not null,
  name text not null, storage_path text,      -- null jika tautan
  url text, mime_type text, bytes bigint,
  uploaded_by uuid, created_at timestamptz default now()
)
```

Keputusan desain:

- `board_id` diduplikasi di semua tabel anak supaya kebijakan RLS cukup satu
  pemanggilan fungsi dan Supabase Realtime bisa difilter `board_id=eq.{id}`.
  Trigger `before insert` mengisinya dari induk; klien tidak bisa memalsukannya.
- Komentar tabel sendiri (bukan action seperti Trello) agar edit dan RLS penulis
  sederhana. Aktivitas tetap tabel terpisah yang **hanya ditulis trigger**
  (`security definer`), jadi log tidak bisa dipalsukan klien.
- Badge (jumlah komentar, checklist x/y, lampiran) dihitung lewat view
  `kanban_card_badges` atau di klien dari data yang sudah dimuat; tidak disimpan
  denormal dulu. Dievaluasi kalau board besar terasa lambat.
- Nomor card per board (`number`) diisi trigger dari `card_seq` (atomik
  `update ... returning`), dipakai di URL.
- Profil anggota memakai tabel `profiles` yang sudah ada (`full_name`, `avatar_url`).
  Perlu kebijakan baca tambahan: sesama anggota board boleh membaca profil
  (saat ini `profiles` hanya bisa dibaca pemiliknya). Ini lewat view
  `kanban_member_profiles` dengan fungsi `security definer`, tanpa membuka
  `profiles` untuk semua orang.

## 3. Kebijakan RLS per peran

Fungsi bantu: `kanban_role(board uuid) returns text`, `stable`,
`security definer`, mengembalikan `owner` | `member` | `viewer`, atau null.
Board ber-`visibility='team'` memberi peran `viewer` implisit ke semua pengguna
login yang bukan anggota.

| Tabel | Baca | Tulis | Hapus |
|---|---|---|---|
| `kanban_boards` | role tidak null | update: owner | owner |
| `kanban_board_members` | role tidak null | owner (tambah, ubah peran) | owner; atau diri sendiri (keluar board) |
| `kanban_lists`, `kanban_cards`, `kanban_labels`, `kanban_card_labels`, `kanban_card_members`, `kanban_checklists`, `kanban_checklist_items` | role tidak null | owner, member | owner, member (hapus permanen hanya dari Archived items) |
| `kanban_card_comments` | role tidak null | insert: owner, member, `author_id = auth.uid()`; update: penulis saja | penulis atau owner |
| `kanban_card_activity` | role tidak null | tidak ada (hanya trigger) | tidak ada |
| `kanban_card_attachments` | role tidak null | owner, member | pengunggah atau owner |
| `storage.objects` bucket `kanban` (privat) | role tidak null pada folder `{board_id}` | owner, member | pengunggah atau owner |

Lain-lain:

- Saat board dibuat, trigger menambahkan pembuatnya sebagai `owner`.
- Board harus selalu punya minimal satu owner (trigger menolak menghapus atau
  menurunkan owner terakhir).
- Viewer: semua kontrol tulis disembunyikan di UI; RLS tetap jadi penjaga utama.
- Path file: `{board_id}/{card_id}/{uuid}-{nama-file}`; dibuka lewat signed URL
  berumur pendek, bukan URL publik.

## 4. Strategi posisi (fractional ordering)

Mengikuti pola yang teramati (E5): `pos` bertipe float dan hanya baris yang
dipindah yang diubah.

- Card atau list baru di bawah: `pos = (pos terakhir) + 1024`; list kosong mulai di 1024.
- Sisip di antara A dan B: `pos = (A.pos + B.pos) / 2`; di atas: `B.pos / 2`.
- Pindah antar-list: satu `update kanban_cards set list_id, pos where id`.
- Rebalance: kalau selisih ke tetangga < `1e-6`, panggil RPC
  `kanban_rebalance_list(list_id)` yang menomori ulang seluruh list dengan jarak
  1024 dalam satu transaksi. Ini jarang terjadi (double punya sekitar 50 kali
  pembagian dua sebelum presisinya habis).
- Helper murni `positionBetween(before, after)` dan `needsRebalance` di
  `web/src/lib/kanban.ts`, diuji unit dengan Vitest.
- Tidak menambah dependency (`fractional-indexing` berbasis string tidak perlu).

## 5. Update optimistik dan real-time

Update optimistik:

1. Saat drop: ubah state lokal dulu (card langsung pindah), lalu kirim `update`.
2. Kalau gagal (RLS, jaringan): kembalikan ke snapshot sebelum drag dan tampilkan
   toast "Gagal memindahkan card".
3. Setiap mutasi membawa `client_mutation_id`; event real-time dengan id yang sama
   diabaikan supaya UI tidak "berkedip".

Real-time (Supabase Realtime, `postgres_changes`):

- Satu channel per board: `kanban:{board_id}`, berlangganan `INSERT/UPDATE/DELETE`
  pada `kanban_lists`, `kanban_cards`, `kanban_card_labels`, `kanban_card_members`,
  `kanban_checklist_items`, `kanban_card_comments` dengan filter `board_id=eq.{id}`.
  RLS berlaku untuk event ini, jadi pengguna hanya menerima baris yang boleh dibaca.
- Event diterapkan sebagai patch per baris ke state lokal (mirip pola `_deltas`
  di E5: hanya yang berubah).
- Saat koneksi putus lalu tersambung lagi: muat ulang board penuh, karena event
  yang terlewat tidak diputar ulang.
- Tabel di atas perlu ditambahkan ke publication `supabase_realtime` di migrasi.
- Opsional: Realtime Presence untuk menampilkan siapa yang sedang membuka card.

## 6. Route

Mengikuti konvensi flat route yang sudah ada (`inventory_.$slug.tsx`):

| File | URL | Isi |
|---|---|---|
| `routes/kanban.tsx` | `/kanban` | daftar board (AuthGate) |
| `routes/kanban_.$board.tsx` | `/kanban/{slug}` | board; me-render `<Outlet />` untuk modal |
| `routes/kanban_.$board.c.$card.tsx` | `/kanban/{slug}/c/{number}` | modal card di atas board |

- Membuka card = `navigate` ke route anak; board tetap ter-mount sehingga posisi
  scroll terjaga. Esc atau klik backdrop kembali ke `/kanban/{slug}`.
- Link card bisa dibagikan; membuka langsung URL card me-render board lalu modal.
- Gaya halaman mengikuti `/inventory` dan `/account`: `AuthGate`, `SiteHeader`,
  `PageHero` ringkas untuk `/kanban`, `AmbientWash`, `MaskLine`, kartu
  `rounded-[24px]`, Inter, CTA `#45DFB1`. Halaman board memakai kanvas penuh
  (tanpa PageHero) supaya list punya ruang.
- Link "Kanban" ditambahkan di menu akun `SiteHeader`, di dekat "Instrument inventory".
- Data dimuat di klien lewat `supabase` dari `lib/auth/supabase.ts`, sama seperti
  `/inventory`. Tanpa localStorage: filter aktif disimpan di search param URL
  (`?label=...&member=...&q=...`).

## 7. Library drag & drop (perlu persetujuan)

Rekomendasi: **`@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`** (MIT).

| Opsi | Kelebihan | Kekurangan |
|---|---|---|
| **dnd-kit** (rekomendasi) | sensor pointer + touch + keyboard (penting untuk mobile dan aksesibilitas); preset sortable untuk list dan antar-container; auto-scroll bawaan; `DragOverlay` untuk placeholder; tanpa DOM global | API cukup luas; kurang optimal untuk lebih dari ribuan card tanpa virtualisasi |
| Pragmatic drag and drop (Atlassian, Apache-2.0) | yang dipakai Trello (E3); sangat ringan; native HTML5 drag | dukungan touch lemah (native drag di mobile terbatas); placeholder dan aksesibilitas keyboard harus dibuat sendiri |
| `@hello-pangea/dnd` | UX list ala kanban paling "jadi" | bundle lebih besar, kurang fleksibel, ikut pola lama react-beautiful-dnd |
| Tulis sendiri (pointer events) | tanpa dependency | butuh waktu dan rawan bug (auto-scroll, touch, keyboard) |

dnd-kit dipilih karena halaman harus mobile-responsive penuh dan drag dengan
sentuhan wajib jalan. Versi dikunci exact di `package.json`.

## 8. Shortcut keyboard (tahap 5)

Subset yang direplikasi: `?` (daftar shortcut), `f` (filter), `x` (hapus filter),
`q` (card saya), `n` (card baru), `Enter` (buka card), panah dan `j`/`k` (pilih card),
`e` (edit judul), `c` (arsip), `d` (due date), `l` (label), `m` (member), `Space`
(assign diri sendiri), `,`/`.` (pindah ke list sebelah), `Esc`, `Ctrl/Cmd+Enter`
(simpan teks). Shortcut dimatikan saat fokus di input/textarea.

## 9. Import dari Trello (opsional, tahap 6)

`web/scripts/import-trello.mjs`: membaca file ekspor JSON board, memetakan
`lists`, `cards`, `labels`, `checklists`, `actions` bertipe `commentCard` ke tabel
di atas, lalu menulis lewat Supabase dengan sesi pengguna yang login (anon key +
RLS, bukan service role). Member Trello dipetakan manual lewat file mapping
email; yang tidak terpetakan dicatat di komentar sebagai teks. Lampiran file
tidak diunduh otomatis (hanya disimpan sebagai tautan).

## 10. Pertanyaan untuk disetujui

1. Tambahkan `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`?
2. Siapa yang boleh membuat board: semua pengguna login, atau dibatasi?
3. Perlu `visibility='team'` (semua pengguna login bisa melihat), atau semua
   board privat dan hanya untuk anggota?
4. Skenario drag di board uji Trello (untuk memverifikasi payload dan rollback),
   perlu sebelum tahap 2, atau cukup desain ini?
