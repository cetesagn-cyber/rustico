@echo off
REM Script para iniciar la aplicación Rústico localmente (sin Docker)

echo.
echo 💈 RUSTICO BARBERADMIN - INICIO LOCAL
echo ════════════════════════════════════════
echo.

REM Cambiar a directorio backend
cd /d "C:\Users\Gnino\OneDrive - CEMENTOS TEQUENDAMA S.A.S. - CETESA S.A.S\Rustico\backend"

echo 📦 Instalando dependencias del backend...
call npm install

if errorlevel 1 (
    echo ❌ Error al instalar backend
    pause
    exit /b 1
)

echo ✅ Backend listo

REM Cambiar a directorio frontend
cd /d "C:\Users\Gnino\OneDrive - CEMENTOS TEQUENDAMA S.A.S. - CETESA S.A.S\Rustico\frontend"

echo.
echo 📦 Instalando dependencias del frontend...
call npm install

if errorlevel 1 (
    echo ❌ Error al instalar frontend
    pause
    exit /b 1
)

echo ✅ Frontend listo

REM Volver al backend y compilar
cd /d "C:\Users\Gnino\OneDrive - CEMENTOS TEQUENDAMA S.A.S. - CETESA S.A.S\Rustico\backend"

echo.
echo 🔨 Compilando backend...
call npm run build

if errorlevel 1 (
    echo ❌ Error al compilar backend
    pause
    exit /b 1
)

echo ✅ Backend compilado

echo.
echo ════════════════════════════════════════
echo ✅ INSTALACIÓN COMPLETADA
echo ════════════════════════════════════════
echo.
echo 🚀 Para iniciar la aplicación:
echo.
echo    1. Abre dos terminales (CMD)
echo    2. Terminal 1: ejecuta start-backend.bat
echo    3. Terminal 2: ejecuta start-frontend.bat
echo.
echo 📍 Accesos:
echo    - Frontend:  http://localhost:5173
echo    - Backend:   http://localhost:3001
echo    - Email:     admin@rustico.co
echo    - Password:  password
echo.
pause
