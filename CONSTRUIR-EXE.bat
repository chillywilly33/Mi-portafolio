@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul || (echo Necesitas instalar Node.js primero: https://nodejs.org  ^(version LTS^) & pause & exit /b 1)
echo === Instalando dependencias (solo la primera vez, tarda unos minutos) ===
call npm install || (echo Fallo npm install & pause & exit /b 1)
echo === Generando el .exe ===
call npm run dist || (echo Fallo la construccion & pause & exit /b 1)
echo.
echo LISTO. Tus archivos estan en la carpeta "dist":
echo   Mis-Inversiones-portable.exe   (un solo archivo, sin instalar)
echo   Mis-Inversiones-instalador.exe (instalador con acceso directo)
explorer dist
pause
