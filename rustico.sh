#!/bin/bash
# Rústico BarberAdmin - Docker Helper Script (Linux/Mac)
# Uso: ./rustico.sh [comando]

cd infrastructure

case "${1:-help}" in
  start)
    echo "🚀 Iniciando Rústico BarberAdmin..."
    docker-compose up --build -d
    sleep 3
    echo ""
    echo "✅ Servicios iniciados:"
    echo "   🖥️  Frontend:  http://localhost"
    echo "   🔌 Backend:   http://localhost:3001"
    echo "   📧 Credenciales: admin@rustico.co / password"
    ;;
  
  stop)
    echo "⏹️  Deteniendo servicios..."
    docker-compose stop
    echo "✅ Servicios detenidos"
    ;;
  
  restart)
    echo "🔄 Reiniciando servicios..."
    docker-compose restart
    echo "✅ Servicios reiniciados"
    ;;
  
  logs)
    docker-compose logs -f
    ;;
  
  logs-backend)
    docker-compose logs -f backend
    ;;
  
  logs-frontend)
    docker-compose logs -f frontend
    ;;
  
  build)
    echo "🏗️  Reconstruyendo imágenes..."
    docker-compose build --no-cache
    echo "✅ Imágenes reconstruidas"
    ;;
  
  clean)
    echo "🧹 Limpiando contenedores y volúmenes..."
    docker-compose down -v
    echo "✅ Limpieza completada"
    ;;
  
  ps)
    docker-compose ps
    ;;
  
  shell-backend)
    echo "🐚 Abriendo terminal del backend..."
    docker-compose exec backend sh
    ;;
  
  shell-frontend)
    echo "🐚 Abriendo terminal del frontend..."
    docker-compose exec frontend sh
    ;;
  
  health)
    echo "🏥 Verificando salud del API..."
    curl http://localhost:3001/api/health
    echo ""
    ;;
  
  *)
    echo ""
    echo "💈 Rústico BarberAdmin - Docker Helper"
    echo ""
    echo "Comandos disponibles:"
    echo "  ./rustico.sh start              - Inicia la aplicación"
    echo "  ./rustico.sh stop               - Detiene la aplicación"
    echo "  ./rustico.sh restart            - Reinicia servicios"
    echo "  ./rustico.sh logs               - Ver logs en tiempo real"
    echo "  ./rustico.sh logs-backend       - Ver logs del backend"
    echo "  ./rustico.sh logs-frontend      - Ver logs del frontend"
    echo "  ./rustico.sh build              - Reconstruir imágenes"
    echo "  ./rustico.sh clean              - Elimina contenedores y volúmenes"
    echo "  ./rustico.sh ps                 - Ver estado de contenedores"
    echo "  ./rustico.sh shell-backend      - Abrir terminal del backend"
    echo "  ./rustico.sh shell-frontend     - Abrir terminal del frontend"
    echo "  ./rustico.sh health             - Verificar salud del API"
    echo ""
    ;;
esac

cd ..
