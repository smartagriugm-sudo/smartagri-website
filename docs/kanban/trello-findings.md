# Temuan REA: perilaku dan model data board Trello

Tujuan dokumen ini: memahami perilaku dan model data board Trello tim
(`Smart Agriculture UGM`) sebagai acuan fitur Kanban smartagri. Implementasi
ditulis sendiri; tidak ada kode, ikon, ilustrasi, atau branding Trello yang
disalin ke repo.

Tanggal observasi: 23 Oktober 2026. Alat: REA (`rea-agents` 6.7.0) lewat CDP ke
Chrome 155 (profil terpisah, login oleh pemilik akun).

## Cara membaca

Setiap temuan diberi status:

- **teramati**: dilihat langsung di rekaman runtime REA (network, WebSocket, DOM, accessibility).
- **kesimpulan**: ditarik dari data yang teramati, tetapi tidak dilihat langsung.
- **dokumentasi**: dari dokumentasi publik Trello REST API, belum diverifikasi di runtime.
- **belum diketahui**: belum ada bukti; perlu skenario lanjutan.

Kode bukti (E1 dan seterusnya) merujuk ke tabel Evidence di akhir dokumen.

Privasi: rekaman disimpan di luar repo (scratchpad sesi). Nilai header, cookie,
dan token tidak direkam (`header_values: false`). Dokumen ini hanya memuat nama
field, jumlah, dan pola, tanpa isi card, nama anggota, atau ID objek.

## Batasan observasi

- Semua skenario bersifat read-only: muat ulang board, membuka menu, panel
  filter, menu Views, satu card, dialog shortcut, dan panel Activity. Tidak ada
  drag, buat, ubah, arsip, atau hapus yang dijalankan.
- Saat halaman dimuat, Trello sendiri mengirim `POST /1/boards/{id}/markAsViewed`,
  `POST /1/cards/{id}/markAsViewed`, dan `PUT /1/boards/{id}/pluginData/{id}`
  (dari Power-Up yang terpasang). Ketiganya dipicu oleh aplikasi Trello saat memuat
  halaman, bukan oleh aksi pengguna. **teramati** (E5, E7)
- Pertanyaan yang butuh mutasi (payload drag, rollback, bentuk event update
  real-time) ditandai **belum diketahui** dan perlu board uji terpisah.

---

## 1. Model data

### Board

| Temuan | Status | Bukti |
|---|---|---|
| Board di-fetch lewat `GET /1/board/{shortLink}` dengan `fields=` eksplisit; field yang diminta: `id, nodeId, name, desc, descData, closed, idOrganization, idMemberCreator, idTags, labelNames, limits, memberships, prefs, powerUps, premiumFeatures, shortLink, shortUrl, subscribed, dateLastActivity, dateLastView, url, type`. | teramati | E5 |
| `prefs` berisi antara lain `permissionLevel` (private/org/public), `background*` (warna, gambar, versi gelap, gambar terskala), `cardCovers`, `cardAging`, `comments`, `invitations`, `voting`, `selfJoin`, `showCompleteStatus`, `switcherViews`, `isTemplate`, `autoArchive`. | teramati | E5 |
| `memberships[]` memisahkan keanggotaan dari profil anggota: `{id, idMember, memberType, unconfirmed, deactivated, orgMemberType}`. `memberType` yang teramati: `admin`, `normal`. | teramati | E5 |
| Profil anggota (`members[]`): `id, username, fullName, initials, avatarUrl, memberType, confirmed, ...`. | teramati | E5 |
| `myPrefs` adalah preferensi per pengguna per board (sidebar, email-to-board), terpisah dari `prefs` board. | teramati | E5 |
| Peran ketiga `observer` (read-only) ada di filter activity (`makeObserverOfBoard`), tetapi tidak dipakai di board ini. | kesimpulan | E7 |

### List

| Temuan | Status | Bukti |
|---|---|---|
| Field list: `id, idBoard, name, pos (float), closed, color, subscribed, softLimit, type, datasource, limits`. | teramati | E5 |
| Saat board dimuat hanya `lists=open` yang diambil; list yang diarsip (`closed=true`) tidak ikut. | teramati | E5 |
| Ada batas jumlah card per list (`limits.cards.openPerList` dan `totalPerList`, masing-masing `warnAt`/`disableAt`). | teramati | E5 |

### Card

| Temuan | Status | Bukti |
|---|---|---|
| Card dimuat sekaligus dengan board: `cards=visible`, 455 card di 15 list. | teramati | E5 |
| Field inti card: `id, idBoard, idList, idShort, shortLink, name, desc, descData, pos (float), closed, dateClosed, dateLastActivity, start, due, dueComplete, dueReminder, idLabels[], labels[], idMembers[], idAttachmentCover, cover, badges, subscribed, isTemplate, cardRole, recurrenceRule, url`. | teramati | E5 |
| `idShort` adalah nomor urut card per board; muncul di URL card `/c/{shortLink}/{idShort}-{slug-judul}`. | teramati | E5, E7 |
| `badges` adalah ringkasan denormalisasi untuk tampilan depan card: `comments, attachments, checkItems, checkItemsChecked, description (bool), due, dueComplete, start, votes, location, subscribed, attachmentsByType`. Badge dikirim dari server, tidak dihitung ulang di klien. | teramati | E5 |
| `labels[]` di card disertakan lengkap (`id, name, color, idBoard`) selain `idLabels[]`. | teramati | E5 |
| Detail card saat modal dibuka diambil ulang lewat `GET /1/card/{shortLink}` dengan field tambahan: `idChecklists, idMemberCreator, idMembersVoted, dateViewedByCreator, manualCoverAttachment, email`, serta `attachments`, `stickers`, `customFieldItems`, `pluginData`. | teramati | E7 |

### Label

| Temuan | Status | Bukti |
|---|---|---|
| Label milik board: `{id, idBoard, name, color}`; board ini punya 14 label; dimuat dengan `labels=all, labels_limit=1000`. | teramati | E5 |
| Nama label boleh kosong (label hanya warna). | teramati | E6 (filter menampilkan checkbox label tanpa nama) |
| Palet warna tetap: 10 warna dasar `green, yellow, orange, red, purple, blue, sky, lime, pink, black`, masing-masing punya varian `_dark` dan `_light` (30 nilai di `labelNames`). | teramati | E5 |

### Checklist dan item

| Temuan | Status | Bukti |
|---|---|---|
| Checklist: `{id, idBoard, idCard, name, pos}`. Saat board dimuat, item checklist tidak diambil (`card_checklist_checkItems=none`); progres depan card memakai `badges.checkItems`/`checkItemsChecked`. | teramati | E5 |
| Item diambil saat modal dibuka: `GET /1/checklist/{id}?checkItems=all`, field item `id, idChecklist, name, nameData, pos, state, due, dueReminder, idMember`. | teramati | E7 |
| `state` item bernilai `complete`/`incomplete` (nama aksi `updateCheckItemStateOnCard`). Item bisa punya assignee dan due sendiri. | dokumentasi; nama field teramati | E7 |
| Modal menampilkan persentase dan progress bar per checklist. | teramati | E7 |

### Attachment dan cover

| Temuan | Status | Bukti |
|---|---|---|
| Attachment: `{id, name, fileName, mimeType, bytes, date, idMember, isUpload, url, pos, edgeColor, previews[]}`. `isUpload=false` berarti tautan (bukan file). | teramati | E5, E7 |
| Pratinjau gambar disajikan dalam beberapa ukuran (`cover.scaled[]` dan `previews[]`: `url, width, height, bytes`). | teramati | E5 |
| Cover card: `{idAttachment | color, size (normal|full), brightness, yPosition, scaled[]}`. Teramati 446 cover `normal` dan 9 `full`; cover bisa dari attachment atau warna. | teramati | E5 |
| Modal punya aksi "Cover" dan "Remove cover". | teramati | E7 |

### Komentar dan aktivitas (action)

| Temuan | Status | Bukti |
|---|---|---|
| Komentar bukan tabel terpisah: komentar adalah *action* dengan `type=commentCard`. Komentar card diambil lewat `GET /1/cards/{id}?actions=commentCard,copyCommentCard,createCard,...&actions_limit=50&action_reactions=true`. | teramati | E7 |
| Bentuk action: `{id, type, date, idMemberCreator, memberCreator, data, display, reactions, limits}`. `data` memuat potongan objek terkait (`card`, `list`, `board`, `checklist`, `attachment`) dan `old` untuk nilai sebelum diubah. | teramati | E7 |
| `display` berisi `translationKey` (mis. `action_comment_on_card`, `action_archived_card`) plus `entities`, sehingga kalimat aktivitas dirangkai di klien dari kunci terjemahan. | teramati | E7 |
| Activity board diambil lewat `GET /1/boards/{id}/actions?filter=...&limit=50&page=0`. Daftar filter berisi 48 tipe, antara lain `createCard, updateCard:idList, updateCard:closed, updateCard:due, updateCard:dueComplete, commentCard, addMemberToCard, removeMemberFromCard, addChecklistToCard, updateCheckItemStateOnCard, addAttachmentToCard, deleteAttachmentFromCard, createList, updateList:closed, moveCardToBoard, copyCard, deleteCard, updateBoard`. | teramati | E7 |
| Panel Activity punya tab "All" dan "Comments". Komentar bisa diberi reaksi, diedit, dihapus, dan dibalas. | teramati | E7 |
| Pagination aktivitas memakai `limit` dan `page`. | teramati | E7 |

### Relasi (ringkasan)

```
organization 1..n board
board 1..n membership n..1 member        (memberType: admin | normal | observer)
board 1..n list 1..n card                (card.idList, card.idBoard)
board 1..n label;  card n..n label       (card.idLabels)
card n..n member                         (card.idMembers)
card 1..n checklist 1..n checkItem
card 1..n attachment;  card.cover -> attachment | color
board/card 1..n action                   (komentar = action commentCard)
```

**kesimpulan** dari E5 dan E7.

---

## 2. Pengurutan (`pos`)

| Temuan | Status | Bukti |
|---|---|---|
| `pos` list dan card adalah bilangan float, bukan indeks integer. Urutan tampilan = urut naik `pos` dalam satu list. | teramati | E5 |
| Nilai `pos` list yang teramati antara lain 32767.5, 45055.47, 57343.44, 131071.25, 327679, 458751. Nilai pecahan muncul ketika list disisipkan di antara dua list. | teramati (nilai), kesimpulan (alasan) | E5 |
| `pos` card: ada list dengan pola kelipatan 1024 (1024, 2048, 4096, 8192), lalu nilai tengah seperti 4352 dan 4608, yaitu titik tengah antara dua tetangga. 193 dari 455 card punya `pos` pecahan. | teramati | E5 |
| Rentang `pos` card 0,75 sampai sekitar 1,4 x 10^14, jadi "taruh di bawah" kemungkinan memakai nilai jauh lebih besar dari card terakhir. | teramati (rentang), kesimpulan (alasan) | E5 |
| Pindah card antar-list = ubah `idList` dan `pos` card itu saja; card lain tidak diubah. | dokumentasi (`PUT /1/cards/{id}` dengan `idList`, `pos`); belum diverifikasi runtime | - |
| `pos` menerima `top`, `bottom`, atau angka positif. | dokumentasi | - |
| Rebalancing (renumber ulang) ketika selisih `pos` terlalu kecil. | belum diketahui | - |
| Payload persis yang dikirim saat drag. | belum diketahui (butuh skenario drag di board uji) | - |

---

## 3. Drag and drop

| Temuan | Status | Bukti |
|---|---|---|
| DOM card dan list memakai atribut `data-drop-target-for-element` (512 node) dan `data-drop-target-for-external` (57 node). Pola ini cocok dengan pustaka drag and drop berbasis HTML5 drag event milik Atlassian (keluarga *pragmatic drag and drop*). | teramati (atribut), kesimpulan (pustaka) | E3 |
| Ada atribut untuk target drop dan indikator posisi: `data-card-drop-list-id`, `data-card-drop-card-id`, `data-card-drag-hover-card-id`, `data-card-drag-hover-position`. Artinya placeholder dihitung relatif ke card yang di-hover (atas/bawah). | teramati (atribut), kesimpulan (perilaku) | E3 |
| Auto-scroll: `data-auto-scrollable` (16 node), `data-drag-scroll-enabled`, `data-card-drag-list-scroll-container` (15, satu per list). Kanvas board dan tiap list bisa di-scroll otomatis saat drag. | teramati (atribut), kesimpulan (perilaku) | E3 |
| Reorder list: `data-list-reorder-visual` per list. | teramati (atribut) | E3 |
| `data-drop-target-for-external` menandakan file dari luar browser bisa di-drop (attachment). | kesimpulan | E3 |
| Link judul card punya `draggable="false"`; yang di-drag adalah wrapper card. Listener tidak dipasang langsung di elemen `list-card` (didelegasikan). | teramati | E3, E8 |
| Drag antar-board ada (`moveCardToBoard`, `moveListToBoard` di filter activity), tetapi lewat menu Move, bukan drag. | kesimpulan | E7 |
| Update optimistik dan rollback saat gagal. | belum diketahui (butuh skenario drag; idealnya simulasi offline) | - |
| Bulk select dengan Shift+klik, lalu menu aksi massal lewat klik kanan atau `e`. | teramati (dialog shortcut) | E7 |

---

## 4. Detail card (modal)

| Temuan | Status | Bukti |
|---|---|---|
| Modal ber-URL: klik card mengubah URL ke `/c/{shortLink}/{idShort}-{slug}` tanpa reload; Esc mengembalikan ke `/b/{shortLink}/{slug}`. Board tetap dirender di belakang dialog. | teramati | E7 |
| Header modal: tombol pindah list ("Change list for this card, currently in ..."), Cover, Watching, Actions, Close. | teramati | E7 |
| Judul dapat diedit langsung (textbox) dengan tombol "Mark this card complete" di sebelahnya. | teramati | E7 |
| Tombol tambah: "Add", "Dates", "Checklist", "Attachment". | teramati | E7 |
| Seksi Members (avatar + "Add members to card"), Labels (+ "Add a label"), Status. | teramati | E7 |
| Deskripsi dirender sebagai rich text (heading, paragraf, tautan, blockquote) dengan tombol "Edit description". Sumbernya `desc` (markdown) plus `descData` (emoji). | teramati | E5, E7 |
| Attachments: daftar file dengan tanggal, tombol buka di tab baru, menu aksi per attachment, "View all attachments (N hidden)" untuk daftar panjang. | teramati | E7 |
| Checklist: judul, tombol Delete, persentase, progress bar, "Add an item". | teramati | E7 |
| Panel kanan "Comments and activity" dengan "Show details" (menampilkan action non-komentar), "Write a comment", dan komentar ber-anchor `#comment-{id}`. Lebar panel bisa diubah ("Drag to resize"). | teramati | E7 |
| Tanggal start dan due, `dueComplete`, `dueReminder` (menit sebelum due). | teramati (field), belum diketahui (UI picker belum dibuka) | E5 |
| Isi menu Actions (move, copy, archive, delete). | belum diketahui (menu belum dibuka); nama action `copyCard, deleteCard, updateCard:closed, moveCardToBoard` teramati | E7 |
| Archive = `closed=true` (soft); delete = hapus permanen (`deleteCard`). | dokumentasi; nama action teramati | E7 |

---

## 5. Menu board

| Temuan | Status | Bukti |
|---|---|---|
| Header board: nama board bisa diedit inline ("Board name" textbox), Views, Filter cards, Star, Visibility (Private), Share, Show menu. | teramati | E3 |
| Isi menu: anggota board dan Share; About this board (deskripsi); Visibility; Print, export, and share; Star; Settings; Change background; Custom Fields (berbayar); Automation; Power-Ups; Labels; Stickers; Activity; Archived items; Watch; Copy board; Email-to-board; Leave board. | teramati | E6 |
| Filter: kata kunci (mencari card, member, label); Members (No members, Cards assigned to me, pilih member); Card status (Marked as complete / Not); Due date (No dates, Overdue, Due next day/week/month); Labels (No labels, per label); Activity (aktif 1/2/4 minggu terakhir, tanpa aktivitas 4 minggu); mode "Any match" (dropdown, kemungkinan versus "Exact match"). | teramati | E6 |
| Filter tidak memicu request jaringan saat panel dibuka; filter berjalan di klien atas card yang sudah dimuat. | teramati (tidak ada request di langkah filter), kesimpulan (eksekusi klien) | E6 |
| Activity feed board: lihat bagian 1 (action). | teramati | E7 |
| Archived items: belum dibuka; card arsip tidak ikut dimuat (`cards=visible`), jadi kemungkinan diambil terpisah saat panel dibuka. | kesimpulan | E5 |
| Kelola label (buat/ubah/hapus). | belum diketahui (panel Labels belum dibuka) | - |

---

## 6. Sinkronisasi real-time

| Temuan | Status | Bukti |
|---|---|---|
| Ada dua kanal WebSocket: `wss://trello.com/1/Session/socket` (kanal lama) dan `wss://trello.com/gateway/api/graphql/subscriptions` (GraphQL). | teramati | E5 |
| Kanal lama: klien mengirim `ping` lalu `subscribe` per model: `{type:"subscribe", modelType:"Board"|"Member"|"Organization", idModel, tags:["clientActions","updates"], reqid}`. Server membalas `{reqid, result:<angka>}`. Angka itu kemungkinan nomor urut update terakhir (bandingkan field `ixUpdate` di member). | teramati (frame), kesimpulan (arti angka) | E5 |
| Kanal GraphQL mengikuti protokol graphql-ws: `connection_init` lalu `connection_ack`, kemudian `subscribe` dengan `operationName` (`TrelloBoardUpdatedWithoutMemberships`, `TrelloMemberUpdated`, `TrelloWorkspaceUpdated`, `TrelloBoardPlannerEventCards`). Server membalas `next`. | teramati | E5 |
| Payload `next` untuk board berbentuk patch: `onBoardUpdated: {id, objectId, _deltas: ["lists", "prefs.background.darkImage", ...], <field yang berubah>, onListMoved}`. Jadi server mengirim daftar path yang berubah beserta nilai barunya, bukan seluruh board. | teramati | E5 |
| Bentuk event saat card dipindah/diubah oleh pengguna lain. | belum diketahui (butuh dua sesi dan mutasi di board uji) | - |
| Klien memakai dua jalur pemuatan paralel: REST `quickload:*` dan GraphQL `quickload:Trello*` (`TrelloCurrentBoardListsCards`, `TrelloCurrentBoardInfo`). | teramati | E5 |

---

## 7. Shortcut keyboard dan quick add

Semua di bawah **teramati** dari dialog shortcut (`?`, URL berubah ke `?overlay=shortcuts`) (E7):

| Tombol | Aksi |
|---|---|
| ← → ↑ ↓, `j`/`k` | pilih card bertetangga; di modal, buka card sebelah |
| `Enter` | buka card terpilih |
| `n` | sisipkan card baru setelah card terpilih |
| `e` | quick edit (judul dan lain-lain) dari depan card |
| `t` | edit judul (di modal) |
| `c` | arsip card |
| `d` | buka picker due date |
| `l`, angka `1`–`0` | popover label; angka toggle label per warna |
| `m` | tambah/hapus member |
| `Space` | assign/unassign diri sendiri |
| `s` | watch card |
| `-` | tambah checklist (di modal) |
| `,` `.` `<` `>` | pindah card ke list sebelah (bawah/atas) |
| `f` | buka filter (fokus ke kata kunci) |
| `q` | toggle filter "Cards assigned to me" |
| `x` | hapus semua filter |
| `;` | tampil/sembunyikan nama label |
| `]` | toggle menu board |
| `/` | fokus pencarian header |
| `b` | buka switcher board |
| `Esc` | tutup dialog/popover atau batal edit |
| `Ctrl/Cmd+Enter` | simpan teks |
| `Ctrl/Cmd+C`, `X`, `V` | salin/potong/tempel card; tempel teks/link membuat card baru |
| `z`, `Shift+z`, `r` | undo, redo, ulangi aksi terakhir |
| `@` | autocomplete member di komentar |
| `Shift+Scroll` | scroll board ke samping |

Quick add: tombol "Add a card in {list}" di bawah tiap list dan "Add another list"
**teramati** (E3). Perilaku Enter di composer (simpan lalu buka composer berikutnya)
**dokumentasi**, belum diverifikasi; dialog shortcut menyebut `Shift+Enter` saat
submit card (teks terpotong di rekaman).

---

## 8. Tampilan lain

| Temuan | Status | Bukti |
|---|---|---|
| Menu Views menampilkan Board (aktif), Table, Calendar, Timeline, Dashboard, Map; selain Board terkunci di paket gratis ("Upgrade for Views"). | teramati | E6 |
| Calendar tersedia lewat Power-Up di `/b/{shortLink}/{slug}/calendar`. | teramati | E6, E7 |

---

## Pertanyaan terbuka (butuh board uji dan izin)

1. Payload persis saat drag card antar-list dan reorder list (`PUT` dengan `idList`/`pos`?).
2. Update optimistik: apakah UI berpindah sebelum respons server; rollback saat gagal (perlu simulasi offline).
3. Bentuk event real-time yang diterima sesi kedua saat card dipindah, diubah, atau dikomentari.
4. Isi menu Actions card, panel Labels, panel Archived items.
5. Rebalancing `pos`.

## Evidence

| Kode | Evidence ID | Isi |
|---|---|---|
| E1 | `ev_c061a83658fb296ed1621a727f03cff0b098575237324ec11535b8e36d8637c3` | Skenario tanpa login: board privat |
| E2 | `ev_11a06cefe022be246be55844aae42a167ab892edf1563a619d94274a1780c545` | Daftar target CDP (tab board) |
| E3 | `ev_9ebcb842921eb2b758d8b0f16ba7c6da2a5b5b5dd7080ca6ad9fe402e3c71f22` | Inspeksi pasif: DOM, accessibility, script |
| E4 | `ev_046aa56e8cc4dcf3648956b943964ac27b660914a72b8f6f872ff86eb354cafc` | Muat ulang pertama (sebagian terpotong budget) |
| E5 | `ev_c7879d5d7fcbed9c727516bb5c733b3a2ab9e518240b89754945a58dc3c0773e` | Muat ulang lengkap: REST/GraphQL, WebSocket |
| E6 | `ev_3e8f7507dac6e7f2a181c6f270aeed854d3179fb7b9b9a6dba6e155fde1cf3c7` | Menu board, filter, Views |
| E7 | `ev_d0cfc628f447ffcce6d2a56142e8dcb628ec0abe2d762fa03cc5ae687e78734d` | Modal card, dialog shortcut, Activity |
| E8 | `ev_bb0657de0419199da81c1ecbfc2f8cfeb97d352234225a77967e8a3fb0664d8e` | Listener langsung di `list-card` (kosong) |
