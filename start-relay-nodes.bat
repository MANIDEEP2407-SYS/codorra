@echo off
echo Starting SatyaRaksha relay nodes (single window)...
echo Press Ctrl+C to stop all nodes.
echo.

cd /d %~dp0relay-node

set NODE_ID=A
set PORT=3001
set PEER_URLS=["http://localhost:3002","http://localhost:3003"]
start /b node server.js
echo  [OK] Alpha → http://localhost:3001/health

set NODE_ID=B
set PORT=3002
set PEER_URLS=["http://localhost:3001","http://localhost:3003"]
start /b node server.js
echo  [OK] Beta  → http://localhost:3002/health

set NODE_ID=C
set PORT=3003
set PEER_URLS=["http://localhost:3001","http://localhost:3002"]
start /b node server.js
echo  [OK] Gamma → http://localhost:3003/health

echo.
echo All relay nodes running. Press any key to stop...
pause >nul
taskkill /f /im node.exe >nul 2>&1
echo Stopped.
