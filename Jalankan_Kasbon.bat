@echo off
title SISTEM KASBON SERVER
cd /d "%~dp0"

:: 1. Matikan sisa-sisa program yang masih nyangkut
taskkill /F /IM node.exe /T >nul 2>&1

echo.
echo  [1/2] MENYALAKAN MESIN DATABASE...
cd backend
start /b node server.js

echo.
echo  [2/2] MENYALAKAN TAMPILAN APLIKASI...
cd ..\frontend
:: Menjalankan frontend secara senyap tanpa jendela baru
start /b cmd /c npm run dev

echo.
echo  Selesai! Aplikasi akan terbuka di browser dalam 5 detik...
timeout /t 5 /nobreak >nul
start http://localhost:5173

exit
