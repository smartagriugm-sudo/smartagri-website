# 📹 Setup Live CCTV plant factory (Bardi IDR-IPC-PTZ)

Panduan memasang kamera Bardi IDR-IPC-PTZ di plant factory sampai tampil
langsung (live) di dashboard ERP agrosphere (`/erp`), lengkap dengan tombol
putar kamera (PTZ). Ikuti urutannya dari atas. Perkiraan waktu: 1 sampai 2 jam
untuk pemasangan pertama.

## Gambaran

```
Kamera Bardi ──WiFi 2,4 GHz──▶ PC penjembatan (di plant factory, menyala 24 jam)
                                 ├─ go2rtc         127.0.0.1:1984  ambil video RTSP dari kamera
                                 ├─ cctv-gateway   127.0.0.1:1985  cek tiket, teruskan video, PTZ
                                 └─ cloudflared    koneksi keluar ke Cloudflare (tanpa buka port)
                                          │
                                          ▼
              https://cctv.smartagri.id  (Cloudflare Tunnel)
                                          ▲
Browser pengguna ERP ──────────────────────┘  video + tombol PTZ, memakai tiket
        │
        └─▶ situs (Vercel) POST /api/cctv/ticket  cek login Supabase, beri tiket 5 menit
```

Kenapa perlu PC penjembatan:
- **Browser tidak bisa memutar RTSP**, format video bawaan CCTV. go2rtc
  mengubahnya menjadi video yang bisa diputar browser.
- **Kamera ada di jaringan lokal.** Situs di Vercel tidak bisa menjangkaunya.
  cloudflared meneruskan video lewat HTTPS tanpa membuka port router.
- **Password kamera tetap di PC itu.** Browser hanya menerima tiket sementara
  dari situs setelah login ERP diperiksa. API go2rtc (yang memuat password)
  tidak pernah terbuka ke internet.

## Yang perlu disiapkan

| Kebutuhan | Keterangan |
|---|---|
| Kamera Bardi IDR-IPC-PTZ | Sudah diuji: RTSP port 8554, ONVIF port 8000 dengan PTZ |
| Router WiFi khusus plant factory | WiFi biasa (nama + password, WPA2-Personal) dengan **2,4 GHz**. Kamera **tidak bisa** masuk eduroam |
| PC penjembatan | Windows 10/11, menyala 24 jam, satu jaringan dengan kamera (kabel LAN ke router lebih stabil). Mini PC sudah cukup |
| Aplikasi **Tuya Smart** di HP | Bukan Smart Life, bukan aplikasi Bardi |
| Akses Cloudflare | Akun yang mengelola DNS domain (sama dengan server AI, lihat `SETUP-AI-SERVER.md`) |
| Akses Vercel | Untuk mengisi 2 environment variable |

File templat ada di folder [`docs/setup/cctv/`](cctv/):
`go2rtc.yaml`, `secret.example.yaml`, `cctv-gateway.mjs`, `start-go2rtc.cmd`,
`start-gateway.cmd`.

---

## Langkah 1: pasang kamera di aplikasi Tuya Smart

1. Pasang aplikasi **Tuya Smart** di HP, lalu buat akun dengan email lab.
2. Sambungkan HP ke **WiFi plant factory** (2,4 GHz).
3. Nyalakan kamera. Kalau lampunya tidak berkedip, tekan tombol **reset**
   sekitar 5 detik sampai berbunyi.
4. Di aplikasi: **+ (Add Device) → Camera** → ikuti petunjuk sampai kamera tampil.
5. Buka kamera → ikon **pensil / ⋯** → **ONVIF**:
   - Aktifkan sakelar ONVIF.
   - Buat password ONVIF **8 sampai 12 karakter, huruf dan angka saja**.
     Simbol seperti `@` membuat kamera menolak login.
   - Catat **IP** yang tertera di halaman ONVIF (contoh `192.168.1.105`).
     IP di "Device Information" (contoh `140.213.x.x`) adalah alamat internet
     jaringan, **bukan** yang dipakai.
6. Biarkan pilihan IP di **Dynamic**. Supaya IP kamera tidak berubah, kunci
   lewat router (langkah 2).

> Kalau mengganti password muncul "The current password is incorrect", matikan
> lalu aktifkan lagi sakelar ONVIF. Kalau masih diminta password lama, hapus
> kamera dari aplikasi (Remove Device), reset kamera, lalu pasang ulang.

## Langkah 2: kunci IP kamera di router (DHCP reservation)

1. Buka halaman admin router (biasanya `http://192.168.1.1` atau
   `http://192.168.0.1`, lihat stiker di router).
2. Cari menu **DHCP → Address Reservation** (nama bisa berbeda: "Static Lease",
   "IP & MAC Binding").
3. Pilih kamera dari daftar perangkat (namanya sering diawali "Tuya" atau
   "Bardi"), lalu simpan dengan IP-nya sekarang.
4. Lakukan hal yang sama untuk **PC penjembatan** (opsional, tapi memudahkan).

## Langkah 3: siapkan PC penjembatan

### 3a. Pasang Node.js dan atur daya
1. Download **Node.js LTS** dari <https://nodejs.org> lalu pasang (pilihan default).
2. Settings → System → **Power** → Screen and sleep: **Sleep = Never** (saat
   tercolok listrik). PC yang tidur membuat kamera offline.

### 3b. Buat folder dan isi filenya
1. Buat folder **`C:\cctv-bridge`**.
2. Download **go2rtc** dari
   <https://github.com/AlexxIT/go2rtc/releases/latest>: file
   **`go2rtc_win64.zip`**. Ekstrak `go2rtc.exe` ke `C:\cctv-bridge`.
   (Versi yang sudah diuji: 1.9.15.)
3. Salin dari repo folder `docs/setup/cctv/` ke `C:\cctv-bridge`:
   `go2rtc.yaml`, `cctv-gateway.mjs`, `start-go2rtc.cmd`, `start-gateway.cmd`,
   `start-hidden.vbs`.
4. Salin `secret.example.yaml` menjadi **`secret.yaml`**, buka dengan Notepad,
   ganti `PASSWORD_ONVIF` dan `IP_KAMERA` di **kedua baris**, lalu simpan.
5. Buat **kunci bersama** (CCTV_SECRET). Buka PowerShell di `C:\cctv-bridge`:
   ```powershell
   node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))" > cctv-secret.txt
   Get-Content cctv-secret.txt
   ```
   Hasilnya 64 karakter acak. Simpan juga di tempat aman (password manager):
   nilai yang sama nanti diisi di Vercel.

Isi folder sekarang:
```
C:\cctv-bridge\
  go2rtc.exe   go2rtc.yaml   secret.yaml   cctv-secret.txt
  cctv-gateway.mjs   start-go2rtc.cmd   start-gateway.cmd   start-hidden.vbs
```

### 3c. Uji di PC itu
1. Klik dua kali **`start-go2rtc.cmd`**. Jendela hitam terbuka dan tetap
   kosong; catatannya ditulis ke `go2rtc.log`.
2. Buka browser di PC itu:
   <http://localhost:1984/stream.html?src=plant_factory_sd&mode=mse>.
   Video kamera harus tampil.
3. Klik dua kali **`start-gateway.cmd`**. Di `gateway.log` muncul
   `cctv gateway on http://127.0.0.1:1985 ...`.
4. Buka <http://localhost:1985/health>, harus tampil `{"ok":true}`.

Kalau langkah 2 gagal, lihat bagian **Kalau ada masalah** di bawah.

### 3d. Jalan otomatis saat PC menyala
Tutup kedua jendela hitam tadi. Kedua skrip menyalakan programnya lagi bila
berhenti, dan menulis catatan ke `go2rtc.log` dan `gateway.log`. Pilih salah
satu cara:

**Cara A, tanpa hak Administrator (jalan setiap Anda login):**
1. Tekan **Win+R**, ketik `shell:startup`, Enter. Folder Startup terbuka.
2. Klik kanan `C:\cctv-bridge\start-hidden.vbs` → **Show more options →
   Create shortcut**, lalu pindahkan pintasannya ke folder Startup.
3. Klik dua kali `start-hidden.vbs` sekali untuk menjalankannya sekarang
   (tidak ada jendela yang muncul).

Kekurangannya: layanan baru jalan setelah ada yang login ke Windows. Aktifkan
login otomatis Windows, atau pakai Cara B.

**Cara B, dengan hak Administrator (jalan begitu PC menyala, tanpa login).**
Buka **PowerShell sebagai Administrator**:

```powershell
schtasks /Create /TN "smartagri go2rtc"  /TR "C:\cctv-bridge\start-go2rtc.cmd"  /SC ONSTART /RU SYSTEM /RL HIGHEST /F
schtasks /Create /TN "smartagri cctv gateway" /TR "C:\cctv-bridge\start-gateway.cmd" /SC ONSTART /RU SYSTEM /RL HIGHEST /F
schtasks /Run /TN "smartagri go2rtc"
schtasks /Run /TN "smartagri cctv gateway"
```

Cek: <http://localhost:1985/health> tetap `{"ok":true}` setelah PC di-restart.

## Langkah 4: Cloudflare Tunnel (alamat HTTPS tetap)

Caranya sama dengan server AI (`SETUP-AI-SERVER.md`), dengan nama dan alamat
berbeda. Contoh di bawah memakai `cctv.smartagri.id`; pakai domain yang DNS-nya
ada di Cloudflare.

1. Cloudflare → **Zero Trust → Networks → Tunnels → Create a tunnel →
   Cloudflared** → nama `smartagri-cctv` → Save.
2. Pilih **Windows**, salin perintah yang muncul, lalu jalankan di PowerShell
   Administrator di PC penjembatan:
   ```powershell
   cloudflared.exe service install <TOKEN>
   ```
   (Kalau `cloudflared` belum ada: `winget install --id Cloudflare.cloudflared`.)
3. Lanjut ke **Public Hostname**:
   - Subdomain `cctv`, Domain `smartagri.id`
   - Service: **HTTP**, URL **`localhost:1985`** (gerbang, **bukan** 1984)
   - Save.
4. Cek dari HP (pakai data seluler): `https://cctv.smartagri.id/health` harus
   menampilkan `{"ok":true}`.

> Jangan pernah mengarahkan tunnel ke port 1984. Port itu API go2rtc yang
> memuat password kamera.

## Langkah 5: isi pengaturan di Vercel

Vercel → project situs → **Settings → Environment Variables**, tambahkan untuk
**Production** (dan Preview kalau ingin diuji di preview):

| Nama | Nilai |
|---|---|
| `CCTV_BASE_URL` | `https://cctv.smartagri.id` (tanpa garis miring di akhir) |
| `CCTV_SECRET` | isi `cctv-secret.txt` (64 karakter), tandai **Sensitive** |

Lalu **Redeploy** deployment terbaru. Buka `/erp`, login, dan panel
**Plant factory camera** akan menampilkan video dengan label **Live**.

Pratinjau Vercel (`*.vercel.app`) sudah diizinkan gerbang. Kalau situs dibuka
dari domain lain, tambahkan domainnya di `CCTV_ORIGINS` pada
`start-gateway.cmd`, lalu restart task gerbang.

---

## Cara pakai di ERP

- **SD 640×360** (bawaan) hemat data, cocok untuk HP. **HD 1080p** untuk
  melihat detail tanaman.
- Ikon speaker menyalakan suara (bawaannya mati). Ikon panah keluar membuka
  layar penuh.
- **Turn the camera**: tahan tombol panah untuk memutar, lepas untuk berhenti.
  Kamera juga berhenti sendiri setelah 1,5 detik bila perintah berhenti tidak
  sampai. Tombol ini tampil untuk peran yang boleh mengoperasikan produksi.
- Video berhenti otomatis saat tab browser disembunyikan, dan lanjut saat
  dibuka lagi, jadi dashboard yang terbuka tidak menghabiskan kuota.

## Keamanan

- Password kamera hanya ada di `C:\cctv-bridge\secret.yaml`. Jangan pernah
  memasukkannya ke repo (repo publik).
- Tiket dibuat server situs setelah memeriksa login Supabase (akun aktif dan
  sudah onboarding, sama dengan aturan masuk ERP). Tiket berlaku 5 menit dan
  ditandatangani dengan `CCTV_SECRET`.
- Gerbang hanya meneruskan video `plant_factory` dan `plant_factory_sd`,
  gambar diam, dan perintah PTZ. Semua alamat lain ditolak.
- Siapa pun yang punya tiket valid bisa memutar kamera (pemeriksaan peran
  operator hanya di tampilan). Kalau ingin dibatasi lebih ketat, peran perlu
  ikut dicek di `server/api/cctv/ticket.post.ts`.
- Ganti `CCTV_SECRET` (di PC dan Vercel) bila ada yang bocor, lalu restart
  gerbang dan redeploy.

## Pemeriksaan kesehatan (di PC penjembatan)

```powershell
Get-Process go2rtc, node, cloudflared -ErrorAction SilentlyContinue | Format-Table Name, Id, StartTime
curl.exe -s http://localhost:1985/health                 # {"ok":true}
curl.exe -s -o NUL -w "go2rtc: %{http_code}`n" http://localhost:1984/api   # 200
Test-NetConnection 192.168.1.105 -Port 8554             # TcpTestSucceeded : True (ganti IP kamera)
curl.exe -s https://cctv.smartagri.id/health             # {"ok":true}
```

## Kalau ada masalah

| Gejala | Penyebab | Solusi |
|---|---|---|
| Video tidak tampil di `localhost:1984`, log go2rtc `wrong response on DESCRIBE` | Kamera menolak login (RTSP membalas **406**) | Password ONVIF salah. Buat ulang password huruf dan angka saja (langkah 1.5), perbarui kedua baris `secret.yaml`, restart task go2rtc |
| Kamera tidak bisa masuk WiFi | WiFi 5 GHz atau WPA-Enterprise (eduroam) | Pakai router sendiri 2,4 GHz WPA2-Personal |
| Port 8554 tertutup | IP kamera berubah, atau ONVIF mati | Cek IP di halaman ONVIF aplikasi, kunci di router (langkah 2), aktifkan ONVIF |
| Panel ERP: "The camera is not set up yet" | `CCTV_BASE_URL` / `CCTV_SECRET` belum diisi | Isi di Vercel lalu redeploy |
| Panel ERP: "Camera offline" | PC penjembatan mati, task berhenti, atau tunnel putus | Jalankan pemeriksaan kesehatan di atas |
| Panel ERP: "Sign in with an approved account" | Akun belum aktif atau belum onboarding | Setujui akun di admin |
| Video jalan di `localhost`, tapi tidak di situs | Domain situs tidak ada di `CCTV_ORIGINS` | Tambahkan domain di `start-gateway.cmd`, restart task |
| Semua beres tapi gerbang menolak tiket | `CCTV_SECRET` di Vercel beda dengan `cctv-secret.txt` | Samakan, redeploy |
| HD patah-patah | Upload internet plant factory lemah | Pakai SD, atau perkuat koneksi |

## Pengembangan lokal

Untuk mencoba di laptop yang satu jaringan dengan kamera, tambahkan ke
`web/.env` (file ini tidak masuk git):

```
CCTV_BASE_URL=http://localhost:1985
CCTV_SECRET=<isi cctv-secret.txt>
```

Jalankan `start-go2rtc.cmd` dan `start-gateway.cmd` di laptop itu (gerbang
sudah mengizinkan `http://localhost:3000`), lalu `npm run dev` dan buka `/erp`.
