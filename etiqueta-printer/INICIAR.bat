@echo off
title FourTEX - Impressora de Etiquetas
color 0A
echo.
echo  =====================================
echo   FourTEX - Impressora de Etiquetas
echo  =====================================
echo.
echo  Iniciando...
echo.

cd /d "%~dp0"

powershell -ExecutionPolicy Bypass -File "INICIAR.ps1"

echo.
echo  Programa encerrado ou erro detectado.
pause
