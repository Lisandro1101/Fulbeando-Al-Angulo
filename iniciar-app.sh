#!/bin/bash
echo "===================================================="
echo "      ⚽ INICIANDO 'AL ANGULO' DEV ENV ⚽"
echo "===================================================="
echo ""
echo "[1/3] Instalando herramientas globales (concurrently, wait-on, tsx)..."
npm install -g concurrently wait-on tsx firebase-tools

echo ""
echo "[2/4] Instalando dependencias de todos los modulos..."
echo "- Root (Scripts)..."
npm install
echo "- Frontend (App)..."
npm install --prefix app
echo "- Cloud Functions..."
npm install --prefix "AL ANGULO/firebase/functions"

echo ""
echo "[3/4] Abriendo el navegador..."
if which xdg-open > /dev/null
then
  xdg-open http://localhost:5173
  xdg-open http://localhost:4000
elif which open > /dev/null
then
  open http://localhost:5173
  open http://localhost:4000
fi

echo ""
echo "[4/4] Levantando Frontend, Emuladores y Sembrando Datos..."
# Nota: Asume que "dev:all" esta configurado en el package.json de la raiz
npm run dev:all
