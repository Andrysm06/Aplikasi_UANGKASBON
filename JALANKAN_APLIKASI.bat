@echo off
:: 1. Jalankan Backend (Port 5000)
start /b cmd /c "cd /d "%~dp0backend" && npm start"

:: 2. Jalankan Frontend (Port 5173) 
start /b cmd /c "cd /d "%~dp0frontend" && npm run dev"

:: 3. Jalankan Jendela Window secara instan (V7.9)
timeout /t 1 /nobreak > nul

:: 4. Buka Jendela Standalone
start msedge --app=http://127.0.0.1:5173

exit

:: 5. Buka dalam mode Jendela Standalone (Microsoft Edge App Mode)
start msedge --app=http://127.0.0.1:5173

exit
