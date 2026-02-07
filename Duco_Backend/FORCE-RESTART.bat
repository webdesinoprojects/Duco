@echo off
echo ========================================
echo FORCE RESTART BACKEND (KILL ALL NODE)
echo ========================================
echo.
echo WARNING: This will stop ALL Node.js processes!
echo Press Ctrl+C to cancel, or
pause
echo.
echo Killing all Node.js processes...
taskkill /F /IM node.exe
timeout /t 3
echo.
echo All Node processes stopped.
echo.
echo Starting backend with NEW code...
echo.
start cmd /k "cd /d %~dp0 && npm start"
echo.
echo ========================================
echo Backend restarted with FIX!
echo ========================================
echo.
echo WAIT 10 seconds for backend to start, then:
echo 1. Create a new design order
echo 2. Run: node verify-no-base64-anywhere.js
echo 3. Should show: DATABASE IS CLEAN
echo.
pause
