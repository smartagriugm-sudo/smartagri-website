@echo off
rem Menjalankan gerbang CCTV (butuh Node.js 18 atau lebih baru), dan
rem menyalakannya lagi bila berhenti. Catatan jalannya ada di gateway.log.
rem Tambahkan domain lain di CCTV_ORIGINS bila situs dibuka dari alamat lain.
cd /d "%~dp0"
set "CCTV_ORIGINS=https://www.smart-agri.id,https://smart-agri.id,http://localhost:3000"
:loop
node cctv-gateway.mjs >> gateway.log 2>&1
timeout /t 5 /nobreak > nul
goto loop
