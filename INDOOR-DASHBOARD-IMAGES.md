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

### Negative prompt umum (untuk semua FOTO, nomor 1, 3, 4, 5)

Kata "greenhouse" secara bawaan menarik model ke rumah kaca Victorian Eropa:
dinding batu, rangka besi tua, dan koleksi pakis atau tanaman hias. Itu bukan
yang kita bangun. Tempelkan daftar ini di kolom negative, atau sambung di akhir
prompt utama:

```
stone wall, brick wall, concrete block, masonry, rustic, weathered, Victorian
glasshouse, conservatory, botanical garden, orangery, ferns, palms, monstera,
ornamental foliage, houseplants, potted plants, flower pots, soil beds, moss,
temperate climate, autumn colours, text, letters, numbers, labels, watermark,
logo, brand marks
```

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

## 2. `system-3d.webp` · ilustrasi, bukan foto

**Dipakai:** panel "System flow". Ilustrasi ini duduk di **tengah**, diapit
empat kartu kecil: Weather station dan Nutrient tank di kiri, Climate control
dan To canopy di kanan. Persis seperti referensi "Energy Flow".

### Kenapa hasil pertama pecah

Prompt versi lama memakai kata **"cutaway"** dan "one side cut away". Untuk
bangunan berdinding kaca, instruksi itu menyesatkan: model menafsirkannya
sebagai bangunan yang dipotong dan pecah, sehingga atapnya terlepas dan
dindingnya retak. Padahal kaca sudah transparan, isinya terlihat tanpa perlu
dipotong sama sekali.

Semua kata "cutaway" sudah dihapus dari prompt di bawah, dan diganti penegasan
bahwa bangunannya **utuh**, plus daftar larangan yang eksplisit.

### Syarat wajib

- **Latar putih polos atau transparan.** Kalau bisa PNG transparan, kirim PNG.
- **Tanpa teks, label, angka, atau panah** di dalam gambar. Semua label sudah
  dirender sebagai kartu HTML di kiri dan kanan ilustrasi.
- **Bangunan harus utuh.** Tanpa retak, tanpa panel hilang, tanpa atap terbuka.
- Rasio bebas. Slot-nya sekarang memakai mode "contain", jadi gambar tidak akan
  terpotong berapa pun rasionya. Idealnya tetap mendekati 4:3 atau 1:1 supaya
  ruang kosongnya tidak terlalu banyak.

### Prompt versi greenhouse (EN)

```
Isometric 3D render of a modern tropical greenhouse, centred on a pure white
background with generous empty space around it. The greenhouse is COMPLETE,
INTACT and FULLY ENCLOSED: every wall and every roof panel is in place, made of
clear transparent glass held in a slim white steel frame, so the interior is
visible THROUGH the glass, not through any opening. A symmetrical gable roof,
unbroken from ridge to eaves. Inside, seen through the glass: two neat rows of
white hydroponic growing gutters holding small vivid green lettuce plants, with
slim white irrigation pipes running alongside them. The greenhouse sits on a
low deep-teal base platform. Beside it on the same platform: a cylindrical mint
green nutrient mixing tank and a compact teal control cabinet, joined to the
greenhouse by smooth rounded pipes that loop back into it. A slim white weather
station mast stands at one corner with a small anemometer and a little solar
panel. Soft studio lighting, one gentle ambient occlusion shadow beneath the
platform, matte surfaces, clean untinted glass. Colour palette strictly deep
teal (#0B6477), mid teal (#14919B), mint green (#45DFB1), fresh leaf green and
white. Clean minimal product-illustration style, like a premium SaaS landing
page diagram. Isometric three-quarter view, high detail, white background.
```

**Negative prompt** (tempelkan di kolom negative kalau tool-nya punya; kalau
tidak ada, sambung saja di akhir prompt utama):

```
cutaway, cross-section, exploded view, broken glass, cracked, shattered,
missing panels, detached roof, open roof, gaps in the structure, damaged,
ruined, under construction, scaffolding, text, letters, numbers, labels,
arrows, callouts, watermark, logo, people, coloured background
```

### Prompt versi plant factory (EN)

Kalau lebih ingin menonjolkan rak vertikal. Perhatikan: dindingnya tetap kaca,
bukan dipotong, supaya tidak terulang masalah yang sama.

```
Isometric 3D render of a modern vertical farming plant factory module, centred
on a pure white background with generous empty space around it. The building is
COMPLETE, INTACT and FULLY ENCLOSED: a clean rectangular module with a slim
white steel frame and clear transparent glass walls on every side, so the
interior is visible THROUGH the glass, not through any opening. Every panel is
in place and the flat roof is unbroken. Inside, seen through the glass: four
stacked levels of hydroponic growing shelves, each holding rows of small vivid
green lettuce plants and lit from above by slim LED bars casting a soft mint
green glow. The module sits on a low deep-teal base platform. Beside it on the
same platform: a cylindrical mint green nutrient mixing tank and a compact teal
climate control unit with a visible fan grille, joined to the module by smooth
rounded pipes. Soft studio lighting, one gentle ambient occlusion shadow
beneath the platform, matte surfaces, clean untinted glass. Colour palette
strictly deep teal (#0B6477), mid teal (#14919B), mint green (#45DFB1), fresh
leaf green and white. Clean minimal product-illustration style, like a premium
SaaS landing page diagram. Isometric three-quarter view, high detail, white
background.
```

Pakai negative prompt yang sama seperti di atas.

### Kalau masih pecah juga

Tambahkan di akhir prompt utama, tekankan berulang:

```
The building must be structurally perfect and completely sealed. Do not remove,
cut, crack, or detach any part of it. Show the interior only through the
transparent glass.
```

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
crops, specifically butterhead lettuce and pak choi in white hydroponic NFT
gutters, with a clean white powder-coated steel greenhouse structure in bright
soft daylight. Modern tropical commercial greenhouse, not an old stone
glasshouse. The sensor is
sharp and in focus, filling the left half of the frame. Practical research
equipment, real and slightly used rather than showroom perfect. No text, no
brand logos, no display screens showing numbers. Natural light, photorealistic,
shallow depth of field.
```

---

## 5. `control-cabinet.webp` (4:3)

**Dipakai:** seksi "Instruments we built, and maintain ourselves", di bawah
gambar 4.

### Apa yang salah di hasil pertama

Tiga hal, dan yang pertama murni kesalahan prompt saya:

1. **Ada peristaltic pump.** Prompt lama meminta *"two small dosing pump heads
   and clear tubing"*. Itu keliru: pompa dosing adalah bagian dari unit
   nutrisi, bukan isi panel listrik. Sudah dihapus, dan dimasukkan ke daftar
   larangan.
2. **Dindingnya batu.** Prompt lama tidak menyebut dinding sama sekali, jadi
   model memakai asosiasi bawaannya: rumah kaca tua Eropa berdinding batu.
   Sekarang dinding dan tiangnya disebut eksplisit.
3. **Tanamannya pakis dan tanaman hias**, bukan hortikultura. Latar belakangnya
   sekarang disebut spesifik: selada dan pakcoy di talang hidroponik putih.

### Prompt (EN)

```
Documentary photograph of an open electrical control cabinet for a greenhouse
automation system, 4:3, inside a MODERN TROPICAL commercial greenhouse in
Indonesia. The grey steel cabinet is mounted on a clean white powder-coated
steel structural post, next to a smooth white composite panel wall. Inside the
cabinet: a DIN rail carrying a small industrial PLC controller, neat rows of
terminal blocks, several relays, and a row of miniature circuit breakers, with
tidy colour-coded wiring bundled and routed cleanly through white trunking.
Nothing hangs outside the cabinet. In the background, softly out of focus:
long rows of fresh green leafy vegetables, butterhead lettuce and pak choi,
growing in white hydroponic NFT gutters under a bright diffuse polycarbonate
roof. Bright equatorial daylight, clean and well maintained, real working
research equipment rather than a showroom. Photorealistic, natural lighting,
sharp detail on the wiring, shallow depth of field.
```

### Negative prompt (khusus gambar ini)

Pakai negative prompt umum di atas, **ditambah**:

```
peristaltic pump, dosing pump, pump head, hoses, coiled tubing, flexible pipe,
water tubing, plumbing, stone wall, concrete block wall, ferns, ornamental
plants
```

> Kalau tanaman latarnya masih salah, naikkan bobotnya dengan menyebut lebih
> awal di prompt: mulai kalimat pertama dengan *"Inside a modern tropical
> hydroponic vegetable greenhouse growing lettuce and pak choi, ..."* baru
> lanjut ke kabinetnya.

---

## Setelah gambar jadi

1. Beri nama file **persis** seperti tabel di atas.
2. Taruh di `web/public/brand/indoor-farming/dashboard/`.
3. Buka `/indoor-farming/dashboard`, gambar langsung muncul.

Kalau ada gambar yang hasilnya kurang pas, halaman tetap aman: cukup jangan
taruh file-nya, dan placeholder brand yang akan tampil.
