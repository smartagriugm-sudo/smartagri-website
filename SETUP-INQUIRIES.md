# 📥 Setup Inbox Pertanyaan (Google Sheet, sekali jalan ±10 menit)

Form "Let's keep in touch" di `/contact-us` sudah siap mengirim ke sebuah
"inbox" — spreadsheet Google yang bisa di-review, disortir, dan dikurasi
seluruh tim. Selama belum di-setup, form memakai fallback email (`mailto:`).

Kenapa Google Sheet (bukan halaman admin sendiri)? Karena situs ini statis
tanpa backend: membangun inbox di dalam situs berarti membangun server +
database + sistem login yang harus dirawat. Google Sheet memberi 95%
fungsinya (lihat semua pertanyaan masuk, sortir, filter, beri status, assign
ke anggota, komentar) dengan 0% perawatan — dan timnya sudah familiar.

---

## Langkah 1 — Buat spreadsheet

1. Buka [sheets.new](https://sheets.new) (login akun Google lembaga).
2. Beri nama, mis. `smartagri — Inquiries`.
3. Ganti nama tab sheet pertama (kiri bawah) menjadi persis: `Inquiries`.
4. Isi baris pertama (header) kolom A–J persis:
   `Timestamp | ID | Name | Email | Organization | Research Area | Details | Technologies | Question | Status`
5. (Disarankan) Blok kolom J → menu Data → **Data validation** → kriteria
   Dropdown: `New, In Review, Replied, Closed` — inilah alat kurasinya.

## Langkah 2 — Pasang Apps Script

1. Di spreadsheet: menu **Extensions → Apps Script**.
2. Hapus isi editor, tempel kode ini, lalu Save:

```javascript
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Inquiries');
  sheet.appendRow([
    new Date(),
    data.id,
    data.name,
    data.email,
    data.organization,
    data.area,
    data.details,
    data.technologies,
    data.question,
    'New',
  ]);
  // Opsional: notifikasi email setiap ada pertanyaan masuk —
  // hapus tanda komentar (//) di baris di bawah untuk mengaktifkan.
  // MailApp.sendEmail('hello@smartagri.id',
  //   '[' + data.id + '] New inquiry from ' + data.name,
  //   data.question + '\n\nFrom: ' + data.name + ' <' + data.email + '>');
  return ContentService.createTextOutput(
    JSON.stringify({ ok: true }),
  ).setMimeType(ContentService.MimeType.JSON);
}
```

## Langkah 3 — Deploy sebagai Web App

1. Klik **Deploy → New deployment** → ikon gerigi → pilih **Web app**.
2. Isi: Execute as **Me** · Who has access **Anyone**.
3. Klik **Deploy** → izinkan akses saat diminta → salin **Web app URL**
   (format `https://script.google.com/macros/s/.../exec`).

## Langkah 4 — Sambungkan ke situs

Kirim URL tersebut ke saya, atau isi sendiri di
`web/src/routes/contact-us.tsx` baris `const INQUIRY_ENDPOINT = ""` →
tempel URL di antara tanda kutip → commit/push.

---

## Alur setelah aktif

- Pengunjung isi form → review → **Send inquiry** → masuk sebagai baris baru
  di Sheet dengan **ID unik** (mis. `SA-20260613-X4T2`) + status `New`.
- Pengunjung memegang ID yang sama (di layar + PDF yang bisa diunduh), jadi
  follow-up via email tinggal menyebut ID-nya.
- Tim membuka Sheet: sortir per tanggal/area, filter status, ubah status
  (`New → In Review → Replied → Closed`), tambah kolom catatan/PIC bebas.
- Jika notifikasi email diaktifkan (Langkah 2), setiap pertanyaan baru juga
  mampir ke inbox `hello@smartagri.id`.

## Catatan teknis

- Endpoint Apps Script gratis dan sanggup ~20.000 request/hari — jauh di atas
  kebutuhan.
- Form mengirim dengan `mode: no-cors` (fire-and-forget) karena Apps Script
  tidak mengirim header CORS — pengiriman tetap sampai, hanya saja situs tidak
  bisa membaca balasannya; karena itu status "terkirim" di layar bersifat
  optimistis.
- Data pengunjung tersimpan di Google Drive akun lembaga — perbarui kalimat
  persetujuan di form bila kebijakan privasi lembaga mengharuskan.
