@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul || (echo Necesitas instalar Node.js primero: https://nodejs.org  ^(version LTS^) & pause & exit /b 1)
if not exist node_modules (echo Instalando por unica vez... & call npm install)
call npm start
