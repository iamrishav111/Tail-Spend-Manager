@echo off
echo Starting Tail Spend Manager...
echo.

:: Start Backend in a new window
echo Starting Backend (FastAPI)...
start "Backend Server" cmd /k "python backend/main.py"

:: Start Frontend in current window
echo Starting Frontend (Vite)...
npm run dev

pause
