@echo off
echo ╔══════════════════════════════════════╗
echo ║    SATYARAKSHA — RESET DEMO DATA     ║
echo ╚══════════════════════════════════════╝
echo.
echo This will DELETE all vault data, audit logs, and consensus shards
echo from all 3 relay node databases.
echo.
set /p confirm="Are you sure? (y/n): "
if /i not "%confirm%"=="y" (
  echo Cancelled.
  pause
  exit /b
)

echo.
echo Cleaning databases...

cd /d %~dp0relay-node

:: Delete all .db, .db-wal, .db-shm files for each node
for %%N in (A B C) do (
  if exist "relay_%%N.db" (
    del /f /q "relay_%%N.db" 2>nul
    del /f /q "relay_%%N.db-wal" 2>nul
    del /f /q "relay_%%N.db-shm" 2>nul
    echo  [OK] Deleted relay_%%N.db
  ) else (
    echo  [--] relay_%%N.db not found, skipping
  )
)

echo.
echo ══════════════════════════════════════
echo  All demo data cleared!
echo  Fresh databases will be created on
echo  next startup.
echo ══════════════════════════════════════
echo.
pause
