# Modal card Trello: temuan REA dan padanannya di Kanban smartagri

Target: card "M. Athala Fawwaz D." di board Smart Agriculture UGM, dibuka di Chrome dengan remote
debugging (profil terpisah), 25 Oktober 2026. Observasi hanya membaca; tidak ada isi card yang diubah.
Isi teks pribadi di card (deskripsi, komentar) tidak disalin ke dokumen ini.

## Evidence

| Evidence ID | Isi |
|---|---|
| `ev_6f6744597bb5805c45e05646c5b8b934711c914d10beb4f57b4188eb5fe536fd` | daftar target CDP (satu halaman card trello.com) |
| `ev_a9b4772994a0e8be8937966a79b9baf7d8c3a0cce6c0268ab43972ff7c4e0ed9` | observasi pasif: DOM dan pohon aksesibilitas modal card |
| `ev_2884bcddcdbed7085557a2169ec196b183d3a8b9ebafea2f5b004be95eca98b7` | observasi pasif setelah editor komentar dibuka |

Batasan: skenario klik untuk membuka menu Actions, Add to card, Status dan Cover berhenti dengan
`protocol_error` saat melepas koneksi CDP, sehingga isi menu-menu itu tidak terekam. Isinya diambil
dari screenshot yang dikirim pengguna dan ditandai *screenshot* di bawah.

## Struktur modal (teramati)

| Bagian Trello | Peran/nama aksesibilitas | Padanan smartagri |
|---|---|---|
| Pemilih list di kiri atas | button "Change list for this card, currently in FINAL DEFENSE" | tombol list (huruf kapital, panah) membuka daftar list |
| Kanan atas | Cover, Watching, Actions, Close dialog | Cover, Watch (mata), Actions (⋯), Close; melayang di atas cover |
| Cover | gambar penuh, button "Remove cover" | banner cover; hapus lewat Cover atau menu lampiran |
| Judul | "Mark this card complete", textbox judul | lingkaran selesai + judul yang bisa diedit |
| Baris aksi | Add to card, Dates, Checklist, Attachment | **+ Add** (menu), Dates, Checklist, Attachment |
| Field | Members (+), Labels (+), Status ("No status") | Members (+), Labels (+), Status, Due date (dengan centang selesai) |
| Deskripsi | heading + "Edit description", "Show more" | Edit, lipat dengan "Show more/Show less", klik ganda untuk edit |
| Lampiran | "Add an attachment", grup Links dan Files, "Attachment actions", "Open attachment (Opens new tab)", "View all attachments (54 hidden)" | sama: Links/Files terpisah, 4 per grup, tombol "View all attachments (N hidden)" |
| Menu lampiran (*screenshot*) | link: Edit, Comment, Remove; file: Edit, Comment, Download, Make cover, Remove | sama |
| Penampil lampiran (*screenshot*) | layar penuh, nama, tanggal, ukuran, Open in new tab, Download, Remove cover, Delete, panah kiri/kanan | sama, plus tombol panah keyboard |
| Checklist | judul, "Hide checked items", "Delete checklist", progressbar, checkbox per item, "Add an item" | sama; item bisa berisi markdown satu baris |
| Panel kanan | "Comments and activity", "Show details", "Write a comment…" | sama |
| Editor komentar | toolbar "Editor": Text styles, Bold Ctrl+B, Format text, Lists, Insert elements, Attach and insert link, Open help dialog, Save | editor markdown bersama (lihat bawah) |
| Komentar | nama, tautan waktu (`#comment-<id>`), isi; Add reaction, Edit, Delete, Reply (komentar orang lain), Add link as attachment (komentar berisi link) | sama |
| Card members popover (*screenshot*) | pencarian, Card members (dengan X), Board members | sama |
| Bawah layar | Power-ups, Automations | tidak disalin (di luar cakupan) |

## Editor markdown (semua teks yang bisa diedit)

`web/src/components/kanban/MarkdownEditor.tsx`, dipakai untuk deskripsi card, komentar baru, edit
komentar, dan deskripsi board. Teks yang disimpan tetap markdown biasa.

- Toolbar: gaya teks (Normal, H1, H2, H3), tebal, miring, coret, kode, daftar (bullet, nomor, tugas),
  link, gambar, sisip (kutipan, blok kode, tabel, garis), lampirkan file, pratinjau, bantuan format.
- Pintasan: Ctrl+B, Ctrl+I, Ctrl+Shift+X, Ctrl+E, Ctrl+K, Ctrl+Enter simpan, Esc batal.
- Enter di dalam daftar melanjutkan daftar; Enter di butir kosong mengakhirinya.
- Tempel atau seret file ke editor: file diunggah ke card dan tautannya disisipkan sebagai
  `[nama](#attachment-<id>)`; tautan ini membuka penampil lampiran (URL file privat kedaluwarsa,
  jadi yang disimpan adalah id).
- Item checklist dirender sebagai markdown satu baris (tebal, miring, kode, link).

## Fitur yang butuh SQL tambahan

`web/supabase/kanban-card-extras.sql` (dijalankan manual, aman diulang):
- kolom `status` di `kanban_cards` (To do, In progress, In review, Blocked, Done) dan log aktivitasnya;
- tabel `kanban_card_watchers` (Watch; ikon mata di muka card yang Anda pantau);
- tabel `kanban_comment_reactions` (reaksi emoji komentar).

Sebelum SQL dijalankan, Status, Watch dan reaksi disembunyikan; fitur lain tetap jalan.

## Belum disalin

- Notifikasi untuk card yang di-watch (belum ada sistem notifikasi); Watch saat ini menandai card.
- Mention `@nama` dengan daftar saran; Reply menyisipkan `@Nama` sebagai teks.
- Power-ups, Automations, Mirror card, Make template.
