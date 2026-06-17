@echo off
REM Rustico BarberAdmin - Docker Helper Script (Windows)

cd infrastructure

IF "%1"=="" (
    ECHO.
    ECHO Rustico BarberAdmin - Docker Helper
    ECHO.
    ECHO Comandos:
    ECHO   rustico.bat start              - Inicia todos los servicios
    ECHO   rustico.bat stop               - Detiene todos los servicios
    ECHO   rustico.bat restart            - Reinicia servicios
    ECHO   rustico.bat build              - Reconstruir imagenes
    ECHO   rustico.bat clean              - Elimina contenedores y volumenes
    ECHO   rustico.bat ps                 - Estado de contenedores
    ECHO   rustico.bat logs               - Logs en tiempo real (todos)
    ECHO   rustico.bat logs-backend       - Logs del backend
    ECHO   rustico.bat logs-portal        - Logs del portal de administracion
    ECHO   rustico.bat logs-app           - Logs de la app de barberos
    ECHO   rustico.bat shell-backend      - Terminal del backend
    ECHO   rustico.bat shell-portal       - Terminal del portal
    ECHO   rustico.bat shell-app          - Terminal de la app
    ECHO   rustico.bat health             - Verificar salud del API
    ECHO.
    GOTO end
)

IF "%1"=="start" (
    ECHO Iniciando Rustico BarberAdmin...
    docker-compose up --build -d
    timeout /t 3
    ECHO.
    ECHO Servicios iniciados:
    ECHO    Portal admin:        http://localhost:8082
    ECHO    App barberos:        http://localhost:8083
    ECHO    Backend API:         http://localhost:3002
    ECHO    Credenciales:        admin@rustico.co / password
    GOTO end
)
IF "%1"=="stop"    ( docker-compose stop    & GOTO end )
IF "%1"=="restart" ( docker-compose restart & GOTO end )
IF "%1"=="build"   ( docker-compose build --no-cache & GOTO end )
IF "%1"=="clean"   ( docker-compose down -v & GOTO end )
IF "%1"=="ps"      ( docker-compose ps & GOTO end )
IF "%1"=="logs"         ( docker-compose logs -f & GOTO end )
IF "%1"=="logs-backend" ( docker-compose logs -f backend & GOTO end )
IF "%1"=="logs-portal"  ( docker-compose logs -f portal-administracion & GOTO end )
IF "%1"=="logs-app"     ( docker-compose logs -f app-barberos & GOTO end )
IF "%1"=="logs-admin"   ( docker-compose logs -f portal-administracion & GOTO end )
IF "%1"=="logs-pwa"     ( docker-compose logs -f app-barberos & GOTO end )
IF "%1"=="logs-desktop" ( docker-compose logs -f portal-administracion & GOTO end )
IF "%1"=="logs-mobile"  ( docker-compose logs -f app-barberos & GOTO end )
IF "%1"=="shell-backend" ( docker-compose exec backend sh & GOTO end )
IF "%1"=="shell-portal"  ( docker-compose exec portal-administracion sh & GOTO end )
IF "%1"=="shell-app"     ( docker-compose exec app-barberos sh & GOTO end )
IF "%1"=="shell-admin"   ( docker-compose exec portal-administracion sh & GOTO end )
IF "%1"=="shell-pwa"     ( docker-compose exec app-barberos sh & GOTO end )
IF "%1"=="shell-desktop" ( docker-compose exec portal-administracion sh & GOTO end )
IF "%1"=="shell-mobile"  ( docker-compose exec app-barberos sh & GOTO end )
IF "%1"=="health" ( curl http://localhost:3002/api/health & ECHO. & GOTO end )

ECHO Comando no reconocido: %1
ECHO Ejecuta "rustico.bat" sin argumentos para ver la ayuda.

:end
cd ..
