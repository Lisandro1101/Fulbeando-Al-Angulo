@echo off
echo =======================================================
echo Iniciando despliegue de Fulbeando a Firebase Hosting...
echo =======================================================

call firebase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Firebase CLI no esta instalado o no esta en el PATH.
    echo Instalate Firebase CLI con: npm install -g firebase-tools
    pause
    exit /b 1
)

echo [1/3] Compilando el frontend (Vite build)...
call npm run build --prefix app
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la compilacion. Revisa los errores arriba.
    pause
    exit /b 1
)

echo [2/3] Desplegando en Firebase Hosting...
cd app && call npm run build && cd .. && call firebase deploy --only hosting
if %errorlevel% neq 0 (
    echo [ERROR] Fallo el despliegue en Firebase.
    pause
    exit /b 1
)

echo [3/3] Despliegue exitoso. Abriendo el sitio en el navegador...
start https://fulbeando-al-angulo-26--pre-produccion-5ez821v9.web.app/perfil
echo =======================================================
echo Terminado.
pause
