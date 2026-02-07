@echo off
echo ========================================
echo RESTARTING BACKEND WITH FIX
echo ========================================
echo.
echo Stopping any running backend processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 >nul
echo.
echo Starting backend...
start cmd /k "npm start"
echo.
echo ========================================
echo Backend restarted!
echo ========================================
echo.
echo NEXT STEPS:
echo 1. Create a new design order
echo 2. Run: node verify-no-base64-anywhere.js
echo 3. Should show: DATABASE IS CLEAN
echo.
pause
