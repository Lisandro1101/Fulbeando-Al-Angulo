@echo off
echo ====================================================
echo       ⚽ INICIANDO "AL ANGULO" DEV ENV ⚽
echo ====================================================
echo.
echo [1/3] Instalando herramientas globales (concurrently, wait-on, tsx)...
call npm install -g concurrently wait-on tsx firebase-tools

echo [2/3] Instalando dependencias de todos los modulos...
echo - Root (Scripts)...
call npm install
echo - Frontend (App)...
call npm install --prefix app
echo - Cloud Functions...
call npm install --prefix "AL ANGULO/firebase/functions"

echo.
echo [3/4] Abriendo el navegador...
start http://localhost:5173
start http://localhost:4000

echo.
echo [4/4] Levantando Frontend, Emuladores y Sembrando Datos...
:: Nota: Asume que "dev:all" esta configurado en el package.json de la raiz
call npm run dev:all

pause
