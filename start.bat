@echo off
echo Starting Guitrard - Guitar Live FX
echo ====================================
echo.

REM Start Backend
if exist backend\app.py (
    echo Starting Backend server...
    start "Guitrard Backend" cmd /k "cd backend && python app.py"
    echo Backend running on http://localhost:5000
    timeout /t 2 /nobreak >nul
) else (
    echo Backend not found. Running frontend only.
)

REM Start Frontend
echo.
echo Starting Frontend...
start "Guitrard Frontend" cmd /k "npm start"

echo.
echo Guitrard is starting...
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo.
echo Close the terminal windows to stop the servers
echo.
pause

