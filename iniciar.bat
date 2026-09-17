@echo off
title ESTELAR - Inicializacion del Sistema
color 0B

echo =======================================================
echo               ESTELAR - EXPLORACION COSMICA
echo =======================================================
echo.
echo Preparando el entorno de ejecucion...
echo.

echo [1/2] Verificando e instalando dependencias (React, Three.js, etc.)...
echo Esto puede tomar unos minutos si es la primera vez.
call npm install --legacy-peer-deps
echo.

echo [2/2] Iniciando el servidor de desarrollo...
echo El universo se abrira automaticamente en tu navegador web.
echo.
echo (Presiona Ctrl+C en esta ventana cuando desees apagar el servidor)
echo.

:: Abre el navegador apuntando al puerto por defecto de Vite
start http://localhost:5173

:: Inicia el servidor
call npm run dev

pause
