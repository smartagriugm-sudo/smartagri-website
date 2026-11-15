@echo off
rem Menjalankan go2rtc dengan pengaturan di folder ini, dan menyalakannya lagi
rem bila berhenti. Catatan jalannya ada di go2rtc.log.
cd /d "%~dp0"
:loop
"%~dp0go2rtc.exe" -config go2rtc.yaml -config secret.yaml >> go2rtc.log 2>&1
timeout /t 5 /nobreak > nul
goto loop
