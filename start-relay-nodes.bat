@echo off
echo Starting TruthSwitch relay nodes...

:: Node A (port 3001)
start "RELAY-ALPHA [3001]" cmd /k "cd /d %~dp0relay-node && set NODE_ID=A && set PORT=3001 && set PEER_URLS=[\"http://localhost:3002\",\"http://localhost:3003\"] && node server.js"

:: Node B (port 3002)
start "RELAY-BETA  [3002]" cmd /k "cd /d %~dp0relay-node && set NODE_ID=B && set PORT=3002 && set PEER_URLS=[\"http://localhost:3001\",\"http://localhost:3003\"] && node server.js"

:: Node C (port 3003)
start "RELAY-GAMMA [3003]" cmd /k "cd /d %~dp0relay-node && set NODE_ID=C && set PORT=3003 && set PEER_URLS=[\"http://localhost:3001\",\"http://localhost:3002\"] && node server.js"

echo Relay nodes launching in separate windows.
echo.
echo   Alpha : http://localhost:3001/health
echo   Beta  : http://localhost:3002/health
echo   Gamma : http://localhost:3003/health
echo.
pause
