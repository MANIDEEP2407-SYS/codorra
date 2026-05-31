@echo off
echo ╔══════════════════════════════════════╗
echo ║       SATYARAKSHA — STARTUP          ║
echo ╚══════════════════════════════════════╝
echo.
echo  Starting all services in this window...
echo  Press Ctrl+C to stop everything.
echo.

:: Start relay nodes in background (no new windows)
cd /d %~dp0relay-node

set NODE_ID=A
set PORT=3001
set PEER_URLS=["http://localhost:3002","http://localhost:3003"]
start /b node server.js
echo  [OK] Relay Alpha  → http://localhost:3001

set NODE_ID=B
set PORT=3002
set PEER_URLS=["http://localhost:3001","http://localhost:3003"]
start /b node server.js
echo  [OK] Relay Beta   → http://localhost:3002

set NODE_ID=C
set PORT=3003
set PEER_URLS=["http://localhost:3001","http://localhost:3002"]
start /b node server.js
echo  [OK] Relay Gamma  → http://localhost:3003

echo.

:: Start frontend (runs in foreground so this window stays open)
cd /d %~dp0frontend
echo  [OK] Frontend     → http://localhost:5173
echo.
echo ══════════════════════════════════════
echo  All services running. Ctrl+C to stop.
echo ══════════════════════════════════════
echo.
npm run dev
