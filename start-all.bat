@echo off
echo ╔══════════════════════════════════════╗
echo ║       SATYARAKSHA — STARTUP          ║
echo ╚══════════════════════════════════════╝
echo.

:: Start relay nodes
start "RELAY-ALPHA [3001]" cmd /k "cd /d %~dp0relay-node && set NODE_ID=A && set PORT=3001 && set PEER_URLS=[\"http://localhost:3002\",\"http://localhost:3003\"] && node server.js"
timeout /t 1 /nobreak >nul

start "RELAY-BETA  [3002]" cmd /k "cd /d %~dp0relay-node && set NODE_ID=B && set PORT=3002 && set PEER_URLS=[\"http://localhost:3001\",\"http://localhost:3003\"] && node server.js"
timeout /t 1 /nobreak >nul

start "RELAY-GAMMA [3003]" cmd /k "cd /d %~dp0relay-node && set NODE_ID=C && set PORT=3003 && set PEER_URLS=[\"http://localhost:3001\",\"http://localhost:3002\"] && node server.js"
timeout /t 2 /nobreak >nul

:: Start frontend
start "FRONTEND [5173]" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo All services starting...
echo.
echo   Frontend : http://localhost:5173
echo   Alpha    : http://localhost:3001/health
echo   Beta     : http://localhost:3002/health
echo   Gamma    : http://localhost:3003/health
echo.
pause
