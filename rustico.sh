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
    echo "   Administracion:      http://localhost:8082"
    echo "   App PWA barberos:    http://localhost:8083"
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
  logs-admin)
    docker-compose logs -f administracion
    ;;
  logs-pwa)
    docker-compose logs -f app-pwa
    ;;
  logs-desktop)
    docker-compose logs -f administracion
    ;;
  logs-mobile)
    docker-compose logs -f app-pwa
    ;;
  shell-backend)
    docker-compose exec backend sh
    ;;
  shell-admin)
    docker-compose exec administracion sh
    ;;
  shell-pwa)
    docker-compose exec app-pwa sh
    ;;
  shell-desktop)
    docker-compose exec administracion sh
    ;;
  shell-mobile)
    docker-compose exec app-pwa sh
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
    echo "  logs-admin         Logs de administracion"
    echo "  logs-pwa           Logs de app PWA"
    echo "  shell-backend      Terminal del backend"
    echo "  shell-admin        Terminal de administracion"
    echo "  shell-pwa          Terminal de app PWA"
    echo "  health             Verificar salud del API"
    echo ""
    ;;
esac

cd ..
