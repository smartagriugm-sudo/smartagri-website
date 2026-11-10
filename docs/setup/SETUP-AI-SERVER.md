# 🖥️ Setup server AI (Ollama) untuk smartagri

Panduan menjalankan model AI di komputer server (Windows + GPU) dan
menghubungkannya ke situs yang di-deploy di Vercel. Situs hanya memanggil
endpoint AI lewat HTTPS; browser tidak pernah mengakses Ollama langsung.

## Arsitektur

```
Pengunjung → situs (Vercel)
Backend Vercel → https://ai.smartagri.id      (Cloudflare, HTTPS)   ← URL tetap (Named Tunnel)
              → cloudflared (service, koneksi keluar saja)
              → Caddy  127.0.0.1:8080   (cek "Authorization: Bearer <SECRET>")
              → Ollama 127.0.0.1:11434  (GPU, model)
```

- **Tidak ada port masuk** yang dibuka di router/firewall (cloudflared hanya
  koneksi keluar).
- **Caddy** = gerbang autentikasi: hanya request dengan token benar yang
  diteruskan ke Ollama (Ollama sendiri tanpa password).
- Kode situs sudah mengirim header `Authorization: Bearer <AI_API_KEY>`, jadi
  `AI_API_KEY` di Vercel **harus sama persis** dengan `<SECRET>` di Caddyfile.

## Lingkungan referensi
- Server: Windows + NVIDIA RTX 4090 (24 GB).
- Domain: `smartagri.id` (registrar **PT Digital Registra Indonesia**), dikelola
  DNS-nya di Cloudflare (akun `Smartagri.ugm@gmail.com`).
- Subdomain AI: `ai.smartagri.id`.

---

## Komponen & cara dijalankan (auto-start saat boot)

Ketiganya hidup otomatis tanpa perlu login interaktif.

### 1. Ollama (port 11434) — SYSTEM scheduled task `OllamaServe`
- Model disimpan di profil user; agar terbaca SYSTEM, set env mesin:
  ```powershell
  setx OLLAMA_MODELS "C:\Users\<user>\.ollama\models" /M
  setx OLLAMA_KEEP_ALIVE "24h" /M
  ```
- Task dibuat dengan trigger AtStartup sebagai SYSTEM (lihat bagian Re-activation).

### 2. Caddy (port 8080) — scheduled task `CaddyAI`
File `C:\caddy\Caddyfile`:
```
:8080 {
	@authorized header Authorization "Bearer <SECRET>"
	handle @authorized {
		reverse_proxy 127.0.0.1:11434 {
			header_up Host 127.0.0.1:11434
		}
	}
	handle {
		respond "Unauthorized" 401
	}
}
```
Catatan penting konfigurasi ini (hasil debugging):
- Alamat `:8080` (bukan `127.0.0.1:8080`) → menerima Host header apa pun
  (cloudflared meneruskan Host publik) dan tetap HTTP polos (tanpa TLS).
- `header_up Host 127.0.0.1:11434` → wajib, supaya Ollama tidak menolak request
  dengan 403 (proteksi DNS-rebinding Ollama menolak Host asing).

### 3. cloudflared — tunnel ke `localhost:8080`
- **Named Tunnel** (permanen): service Windows, URL tetap `ai.smartagri.id`.
- **Quick Tunnel** (sementara): `cloudflared tunnel --url http://localhost:8080`,
  URL `*.trycloudflare.com` yang **berubah tiap restart**.

---

## Model yang tersedia

Ditambahkan via `ollama pull <id>` di server, lalu didaftarkan di pemilih model
situs pada `web/src/lib/ai/models.ts` (entri pertama = default chat baru).

| Model (id) | Perkiraan VRAM |
|---|---|
| `qwen2.5:14b` (default) | ~9 GB |
| `qwen2.5:32b` | ~20 GB |
| `qwen2.5:7b` | ~4.7 GB |
| `llama3.1:8b` | ~5 GB |
| `mistral-nemo:12b` | ~7 GB |
| `gemma2:27b` | ~15 GB |

Hanya 1 model aktif per permintaan; ganti model = Ollama memuat ke VRAM beberapa
detik di pemakaian pertama (lalu hangat karena `OLLAMA_KEEP_ALIVE=24h`).
Menambah model: `ollama pull <id>` → tambahkan entri di `models.ts` → redeploy.

---

## Environment variable di Vercel (Production)

| Key | Value |
|---|---|
| `AI_API_BASE_URL` | `https://ai.smartagri.id/v1` (Named) atau `https://xxxx.trycloudflare.com/v1` (Quick) |
| `AI_MODEL` | `qwen2.5:14b` |
| `AI_API_KEY` | `<SECRET>` (sama dengan Caddyfile) |
| `AI_TIMEOUT_MS` | `120000` |

Setiap perubahan env butuh **Redeploy**.

---

## Named Tunnel (URL tetap — target akhir)

### Prasyarat: `smartagri.id` aktif di Cloudflare
1. Cloudflare → **Add a domain** → `smartagri.id` → Free → Continue.
2. Catat 2 nameserver yang diberikan (mis. `kimora.ns.cloudflare.com`,
   `sam.ns.cloudflare.com`).
3. Di registrar **Digital Registra**: set nameserver `smartagri.id` ke **persis
   2** nameserver Cloudflare itu; hapus NS lain (mis. `*.contabo.net`). Matikan
   **DNSSEC** bila aktif.
4. Tunggu status domain **Active** di Cloudflare.

### Buat tunnel + service
1. Cloudflare → **Zero Trust → Networks → Tunnels → Create a tunnel →
   Cloudflared** → nama `smartagri-ai` → Save.
2. Pilih Windows 64-bit → jalankan perintah ber-token di PowerShell Admin:
   ```powershell
   cloudflared.exe service install <TOKEN>
   ```
   (terpasang sebagai service: auto-start + auto-reconnect setelah internet putus)
3. Tab **Public Hostname → Add**: Subdomain `ai`, Domain `smartagri.id`,
   Service `HTTP` `localhost:8080` → Save.
4. Verifikasi:
   ```powershell
   Get-Service cloudflared       # Running
   curl.exe -i -H "Authorization: Bearer <SECRET>" https://ai.smartagri.id/v1/models   # 200
   ```
5. Set `AI_API_BASE_URL = https://ai.smartagri.id/v1` di Vercel → Redeploy.
   Setelah ini URL tidak berubah lagi; Quick Tunnel bisa dipensiunkan.

---

## Matikan sleep (agar tidak putus saat ditinggal)

```powershell
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
powercfg /change monitor-timeout-ac 0
```

---

## Menyalakan ulang stack (re-activation)

```powershell
# 1. cek
Get-Process ollama,caddy,cloudflared -ErrorAction SilentlyContinue

# 2. Ollama
curl.exe http://localhost:11434/api/tags
#   jika gagal:
Start-ScheduledTask -TaskName OllamaServe; Start-Sleep 4

# 3. Caddy
Start-ScheduledTask -TaskName CaddyAI; Start-Sleep 2
curl.exe -i -H "Authorization: Bearer <SECRET>" http://127.0.0.1:8080/v1/models   # 200

# 4a. Named Tunnel: jalan otomatis (service). Cek: Get-Service cloudflared
# 4b. Quick Tunnel (sementara): catat URL baru, lalu update AI_API_BASE_URL + redeploy
cloudflared tunnel --url http://localhost:8080
```

### Membuat ulang task (jika belum ada)
```powershell
# Ollama
$o = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
$p = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$s = New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName "OllamaServe" -Action (New-ScheduledTaskAction -Execute $o -Argument "serve") -Trigger (New-ScheduledTaskTrigger -AtStartup) -Principal $p -Settings $s -Force

# Caddy
Register-ScheduledTask -TaskName "CaddyAI" -Action (New-ScheduledTaskAction -Execute "C:\caddy\caddy.exe" -Argument "run --config C:\caddy\Caddyfile" -WorkingDirectory "C:\caddy") -Trigger (New-ScheduledTaskTrigger -AtStartup) -Principal $p -Settings $s -Force
```

---

## Pre-check kesehatan (isi `$SECRET` dan `$TUNNEL`)

```powershell
$SECRET = "<SECRET>"
$TUNNEL = "https://ai.smartagri.id"   # atau URL trycloudflare saat ini

Get-Process ollama,caddy,cloudflared -ErrorAction SilentlyContinue | Format-Table Name,Id,StartTime -AutoSize
curl.exe -s http://localhost:11434/api/tags
curl.exe -s -o NUL -w "Caddy tanpa token: HTTP %{http_code}`n" http://127.0.0.1:8080/v1/models
curl.exe -s -o NUL -w "Caddy token: HTTP %{http_code}`n" -H "Authorization: Bearer $SECRET" http://127.0.0.1:8080/v1/models
curl.exe -s -o NUL -w "Tunnel: HTTP %{http_code}`n" -H "Authorization: Bearer $SECRET" "$TUNNEL/v1/models"
```
Sehat: Ollama tampil model; Caddy tanpa token 401, dengan token 200; Tunnel 200.

---

## Troubleshooting (masalah yang pernah terjadi)

| Gejala | Penyebab & solusi |
|---|---|
| `open Caddyfile: cannot find file` | File tersimpan sebagai `Caddyfile.txt`. Buat ulang tanpa ekstensi. |
| Caddy malah minta sertifikat / HTTPS di 8080, lalu `400` | Alamat `127.0.0.1:8080` memicu auto-HTTPS. Pakai `:8080`. |
| Tunnel 200 tapi body kosong, tanpa `Via: Caddy` | Caddy tidak cocok Host. Pakai alamat `:8080` (terima Host apa pun). |
| Tunnel `403 Forbidden` (ada `Via: Caddy`) | Ollama menolak Host asing. Tambah `header_up Host 127.0.0.1:11434`. |
| Chat error "something went wrong" tiba-tiba | URL Quick Tunnel berubah (server restart). Update `AI_API_BASE_URL` di Vercel + redeploy. |
| Model dipilih → error | Model belum di-`ollama pull` di server. Tarik dulu model itu. |
| Server putus setelah ditinggal | Sleep aktif / Quick Tunnel mati. Matikan sleep; pakai Named Tunnel (service). |
| `curl`/`Invoke-WebRequest` aneh di PowerShell | Pakai `curl.exe` (curl asli), bukan alias `curl`. |

---

## Catatan keamanan
- `<SECRET>` adalah kunci akses GPU. Simpan aman; ganti dengan memperbarui
  Caddyfile + `AI_API_KEY` Vercel lalu restart Caddy.
- Hanya butuh anon key Supabase + secret ini; tidak ada kunci `service_role`.
- Tidak ada port masuk yang dibuka (Cloudflare Tunnel hanya koneksi keluar).
