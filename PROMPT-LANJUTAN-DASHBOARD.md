# Prompt untuk melanjutkan di sesi Claude Code baru

Salin salah satu blok di bawah ke sesi baru. Blok pertama untuk memulai, blok
kedua dan seterusnya untuk tugas tertentu.

---

## A. Prompt pembuka (selalu pakai ini dulu)

```
Saya melanjutkan pengembangan dashboard Indoor Farming di repo ini.

Sebelum mengerjakan apa pun, baca dua berkas ini:
1. CLAUDE.md, berisi aturan brand dan implementasi yang wajib diikuti
2. INDOOR-FARMING-DASHBOARD.md, berisi apa yang sudah dibangun, alasan tiap
   keputusan rancangan, dan daftar hal yang masih menggantung

Aplikasinya ada di folder web/. Dashboard ada di /indoor-farming/dashboard
dengan tujuh layar, kodenya terpusat di web/src/lib/indoor-dashboard.ts,
web/src/lib/dashboard-state.tsx, dan web/src/components/dashboard/.

Beberapa hal yang sering saya lupa dan tolong Anda jaga:
- Setelah menambah berkas rute, jalankan npm run generate-routes
- Jam simulasi harus mulai dari nilai tetap, jangan baca Date.now() saat
  render, nanti hydration mismatch
- PPFD, DLI, dan irrigation flow digerakkan jadwal, jangan diwarnai sebagai
  kegagalan terhadap pita target
- Warna parameter ditugaskan per panel, tidak boleh ada dua parameter sewarna
  dalam satu panel
- Jangan pakai em dash di teks mana pun

Verifikasi sebelum bilang selesai: npx tsc --noEmit, npm run build, lalu buka
halamannya di browser dan pastikan tidak ada error konsol dan tidak meluber di
lebar 390px.

Kerjakan di branch baru, jangan langsung ke main. Tanya dulu sebelum merge ke
main karena itu langsung tayang ke publik.

Tugas saya: [TULIS TUGAS ANDA DI SINI]
```

---

## B. Menambal gambar yang masih hotlink

```
Ada delapan gambar artikel yang masih hotlink ke lh7-rt.googleusercontent.com
dan ke situs WordPress lama. Skrip penambalnya sudah ada tapi belum pernah
dijalankan karena lingkungan cloud memblokir kedua host itu.

Jalankan dari folder web/:
  npm run fetch-note-images -- --dry-run
  npm run fetch-note-images

Lalu pastikan kelima artikel yang terdampak masih tampil benar di
/field-notes, dan commit hasilnya beserta gambar yang terunduh.

Kalau ada URL yang gagal diambil karena sudah kedaluwarsa, laporkan artikel
mana saja, jangan diam-diam dibiarkan rusak.
```

---

## C. Mengganti koordinat situs dengan yang asli

```
Koordinat tiga situs di SITES pada web/src/lib/indoor-dashboard.ts masih
perkiraan, bukan hasil survei. Ganti dengan data asli berikut:

[TULIS: nama situs, kota, lat, lng, untuk tiap fasilitas]

Sekalian periksa pembagian ruang ke situs lewat siteId di ROOM_LAYOUTS, dan
betulkan kalau salah. Setelah itu hapus catatan "koordinat masih perkiraan"
dari FacilityMap.tsx dan dari INDOOR-FARMING-DASHBOARD.md.
```

---

## D. Menyambungkan ke sensor sungguhan

```
Dashboard saat ini memakai data sintetis yang dihasilkan fungsi murni di
web/src/lib/indoor-dashboard.ts. Saya ingin mulai menyambungkannya ke data
sensor asli.

Sumber datanya: [TULIS: API, database, MQTT, atau format lain]

Tolong rancang dulu lapisan pemisahnya sebelum menulis kode, dan tunjukkan
rencananya ke saya. Yang penting bagi saya:
- Simulasi tetap bisa dipakai sebagai fallback dan untuk demo publik
- Bentuk data yang dikonsumsi komponen tidak berubah, supaya layar tidak perlu
  ditulis ulang
- Hydration tetap aman

Jangan langsung menghapus simulasinya.
```

---

## E. Menambah dashboard untuk bidang riset lain

```
Saya ingin menambah dashboard untuk [smart-uav / nama bidang] di
/[bidang]/dashboard, mengikuti pola yang sudah ada di Indoor Farming.

Baca dulu bagaimana Indoor Farming disusun: layout route dengan gerbang login
dan context, satu berkas rute per layar, navigasi digerakkan dari satu daftar
di lib. Pertimbangkan bagian mana yang layak diangkat jadi komponen bersama
dan bagian mana yang sebaiknya tetap terpisah, lalu tunjukkan rencananya
sebelum mulai.
```

---

## F. Kalau tampilan di produksi tidak berubah padahal sudah deploy

```
Saya sudah merge ke main tapi tampilan di smart-agri.id belum berubah.

Tolong cek:
1. Apakah perubahannya benar-benar ada di main (baca isi berkasnya dari
   origin/main, jangan percaya log commit saja)
2. Apakah Vercel punya deployment produksi untuk commit terakhir di main

Perlu diketahui: repo ini punya dua proyek Vercel, smartagri-website dan
smartagriugm-sudo-smartagri-website. Keduanya ikut build tiap push, dan
deployment Preview dari branch sering tertukar dengan Production dari main.
Pastikan yang diperiksa adalah Production.

Kalau build produksinya memang tidak terpicu, cara paling andal adalah
Redeploy manual dari dashboard Vercel dengan "Use existing Build Cache"
dimatikan.
```
