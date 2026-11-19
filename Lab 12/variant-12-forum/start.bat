@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Вариант 12 — мини-форум - сервер localhost:3012
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js не найден на этом компьютере.
  echo Установите Node.js ^(версия LTS^) с https://nodejs.org , перезагрузите компьютер и запустите этот файл снова.
  start https://nodejs.org
  pause
  exit /b 1
)
set PORT=3012
echo ==============================================
echo  Вариант 12 — мини-форум
echo  Сервер: http://localhost:3012
echo  Остановить: закройте это окно или нажмите Ctrl+C
echo ==============================================
start "" cmd /c "ping -n 3 127.0.0.1 >nul & start http://localhost:3012"
node server.js
echo.
echo Сервер остановлен.
pause
