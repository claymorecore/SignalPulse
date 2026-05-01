@echo off
cd /d "%~dp0"

if not exist "client\node_modules" (
  echo Missing client\node_modules
  pause
  exit /b 1
)

if not exist "server\node_modules" (
  echo Missing server\node_modules
  pause
  exit /b 1
)

start "SignalPulse Client" cmd /k "cd /d %~dp0client && npm run dev"
start "SignalPulse Server" cmd /k "cd /d %~dp0server && npm run start"