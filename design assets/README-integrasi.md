# Smart Greenhouse Workflow — Panduan Integrasi

Paket ini berisi **visualisasi/animasi** alur kerja smart greenhouse bergaya n8n.
Ini murni komponen tampilan front-end (SVG + HTML + JS vanilla), **bukan** file
workflow n8n yang dijalankan di server. Tidak ada dependensi eksternal dan tidak
ada panggilan jaringan, jadi aman disematkan di mana saja.

## Isi paket

- `greenhouse-workflow.html` — widget lengkap, berdiri sendiri. Bisa langsung dibuka
  di browser, atau disematkan. Di dalamnya: dua tampilan (Agent / Linear), 8 skenario
  real-case, kontrol play/pause, navigasi skenario, dan pengatur kecepatan.
- `GreenhouseWorkflow.jsx` — komponen React tipis yang menyematkan file HTML via `<iframe>`.

## Cara pakai (pilih salah satu)

### A. HTML / situs statis
Salin `greenhouse-workflow.html` ke folder publik, lalu sematkan:

```html
<iframe src="/greenhouse-workflow.html" style="width:100%;height:760px;border:0;border-radius:12px"></iframe>
```

Atau tempel langsung isi `<div id="app">…</div>` beserta blok `<style>` dan `<script>`-nya
ke dalam halaman Anda (tanpa iframe).

### B. React / Vite
1. Letakkan `greenhouse-workflow.html` di `public/`.
2. Salin `GreenhouseWorkflow.jsx` ke `src/components/`.
3. Pakai:

```jsx
import GreenhouseWorkflow from "./components/GreenhouseWorkflow";

export default function Page() {
  return <GreenhouseWorkflow height={760} />;
}
```

### C. Next.js
- App Router: taruh HTML di `public/greenhouse-workflow.html`, render komponen di
  dalam Client Component (`"use client"` di atas `GreenhouseWorkflow.jsx`).
- `src` default sudah `/greenhouse-workflow.html`.

## Instruksi untuk Claude Code

> Integrasikan widget `greenhouse-workflow.html` ke web SmartAgri. Letakkan file di
> folder aset statis (mis. `public/`), lalu render lewat komponen `GreenhouseWorkflow`.
> Sesuaikan `height` dan styling kontainer agar serasi dengan layout dashboard. Pastikan
> halaman memuat `<meta charset="utf-8">` agar simbol seperti °C, ▲/▼, ⚠, CO₂ tampil benar.

## Kustomisasi cepat

Semua diatur di dalam `greenhouse-workflow.html`:

- **Skenario & nilai sensor**: array `scen` di blok `<script>`. Tiap item punya
  `title`, `chips` (label pembacaan), `decide` (logika keputusan), `act`/`branches`
  (aktuator), dan `actMsg`.
- **Warna/tema**: variabel warna di blok `<style>` (latar `#1a1b1e`, kartu `#2b2d31`,
  aksen hijau `#6ad48f`, anomali `#ffb24a`).
- **Tata letak/ikon node**: elemen di dalam `<template id="tpl-agent">` dan
  `<template id="tpl-linear">`.

## Catatan

Bila yang dibutuhkan adalah **workflow n8n asli** (file `.json` yang di-import ke
instance n8n dan benar-benar membaca sensor lewat MQTT/HTTP lalu menggerakkan aktuator),
itu artefak terpisah dan perlu dibuat khusus — minta saja bila diperlukan.
