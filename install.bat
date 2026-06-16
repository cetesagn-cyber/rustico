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

REM -- Administracion ----------------------------------------------------------
cd /d "C:\Users\Gnino\OneDrive - CEMENTOS TEQUENDAMA S.A.S. - CETESA S.A.S\Rustico\apps\administracion"

echo.
echo Instalando dependencias de administracion...
call npm install
if errorlevel 1 ( echo Error al instalar administracion & pause & exit /b 1 )
echo Administracion lista.

REM -- App PWA barberos --------------------------------------------------------
cd /d "C:\Users\Gnino\OneDrive - CEMENTOS TEQUENDAMA S.A.S. - CETESA S.A.S\Rustico\apps\app-pwa"

echo.
echo Instalando dependencias de app PWA...
call npm install
if errorlevel 1 ( echo Error al instalar app PWA & pause & exit /b 1 )
echo App PWA lista.

echo.
echo ========================================
echo INSTALACION COMPLETADA
echo ========================================
echo.
echo Para iniciar la aplicacion:
echo   Terminal 1: start-backend.bat
echo   Terminal 2: start-administracion.bat   (admin, puerto 5180)
echo   Terminal 3: start-app-pwa.bat          (barberos, puerto 5181)
echo.
echo Credenciales: admin@rustico.co / password
echo.
pause
