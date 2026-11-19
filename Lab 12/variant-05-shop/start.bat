@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Вариант 5 — интернет-магазин - сервер localhost:3005
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js не найден на этом компьютере.
  echo Установите Node.js ^(версия LTS^) с https://nodejs.org , перезагрузите компьютер и запустите этот файл снова.
  start https://nodejs.org
  pause
  exit /b 1
)
set PORT=3005
echo ==============================================
echo  Вариант 5 — интернет-магазин
echo  Сервер: http://localhost:3005
echo  Остановить: закройте это окно или нажмите Ctrl+C
echo ==============================================
start "" cmd /c "ping -n 3 127.0.0.1 >nul & start http://localhost:3005"
node server.js
echo.
echo Сервер остановлен.
pause
