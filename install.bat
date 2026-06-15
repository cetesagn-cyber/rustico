@echo off
REM Script para instalar dependencias de Rústico localmente (sin Docker)

echo.
echo RUSTICO BARBERADMIN - INSTALACION LOCAL
echo ========================================
echo.

REM ── Backend ──────────────────────────────────────────────────────────────────
cd /d "C:\Users\Gnino\OneDrive - CEMENTOS TEQUENDAMA S.A.S. - CETESA S.A.S\Rustico\backend"

echo Instalando dependencias del backend...
call npm install
if errorlevel 1 ( echo Error al instalar backend & pause & exit /b 1 )

echo Compilando backend...
call npm run build
if errorlevel 1 ( echo Error al compilar backend & pause & exit /b 1 )
echo Backend listo.

REM ── Frontend Desktop ─────────────────────────────────────────────────────────
cd /d "C:\Users\Gnino\OneDrive - CEMENTOS TEQUENDAMA S.A.S. - CETESA S.A.S\Rustico\frontend-desktop"

echo.
echo Instalando dependencias del frontend desktop...
call npm install
if errorlevel 1 ( echo Error al instalar frontend-desktop & pause & exit /b 1 )
echo Frontend desktop listo.

REM ── Frontend Mobile ──────────────────────────────────────────────────────────
cd /d "C:\Users\Gnino\OneDrive - CEMENTOS TEQUENDAMA S.A.S. - CETESA S.A.S\Rustico\frontend-mobile"

echo.
echo Instalando dependencias del frontend mobile...
call npm install
if errorlevel 1 ( echo Error al instalar frontend-mobile & pause & exit /b 1 )
echo Frontend mobile listo.

echo.
echo ========================================
echo INSTALACION COMPLETADA
echo ========================================
echo.
echo Para iniciar la aplicacion:
echo   Terminal 1: start-backend.bat
echo   Terminal 2: start-desktop.bat   (admin, puerto 5180)
echo   Terminal 3: start-mobile.bat    (barberos, puerto 5181)
echo.
echo Credenciales: admin@rustico.co / password
echo.
pause
