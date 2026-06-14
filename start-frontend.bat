@echo off
REM Script para iniciar el frontend en puerto 5180

title RUSTICO - Frontend

echo.
echo FRONTEND - RUSTICO BARBERADMIN
echo ========================================
echo.

cd /d "C:\Users\Gnino\OneDrive - CEMENTOS TEQUENDAMA S.A.S. - CETESA S.A.S\Rustico\frontend"

echo Iniciando frontend en puerto 5180...
echo.
echo Acceso: http://localhost:5180
echo.
echo El backend debe estar ejecutandose en http://localhost:3010
echo.

npm run dev

pause
