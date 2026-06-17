# 🚀 Publicar Rústico BarberAdmin

## Requisitos previos
- Docker instalado y corriendo
- Docker Compose (incluido con Docker Desktop)
- Git (opcional, para clonar el repositorio)
- Al menos 2GB de RAM libre
- Puertos Docker publicados libres: 8082 para frontend, 3002 para backend y 3308 para MySQL.

## Pasos para desplegar localmente con Docker

### 1. Verificar archivos necesarios

```bash
# Navega al directorio principal del proyecto
cd Rustico/

# Verifica que todos los archivos estén presentes
ls backend/Dockerfile          # Debe existir
ls frontend/Dockerfile         # Debe existir
ls frontend/nginx.conf         # Debe existir
ls infrastructure/docker-compose.yml  # Debe existir
```

Si falta alguno, clona nuevamente el repositorio o crea los archivos manualmente.

### 2. Construir e iniciar con Docker Compose

```bash
# Navega a la carpeta de infraestructura
cd infrastructure/

# Construye las imágenes Docker y levanta los servicios
docker-compose up --build

# Si deseas ejecutar en segundo plano (modo detachado):
docker-compose up --build -d
```

**Primera vez**: Esto tomará 3-5 minutos mientras descarga dependencias y construye las imágenes.

### 3. Esperar que los servicios estén listos

Busca en los logs estos mensajes de éxito:

```
✅ Schema SQLite aplicado
🌱 Generando 3 meses de datos — Rústico BarberAdmin...
✅ Seed completado — Rústico BarberAdmin listo
💈 ═══════════════════════════════════════════════ 💈
🚀 Rústico BarberAdmin API · production
```

### 4. Acceder a la aplicación

Una vez que todo esté corriendo:

- **🖥️ Frontend (Interfaz)**: http://localhost:8082
- **🔌 Backend API**: http://localhost:3002
- **📊 Health Check**: http://localhost:3002/api/health
- **💾 Base de datos**: Almacenada en volumen `sqlite_data/rustico.db`

#### Credenciales de prueba (después del seed)
- Email: `admin@rustico.co`
- Contraseña: `password`
- Rol: Administrador

## Comandos útiles

### Ver estado y logs

```bash
# Ver logs en tiempo real de todos los servicios
docker-compose logs -f

# Ver logs solo del backend
docker-compose logs -f backend

# Ver logs solo del frontend
docker-compose logs -f frontend

# Ver últimas 50 líneas
docker-compose logs --tail=50

# Ver logs con timestamps
docker-compose logs -f --timestamps
```

### Controlar servicios

```bash
# Ver estado de los contenedores
docker-compose ps

# Detener todos los servicios (sin borrar datos)
docker-compose down

# Detener y eliminar volúmenes (borra base de datos)
docker-compose down -v

# Reiniciar un servicio específico
docker-compose restart backend
docker-compose restart frontend

# Parar un servicio
docker-compose stop backend

# Iniciar un servicio parado
docker-compose start backend
```

### Acceder a los contenedores

```bash
# Abrir terminal en el contenedor del backend
docker-compose exec backend sh

# Abrir terminal en el contenedor del frontend
docker-compose exec frontend sh

# Ejecutar comando en el backend sin entrar
docker-compose exec backend npm run seed

# Ver tamaño de la base de datos
docker-compose exec backend ls -lh /app/data/
```

### Mantenimiento

```bash
# Limpiar volúmenes no utilizados
docker volume prune

# Limpiar imágenes no utilizadas
docker image prune

# Reconstruir sin caché (desde cero)
docker-compose build --no-cache

# Verificar la salud del API
curl http://localhost:3002/api/health
```

## Solucionar problemas

### ❌ Error: "Port 80 is already in use"

**Solución**: Edita `infrastructure/docker-compose.yml` línea del frontend:

```yaml
frontend:
  ports:
    - "8082:80"  # Usa 8082 en lugar de 80
```

Entonces accede a: `http://localhost:8082`

### ❌ Error: "Port 3001 is already in use"

**Solución**: En `docker-compose.yml`, cambia:

```yaml
backend:
  ports:
    - "3002:3001"  # Cambia el primer puerto si 3002 esta ocupado
```

### ❌ El backend no inicia o crashea

**Diagnóstico**:
```bash
# Ver logs detallados
docker-compose logs backend

# Verificar que la BD se creó
docker-compose exec backend ls -la /app/data/

# Reconstruir desde cero
docker-compose down -v
docker-compose up --build
```

### ❌ Base de datos corrupta o vacía

```bash
# Opción 1: Eliminar y recrear
docker-compose down -v
docker-compose up --build

# Opción 2: Conectar y regenerar datos manualmente
docker-compose exec backend sqlite3 /app/data/rustico.db
# Dentro de sqlite3:
# .tables  # Ver tablas
# .schema usuarios  # Ver estructura
# SELECT COUNT(*) FROM usuarios;  # Contar registros
```

### ❌ El frontend no se conecta al backend

**Verificar conectividad**:
```bash
# Desde dentro del contenedor del frontend
docker-compose exec frontend curl http://backend:3001/api/health

# Verificar DNS
docker-compose exec frontend nslookup backend
```

### ❌ Error: "ENOSPC: no space left on device"

Problema: Sin espacio en disco

```bash
# Ver espacio disponible
docker system df

# Liberar espacio
docker system prune -a
```

### 📝 Ver variables de entorno en los contenedores

```bash
# Variables del backend
docker-compose exec backend env | grep DATABASE
docker-compose exec backend env | grep JWT

# Variables del frontend  
docker-compose exec frontend env
```

## Arquitectura de la aplicación

```
┌─────────────────────────────────────────────────────┐
│              Docker Compose Network                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────┐         ┌──────────┐               │
│  │ Frontend │         │ Backend  │               │
│  │ Nginx    │◄───────►│ Node.js  │               │
│  │ React    │         │ Express  │               │
│  │ :80      │         │ :3001    │               │
│  └──────────┘         └──────────┘               │
│                              │                     │
│                              ▼                     │
│                       ┌──────────────┐            │
│                       │   SQLite BD  │            │
│                       │ rustico.db   │            │
│                       │ (volumen)    │            │
│                       └──────────────┘            │
│                                                     │
└─────────────────────────────────────────────────────┘

  Host (localhost)
       │
       ├─► http://localhost     (Frontend)
       └─► http://localhost:3002 (Backend API)
```

## Performance y optimización

### Tamaño de la BD
- Base de datos inicial: ~2-5 MB
- Después de 3 meses de datos simulados: ~10-15 MB

### Tiempos de inicio
- Primera ejecución: 3-5 minutos (descarga + build)
- Ejecuciones posteriores: 10-30 segundos

### Memoria
- Backend: ~150-200 MB
- Frontend: ~50-100 MB
- SQLite: <50 MB

## Actualizaciones futuras

Cuando hagas cambios en el código:

```bash
# Opción 1: Reconstruir e iniciar
docker-compose up --build

# Opción 2: Solo reconstruir el backend
docker-compose build backend
docker-compose up

# Opción 3: Si solo cambiaste archivos estáticos del frontend
docker-compose restart frontend
```
