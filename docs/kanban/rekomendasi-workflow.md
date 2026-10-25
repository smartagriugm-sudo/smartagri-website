# Analisis board dan rekomendasi workflow Kanban smartagri

Sumber: ekspor board Trello "Smart Agriculture UGM" (23 Oktober 2026) yang sudah diimpor ke
Kanban smartagri. Semua angka agregat; tidak ada isi card atau nama orang di dokumen ini.

## 1. Gambaran board saat ini

| Ukuran | Nilai |
|---|---|
| Card aktif / diarsip | 455 / 28 |
| List | 15 |
| Card dengan deskripsi | 378 (83%) |
| Card dengan cover gambar | 373 (82%) |
| Card dengan label | 73 (16%) |
| Card dengan due date | 33 (7%), 15 di antaranya lewat tenggat |
| Card dengan checklist | 64; 586 dari 702 item selesai (83%) |
| Komentar (riwayat lengkap) | 6.768, terkumpul di card progres dan card mahasiswa |
| Card tanpa aktivitas lebih dari 90 hari | 389 (85%) |
| Card tanpa aktivitas lebih dari 1 tahun | 200 (44%) |

Komposisi 1000 aksi terakhir (Juli sampai Oktober 2026): tambah lampiran 367, ubah card 294,
komentar 223, centang checklist 30, tambah anggota 29, **card baru hanya 21**.

### Satu board, empat fungsi

| Fungsi | List | Card | Median hari sejak aktivitas terakhir |
|---|---|---|---|
| Alur riset dan tesis | Research proposal, Experiment, Final defense, Thesis revision | 28 | 4 sampai 39 |
| Alur publikasi | Draft publication, On progress publication, Published | 57 | 65 sampai 333 |
| Direktori dan logbook mahasiswa | Graduate students | 104 | 327 |
| Perpustakaan dan arsip | References, Learning, Code library, Project, Conferences, Arsip lomba/project, Arsip conference | 266 | 164 sampai 2.537 |

Hanya sekitar 85 card (19%) yang benar-benar bergerak di alur kerja. Sisanya dokumen rujukan,
profil, dan arsip, yang membuat kolom aktif tenggelam di antara 15 list.

## 2. Temuan

1. **Alur kerja bercampur dengan perpustakaan.** List rujukan dan arsip (266 card) berdiri sejajar
   dengan list tahapan riset, sehingga board sulit dibaca sebagai papan kerja harian.
2. **Pipeline publikasi macet.** Draft publication berisi 28 card; 26 tidak bergerak lebih dari 90
   hari dan 13 lebih dari setahun. Tidak ada card yang memakai due date atau checklist di list ini.
3. **Due date hampir tidak dipakai.** Hanya 7% card; dari yang ada, 45% sudah lewat tenggat dan
   tidak diperbarui. Filter "Overdue" atau "Due next week" jadi tidak bermakna.
4. **Anggota card tidak menunjukkan penanggung jawab.** 369 card punya anggota, tetapi tiga orang
   masing-masing terpasang di 139 sampai 353 card, ditambah enam akun bersama atau akun peran.
   Filter "Cards assigned to me" tidak membantu siapa pun.
5. **Label tidak konsisten.** 14 label mencampur nama program (RTA, FMS, PIAT, PKM), jenis luaran
   ("Publikasi" dan "Publication Paper" ganda), keterampilan teknis (Python, YOLO, R-Studio), dan
   satu label "PROJECT" yang sama dengan nama list. Hanya 16% card berlabel.
6. **Komentar dipakai sebagai logbook.** Card progres mingguan dan card per mahasiswa menampung
   ribuan komentar berformat rekap (judul, capaian, fokus berikutnya). Ini kebiasaan yang baik,
   tetapi belum terstruktur dan sulit dirangkum.
7. **Board berfungsi sebagai penyimpanan berkas.** 7.596 file di-upload ke Trello (sekitar 12,8 GB)
   dan aksi terbanyak adalah menambah lampiran. Berkas lebih cocok di Drive dengan tautan di card.
8. **Arsip berupa list.** "Arsip lomba/project" dan "Arsip conference" (104 card) adalah list biasa,
   bukan fitur arsip, sehingga tetap ikut tampil, dihitung, dan dicari.

## 3. Rekomendasi struktur

Pecah menjadi beberapa board sesuai fungsi. Kanban smartagri mendukung banyak board, visibilitas
**Team** (semua anggota lab bisa membaca), dan peran owner/member/viewer per board.

| Board | List (alur kiri ke kanan) | Isi |
|---|---|---|
| **Publikasi** | Ide, Draft, Review internal, Submitted dan review, Revisi reviewer, Accepted, Published | satu card per naskah |
| **Hibah, Proyek, dan Lomba** | Perlu disortir, Peluang, Persiapan proposal, Diajukan, Berjalan, Laporan, Selesai | satu card per hibah, proyek industri, atau lomba |
| **SmartAgri Library** (read-mostly) | Referensi, Template dokumen, Learning, Code library, Konferensi | rujukan yang jarang berubah |
| **Riset Mahasiswa** | Mahasiswa, Proposal, Eksperimen, Analisis dan penulisan, Sidang, Revisi, Lulus | satu card per mahasiswa S1, S2, S3 (label jenjang), berisi logbook mingguan dan tahapan riset |
| **SmartAgri Assistant** | To do, Dikerjakan, Review, Selesai | tugas harian asisten riset, mulai kosong |

Card lama yang sudah selesai dipindah ke **Archived items** (fitur arsip), bukan ke list "Arsip".
Card tetap bisa dicari dan dipulihkan, tetapi tidak memenuhi board.

## 4. Rekomendasi aturan kerja

1. **Satu card, satu luaran, satu penanggung jawab.** Pasang 1 sampai 2 anggota yang benar-benar
   mengerjakan. Pembimbing dan admin cukup sebagai anggota board, tidak perlu di setiap card.
2. **Due date wajib di board alur kerja.** Setiap card di Riset, Publikasi, dan Hibah punya tenggat
   tahap berikutnya. Tandai "complete" saat selesai, bukan dihapus tenggatnya.
3. **Rapat mingguan memakai filter.** Bagikan tautan filter yang tersimpan di URL, misalnya:
   - `?due=overdue,week` untuk tenggat yang lewat dan minggu ini;
   - `?activity=4w&mode=all&due=none` untuk card aktif tanpa tenggat;
   - `?members=me` (atau tombol `q`) untuk daftar kerja pribadi.
4. **Rekap mingguan di komentar, dengan format tetap.** Judul "Rekap Mingguan tanggal", lalu tiga
   bagian: Capaian, Kendala, Rencana minggu depan. Format ini sudah dipakai sebagian tim.
5. **Checklist standar per jenis card.** Contoh publikasi: target jurnal, daftar penulis dan
   kontribusi, gambar final, cover letter, nomor submission, respons reviewer.
6. **Taksonomi label tiga keluarga** (warna sesuai palet smartagri):
   - Program: RTA Plant Factory, RTA Plant Motion, RTA KM Presisi, FMS, PIAT, PKM (keluarga teal dan cyan);
   - Jenis luaran: Jurnal, Prosiding, Paten, Laporan (satu label "Publikasi" saja, hapus duplikat);
   - Penanda: Butuh review, Terhambat (amber dan merah).
   Keterampilan teknis (Python, YOLO, R-Studio) tetap sebagai label topik, terutama di SmartAgri Library.
7. **Batas kerja per tahap (WIP).** Misalnya Review internal maksimal 5 card, Submitted maksimal 8,
   supaya naskah tidak menumpuk tanpa reviewer.
8. **Bersih-bersih bulanan.** Filter "No activity in the last four weeks" di board alur kerja; card
   yang terhenti diberi komentar status atau diarsipkan.
9. **Berkas di Drive, tautan di card.** Upload langsung hanya untuk gambar cover dan berkas kecil
   yang sering dibuka; sisanya tautan Google Drive agar penyimpanan tidak membengkak.
10. **Lengkapi profil dan peta anggota.** Isi nama di `/account` dan tambahkan anggota lewat Menu >
    Members, supaya avatar, filter anggota, dan penugasan berfungsi.

## 5. Usulan pengembangan fitur Kanban smartagri

Diurutkan dari dampak terbesar terhadap aturan kerja di atas.

| Prioritas | Fitur | Mendukung |
|---|---|---|
| 1 | **Template card dan checklist** (Riset Mahasiswa, Publikasi, Hibah) dengan list awal yang sudah terisi | aturan 1, 5 |
| 2 | **Template komentar rekap mingguan** dan pengingat mingguan | aturan 4 |
| 3 | **Filter tersimpan per board** ("Overdue", "Card saya", "Terhenti") di menu board | aturan 3, 8 |
| 4 | **Batas WIP per list** dengan peringatan saat terlewati | aturan 7 |
| 5 | **Dashboard board**: jumlah card per tahap, lama rata-rata per tahap, card terhenti | evaluasi bulanan |
| 6 | **Mention @nama dan notifikasi** (in-app, opsional email) | koordinasi pembimbing |
| 7 | **Tampilan Kalender** untuk due date lintas board | aturan 2 |
| 8 | **Otomasi ringan**: card masuk "Published" otomatis complete; pengingat H-3 tenggat | aturan 2 |
| 9 | **Jembatan ke situs**: card di "Published" bisa diekspor menjadi entri Publications di CMS | publikasi tampil di smart-agri.id |
| 10 | **Pindah card antar-board** dari modal (Move to board) untuk migrasi ke struktur baru | bagian 3 |

## 6. Langkah migrasi yang disarankan

1. Jalankan `scripts/restructure-kanban.mjs` (lihat `docs/kanban/import-trello.md`) untuk membuat kelima board.
2. Beri label S1/S2/S3 di Riset Mahasiswa dan sortir list "Perlu disortir" di Hibah, Proyek, dan Lomba.
3. Rapikan label sesuai taksonomi, isi due date untuk semua card di board alur kerja.
4. Jalankan rapat mingguan pertama dengan tautan filter, evaluasi setelah empat minggu.
