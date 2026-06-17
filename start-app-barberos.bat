@echo off
title RUSTICO - App Barberos

echo.
echo APP BARBEROS - RUSTICO
echo ========================================
echo Acceso: http://localhost:5181
echo Backend: http://localhost:3010
echo.
echo Abre en tu celular: http://[IP-de-tu-PC]:5181
echo.

cd /d "C:\Users\Gnino\OneDrive - CEMENTOS TEQUENDAMA S.A.S. - CETESA S.A.S\Rustico"
node scripts\serve-dist.mjs apps\app-barberos\dist 5181

pause
