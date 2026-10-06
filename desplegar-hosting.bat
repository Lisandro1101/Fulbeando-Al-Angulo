@echo off
echo =======================================================
echo Desplegando Fulbeando a Firebase Hosting...
echo =======================================================

:: El deploy va contra el proyecto REAL, que sale de app/.env.production
:: (fulbeando-al-angulo-26). No se usa `firebase deploy` a secas porque
:: firebase-tools toma el proyecto de una cache global por carpeta
:: (~/.config/configstore/firebase-tools.json) que puede apuntar a cualquier lado.

call npm run deploy:hosting
if %errorlevel% neq 0 (
    echo [ERROR] Fallo el build o el despliegue. Revisa los errores arriba.
    pause
    exit /b 1
)

echo =======================================================
echo Despliegue exitoso.
echo =======================================================
pause