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

REM -- Portal de administracion -----------------------------------------------
cd /d "C:\Users\Gnino\OneDrive - CEMENTOS TEQUENDAMA S.A.S. - CETESA S.A.S\Rustico\apps\portal-administracion"

echo.
echo Instalando dependencias del portal de administracion...
call npm install
if errorlevel 1 ( echo Error al instalar portal de administracion & pause & exit /b 1 )
echo Portal de administracion listo.

REM -- App barberos ------------------------------------------------------------
cd /d "C:\Users\Gnino\OneDrive - CEMENTOS TEQUENDAMA S.A.S. - CETESA S.A.S\Rustico\apps\app-barberos"

echo.
echo Instalando dependencias de app barberos...
call npm install
if errorlevel 1 ( echo Error al instalar app barberos & pause & exit /b 1 )
echo App barberos lista.

echo.
echo ========================================
echo INSTALACION COMPLETADA
echo ========================================
echo.
echo Para iniciar la aplicacion:
echo   Terminal 1: start-backend.bat
echo   Terminal 2: start-portal-administracion.bat   (admin, puerto 5180)
echo   Terminal 3: start-app-barberos.bat             (barberos, puerto 5181)
echo.
echo Credenciales: admin@rustico.co / password
echo.
pause
