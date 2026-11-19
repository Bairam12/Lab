@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Вариант 18 — OIDC-вход - сервер localhost:3018
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js не найден на этом компьютере.
  echo Установите Node.js ^(версия LTS^) с https://nodejs.org , перезагрузите компьютер и запустите этот файл снова.
  start https://nodejs.org
  pause
  exit /b 1
)
if not exist node_modules (
  echo Первый запуск: устанавливаю библиотеку openid-client ^(нужен интернет^)...
  call npm install
  if errorlevel 1 (
    echo.
    echo Не удалось выполнить npm install. Проверьте интернет и запустите файл снова.
    pause
    exit /b 1
  )
)
set PORT=3018
echo ==============================================
echo  Вариант 18 — OIDC-вход
echo  Сервер: http://localhost:3018
echo  Остановить: закройте это окно или нажмите Ctrl+C
echo ==============================================
start "" cmd /c "ping -n 3 127.0.0.1 >nul & start http://localhost:3018"
node server.js
echo.
echo Сервер остановлен.
pause
