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
    echo "   Desktop (admin):     http://localhost:8082"
    echo "   Mobile (barberos):   http://localhost:8083"
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
  logs-desktop)
    docker-compose logs -f frontend-desktop
    ;;
  logs-mobile)
    docker-compose logs -f frontend-mobile
    ;;
  shell-backend)
    docker-compose exec backend sh
    ;;
  shell-desktop)
    docker-compose exec frontend-desktop sh
    ;;
  shell-mobile)
    docker-compose exec frontend-mobile sh
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
    echo "  logs-desktop       Logs del frontend desktop"
    echo "  logs-mobile        Logs del frontend mobile"
    echo "  shell-backend      Terminal del backend"
    echo "  shell-desktop      Terminal del frontend desktop"
    echo "  shell-mobile       Terminal del frontend mobile"
    echo "  health             Verificar salud del API"
    echo ""
    ;;
esac

cd ..
