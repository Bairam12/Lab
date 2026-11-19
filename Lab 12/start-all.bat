@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Запускаю все три варианта в отдельных окнах...
start "" "%~dp0variant-05-shop\start.bat"
start "" "%~dp0variant-12-forum\start.bat"
start "" "%~dp0variant-18-oidc\start.bat"
