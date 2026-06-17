#!/bin/bash
# Rustico BarberAdmin - Docker Helper Script (Linux/Mac)

cd infrastructure

case "${1:-help}" in
  start)
    echo "Iniciando Rustico BarberAdmin..."
    docker-compose up --build -d
    sleep 3
    echo ""
    echo "Servicios iniciados:"
    echo "   Portal admin:        http://localhost:8082"
    echo "   App barberos:        http://localhost:8083"
    echo "   Backend API:         http://localhost:3002"
    echo "   Credenciales:        admin@rustico.co / password"
    ;;
  stop)
    docker-compose stop
    ;;
  restart)
    docker-compose restart
    ;;
  build)
    docker-compose build --no-cache
    ;;
  clean)
    docker-compose down -v
    ;;
  ps)
    docker-compose ps
    ;;
  logs)
    docker-compose logs -f
    ;;
  logs-backend)
    docker-compose logs -f backend
    ;;
  logs-portal)
    docker-compose logs -f portal-administracion
    ;;
  logs-app)
    docker-compose logs -f app-barberos
    ;;
  logs-admin)
    docker-compose logs -f portal-administracion
    ;;
  logs-pwa)
    docker-compose logs -f app-barberos
    ;;
  logs-desktop)
    docker-compose logs -f portal-administracion
    ;;
  logs-mobile)
    docker-compose logs -f app-barberos
    ;;
  shell-backend)
    docker-compose exec backend sh
    ;;
  shell-portal)
    docker-compose exec portal-administracion sh
    ;;
  shell-app)
    docker-compose exec app-barberos sh
    ;;
  shell-admin)
    docker-compose exec portal-administracion sh
    ;;
  shell-pwa)
    docker-compose exec app-barberos sh
    ;;
  shell-desktop)
    docker-compose exec portal-administracion sh
    ;;
  shell-mobile)
    docker-compose exec app-barberos sh
    ;;
  health)
    curl http://localhost:3002/api/health
    echo ""
    ;;
  *)
    echo ""
    echo "Rustico BarberAdmin - Docker Helper"
    echo ""
    echo "Uso: ./rustico.sh [comando]"
    echo ""
    echo "Comandos:"
    echo "  start              Inicia todos los servicios"
    echo "  stop               Detiene todos los servicios"
    echo "  restart            Reinicia servicios"
    echo "  build              Reconstruye imagenes"
    echo "  clean              Elimina contenedores y volumenes"
    echo "  ps                 Estado de contenedores"
    echo "  logs               Logs de todos los servicios"
    echo "  logs-backend       Logs del backend"
    echo "  logs-portal        Logs del portal de administracion"
    echo "  logs-app           Logs de la app de barberos"
    echo "  shell-backend      Terminal del backend"
    echo "  shell-portal       Terminal del portal"
    echo "  shell-app          Terminal de la app"
    echo "  health             Verificar salud del API"
    echo ""
    ;;
esac

cd ..
