@echo off
title Prajakeeya - Installing & Starting...
echo.
echo  ==========================================
echo   PRAJAKEEYA - Zero-Corruption Governance
echo  ==========================================
echo.
echo  Step 1: Installing server dependencies...
cd /d "%~dp0server"
call npm install
echo.
echo  Step 2: Installing client dependencies...
cd /d "%~dp0client"
call npm install
echo.
echo  Step 3: Starting server on port 3001...
cd /d "%~dp0server"
start "Prajakeeya SERVER" cmd /k "npm run dev"
echo.
echo  Step 4: Starting client on port 5173...
cd /d "%~dp0client"
start "Prajakeeya CLIENT" cmd /k "npm run dev"
echo.
echo  Opening browser in 5 seconds...
timeout /t 8 /nobreak
start "" "http://localhost:5173"
echo.
echo  Done! App running at http://localhost:5173
pause
