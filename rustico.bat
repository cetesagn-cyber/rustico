@echo off
REM Rústico BarberAdmin - Docker Helper Script (Windows)
REM Uso: rustico.bat [comando]

cd infrastructure

IF "%1"=="" (
    ECHO.
    ECHO 💈 Rústico BarberAdmin - Docker Helper
    ECHO.
    ECHO Comandos disponibles:
    ECHO   rustico.bat start       - Inicia la aplicación
    ECHO   rustico.bat stop        - Detiene la aplicación
    ECHO   rustico.bat restart     - Reinicia servicios
    ECHO   rustico.bat logs        - Ver logs en tiempo real
    ECHO   rustico.bat logs-backend - Ver logs del backend
    ECHO   rustico.bat logs-frontend - Ver logs del frontend
    ECHO   rustico.bat build       - Reconstruir imágenes
    ECHO   rustico.bat clean       - Elimina contenedores y volúmenes
    ECHO   rustico.bat ps          - Ver estado de contenedores
    ECHO   rustico.bat shell-backend - Abrir terminal del backend
    ECHO   rustico.bat shell-frontend - Abrir terminal del frontend
    ECHO   rustico.bat health      - Verificar salud del API
    ECHO.
    GOTO end
)

IF "%1"=="start" (
    ECHO 🚀 Iniciando Rústico BarberAdmin...
    docker-compose up --build -d
    timeout /t 3
    ECHO.
    ECHO ✅ Servicios iniciados:
    ECHO    🖥️  Frontend:  http://localhost
    ECHO    🔌 Backend:   http://localhost:3001
    ECHO    📧 Credenciales: admin@rustico.co / password
    GOTO end
)

IF "%1"=="stop" (
    ECHO ⏹️  Deteniendo servicios...
    docker-compose stop
    ECHO ✅ Servicios detenidos
    GOTO end
)

IF "%1"=="restart" (
    ECHO 🔄 Reiniciando servicios...
    docker-compose restart
    ECHO ✅ Servicios reiniciados
    GOTO end
)

IF "%1"=="logs" (
    docker-compose logs -f
    GOTO end
)

IF "%1"=="logs-backend" (
    docker-compose logs -f backend
    GOTO end
)

IF "%1"=="logs-frontend" (
    docker-compose logs -f frontend
    GOTO end
)

IF "%1"=="build" (
    ECHO 🏗️  Reconstruyendo imágenes...
    docker-compose build --no-cache
    ECHO ✅ Imágenes reconstruidas
    GOTO end
)

IF "%1"=="clean" (
    ECHO 🧹 Limpiando contenedores y volúmenes...
    docker-compose down -v
    ECHO ✅ Limpieza completada
    GOTO end
)

IF "%1"=="ps" (
    docker-compose ps
    GOTO end
)

IF "%1"=="shell-backend" (
    ECHO 🐚 Abriendo terminal del backend...
    docker-compose exec backend sh
    GOTO end
)

IF "%1"=="shell-frontend" (
    ECHO 🐚 Abriendo terminal del frontend...
    docker-compose exec frontend sh
    GOTO end
)

IF "%1"=="health" (
    ECHO 🏥 Verificando salud del API...
    curl http://localhost:3001/api/health
    ECHO.
    GOTO end
)

ECHO ❌ Comando no reconocido: %1
ECHO Ejecuta "rustico.bat" sin argumentos para ver la ayuda.

:end
cd ..
