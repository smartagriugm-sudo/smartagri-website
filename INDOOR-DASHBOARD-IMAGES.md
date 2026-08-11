# 🖥️ Daftar Gambar: Halaman Dashboard Indoor Farming

Semua gambar untuk halaman `/indoor-farming/dashboard`. Halaman sudah menunggu
file-file ini: begitu file ditaruh dengan **nama persis** seperti di bawah,
gambar langsung muncul menggantikan placeholder, tanpa perlu ubah kode.

**Lokasi file:** `web/public/brand/indoor-farming/dashboard/`
**Format:** `.webp` · **Kualitas:** 80 (kirim JPG/PNG juga boleh, nanti saya konversi)

> Semua gambar bersifat **opsional untuk rilis**. Selama file belum ada, halaman
> tetap tampil rapi: gambar dekoratif tersembunyi sendiri, dan ilustrasi/foto
> yang bermakna menampilkan placeholder bergradasi warna brand.

---

## Ringkasan

| # | Nama file | Rasio | Prioritas | Dipakai di |
|---|---|---|---|---|
| 1 | `facility-hero.webp` | 16:5 (panorama) | **Tinggi** | Latar strip header di dalam dashboard |
| 2 | `system-3d.webp` | 4:3 | **Tinggi** | Panel "System flow" (tengah, diapit kartu) |
| 3 | `promo-card.webp` | 4:3 | Sedang | Kartu promo di sidebar dashboard |
| 4 | `sensor-node.webp` | 4:3 | Sedang | Seksi "Instruments we built" |
| 5 | `control-cabinet.webp` | 4:3 | Sedang | Seksi "Instruments we built" |

Nomor 1 dan 3 adalah **foto dekoratif** (tertutup gradasi gelap, jadi detail
halus tidak akan terlihat). Nomor 2 adalah **ilustrasi 3D**. Nomor 4 dan 5
adalah **foto dokumenter** alat kita sendiri.

---

## Arahan umum

Sama dengan `INDOOR-FARMING-PHOTOS.md`, ditambah catatan khusus dashboard:

- **Latar tropis Indonesia**, bukan Eropa. Hindari rumah kaca kaca Belanda,
  lanskap bersalju, atau vegetasi subtropis.
- **Orang Indonesia** bila ada figur manusia: peneliti/mahasiswa, pakaian kerja
  wajar, sebagian mengenakan hijab. Nuansa dokumenter, bukan stok foto.
- **Palet menyatu dengan brand**: teal `#0B6477` / `#14919B`, mint `#45DFB1`,
  hijau daun, putih/abu struktur.
- **Tanpa teks, angka, logo, atau watermark di dalam gambar.** Ini penting:
  dashboard sudah penuh teks asli, gambar yang mengandung teks palsu akan
  terbaca sebagai UI rusak.
- **Tanpa layar/monitor yang menampilkan grafik** pada gambar 1, 3, 4, 5.
  Dashboard-nya sudah kita render sendiri dengan HTML. Foto berisi dashboard
  palsu akan bentrok.

---

## 1. `facility-hero.webp` (16:5, panorama)

**Dipakai:** latar strip header di dalam dashboard. Di atasnya ada judul besar
("4 of 4 zones are inside their target envelope") di kiri atas, lalu dua kartu
kaca di bawah: ringkasan fasilitas (kiri) dan weather station (kanan).

**Aturan komposisi, ini yang paling menentukan berhasil atau tidaknya:**

- Gambar tertutup gradasi gelap `#08313A` dari kiri (95%) ke kanan (25%), plus
  gradasi gelap dari bawah. Jadi yang benar-benar terlihat adalah **bagian
  kanan atas**.
- Taruh objek menarik di **sepertiga kanan**. Sisi kiri dan bawah akan tertutup
  teks dan kartu.
- Pilih foto yang **terang dan lapang**. Foto gelap akan jadi lumpur begitu
  kena gradasi.
- Hindari objek penting tepat di tengah bawah.

**Prompt (EN, untuk Nano Banana / GPT Image):**

```
Wide panoramic interior photograph of a modern tropical research greenhouse in
Indonesia, 16:5 aspect ratio, bright and airy. Long rows of vivid green
hydroponic lettuce and tomato plants in white gutter channels sweep from the
centre toward the upper right of the frame. White powder-coated steel truss
structure overhead with diffuse polycarbonate roof panels, bright equatorial
daylight streaming through and creating soft light rays. The left third of the
image is simpler and less busy, mostly open walkway and soft light. Clean, well
maintained, high-key lighting, fresh and optimistic mood. Documentary
photography style, no people, no text, no signage, no logos, no computer
screens. Colour palette of fresh green foliage, white structure, and pale
daylight. Photorealistic, high detail, sharp.
```

> Kalau hasilnya terlalu gelap atau padat, minta ulang dengan tambahan:
> *"brighter, more open space on the left, high-key lighting"*.

---

## 2. `system-3d.webp` (4:3) · ilustrasi, bukan foto

**Dipakai:** panel "System flow". Ilustrasi ini duduk di **tengah**, diapit
empat kartu kecil: Weather station dan Nutrient tank di kiri, Climate control
dan To canopy di kanan. Persis seperti referensi "Energy Flow" yang Anda kirim.

**Penting:**

- **Latar putih polos atau transparan.** Kalau bisa PNG transparan, kirim PNG,
  nanti saya konversi ke WebP dengan alpha.
- **Tanpa label, teks, angka, atau panah** di dalam gambar. Semua label sudah
  dirender sebagai kartu HTML di kiri dan kanan. Kalau gambarnya sudah berisi
  label, hasilnya akan bentrok dan terlihat seperti UI rusak.
- Objek harus **berdiri sendiri di tengah** dengan ruang kosong di sekelilingnya.

**Prompt versi greenhouse (EN):**

```
Isometric 3D render of a modern tropical greenhouse, cutaway style, centred on
a pure white background with generous empty space around it. A white
steel-framed greenhouse with a translucent curved polycarbonate roof, one side
cut away so the interior is visible. Inside: two neat rows of hydroponic
growing gutters holding small vivid green lettuce plants, and slim white
irrigation pipes running along them. Attached to one side: a cylindrical
nutrient mixing tank and a compact dosing cabinet, connected by smooth rounded
pipes. On the roof, a small weather station mast with an anemometer and a flat
solar radiation sensor. Soft studio lighting, gentle ambient occlusion shadows,
matte surfaces, subtle glass transparency. Colour palette strictly deep teal
(#0B6477), mid teal (#14919B), mint green (#45DFB1), fresh leaf green, and
white. Clean minimal product-illustration style, like a premium SaaS landing
page diagram. No text, no numbers, no labels, no arrows, no logos, no people.
Isometric three-quarter view, high detail, white background.
```

**Prompt versi plant factory (EN), kalau lebih ingin menonjolkan rak vertikal:**

```
Isometric 3D render of a modern vertical farming plant factory module, cutaway
style, centred on a pure white background with generous empty space around it.
A clean white insulated box building with one wall cut away, revealing four
stacked levels of hydroponic growing shelves inside. Each shelf holds rows of
small vivid green lettuce plants and is lit from above by slim LED bars casting
a soft mint-green glow. To one side, connected by smooth rounded pipes: a
cylindrical nutrient mixing tank and a compact climate control unit with a
visible fan grille. Soft studio lighting, gentle ambient occlusion shadows,
matte surfaces. Colour palette strictly deep teal (#0B6477), mid teal
(#14919B), mint green (#45DFB1), fresh leaf green, and white. Clean minimal
product-illustration style, like a premium SaaS landing page diagram. No text,
no numbers, no labels, no arrows, no logos, no people. Isometric three-quarter
view, high detail, white background.
```

> Pilih salah satu, atau generate keduanya lalu pilih yang paling enak dilihat.
> Kalau hasilnya terlalu ramai, tambahkan: *"simpler, fewer components, more
> negative space, minimal"*.

---

## 3. `promo-card.webp` (4:3)

**Dipakai:** kartu promo kecil di sidebar dashboard, di atas teks "Built and
tested at UGM". Ditampilkan sangat kecil (sekitar 180 × 96 px) dan terpotong
jadi bentuk melebar, jadi **komposisi harus sederhana dan terbaca dari jauh**.

**Prompt (EN):**

```
Close-up photograph of a vertical farming rack in a plant factory, shot at 4:3.
Three or four stacked growing shelves of young butterhead lettuce seedlings in
white channels, each shelf lit from above by LED grow lights casting a soft
mint-green and cool white glow onto the leaves. Shot straight on from a short
distance so the stacked shelves form clean horizontal bands across the frame.
Dark, clean, controlled indoor environment. Crisp, modern, high-tech but not
sterile. No people, no text, no logos, no visible screens or control panels.
Photorealistic, shallow depth of field, high detail.
```

---

## 4. `sensor-node.webp` (4:3)

**Dipakai:** seksi "Instruments we built, and maintain ourselves".

**Prompt (EN):**

```
Documentary close-up photograph of a compact environmental sensor node mounted
at plant canopy height inside a tropical greenhouse, 4:3. A small white
weatherproof enclosure on a slim stainless steel stand, with a white radiation
shield (stacked plate style) for the air temperature and humidity probe, and a
small flat quantum PAR sensor on a short arm above it. A thin cable runs down
the stand. Behind it, slightly out of focus, rows of green leafy hydroponic
crops and white greenhouse structure in bright soft daylight. The sensor is
sharp and in focus, filling the left half of the frame. Practical research
equipment, real and slightly used rather than showroom perfect. No text, no
brand logos, no display screens showing numbers. Natural light, photorealistic,
shallow depth of field.
```

---

## 5. `control-cabinet.webp` (4:3)

**Dipakai:** seksi "Instruments we built, and maintain ourselves", di bawah
gambar 4.

**Prompt (EN):**

```
Documentary photograph of an open electrical control cabinet for a greenhouse
automation system, 4:3. Inside the grey metal enclosure: a DIN rail with a
small industrial controller, neat rows of terminal blocks, relays, and a few
circuit breakers, with tidy colour-coded wiring bundled and routed cleanly.
Two small dosing pump heads and clear tubing visible at the lower edge. Mounted
on a wall inside a tropical greenhouse service area, with soft daylight from
the side and a hint of green plants blurred in the background. Real working
research equipment, well organised, slightly used. No text, no labels, no brand
logos, no screens displaying data. Photorealistic, natural lighting, sharp
detail on the wiring.
```

---

## Setelah gambar jadi

1. Beri nama file **persis** seperti tabel di atas.
2. Taruh di `web/public/brand/indoor-farming/dashboard/`.
3. Buka `/indoor-farming/dashboard`, gambar langsung muncul.

Kalau ada gambar yang hasilnya kurang pas, halaman tetap aman: cukup jangan
taruh file-nya, dan placeholder brand yang akan tampil.
