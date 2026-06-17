@echo off
title RUSTICO - Portal de Administracion

echo.
echo PORTAL DE ADMINISTRACION - RUSTICO
echo ========================================
echo Acceso: http://localhost:5180
echo Backend: http://localhost:3010
echo.

cd /d "C:\Users\Gnino\OneDrive - CEMENTOS TEQUENDAMA S.A.S. - CETESA S.A.S\Rustico"
node scripts\serve-dist.mjs apps\portal-administracion\dist 5180

pause
