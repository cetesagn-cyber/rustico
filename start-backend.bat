@echo off
REM Script para iniciar el backend con MySQL de XAMPP

title RUSTICO - Backend

echo.
echo BACKEND - RUSTICO BARBERADMIN
echo ========================================
echo.

cd /d "C:\Users\Gnino\OneDrive - CEMENTOS TEQUENDAMA S.A.S. - CETESA S.A.S\Rustico\backend"

REM Crear archivo .env si no existe
if not exist ".env" (
    echo Creando archivo .env...
    (
        echo DB_HOST=localhost
        echo DB_PORT=3306
        echo DB_USER=root
        echo DB_PASSWORD=
        echo DB_NAME=rustico_prueba
        echo JWT_SECRET=rustico-jwt-secret-change-in-production-min-32chars
        echo JWT_EXPIRY=8h
        echo REFRESH_TOKEN_EXPIRY=30d
        echo PORT=3010
        echo NODE_ENV=development
        echo FRONTEND_URL=http://localhost:5180,http://127.0.0.1:5180,http://192.168.0.9:5180
    ) > .env
    echo Archivo .env creado
)

echo Verifica que MySQL este iniciado en XAMPP.
echo Iniciando backend en puerto configurado en backend\.env...
echo.
echo Health local por defecto: http://localhost:3010/api/health
echo.
echo Primera ejecucion: crea la base rustico_prueba, tablas y datos de prueba.
echo.

npm run dev

pause
