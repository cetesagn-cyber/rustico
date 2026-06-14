# Quick Start - Rustico BarberAdmin

## Demo local con XAMPP

1. Abre XAMPP e inicia MySQL.
2. Ejecuta `start-backend.bat`.
3. Ejecuta `start-frontend.bat`.
4. Entra con `admin@rustico.co` / `password`.

URLs locales:

- Frontend: http://localhost:5180
- Backend API: http://localhost:3010
- Health: http://localhost:3010/api/health

Credenciales de prueba:

- Usuario: `admin@rustico.co`
- Clave: `password`

El backend crea automaticamente la base `rustico_prueba`, las tablas y datos de prueba en MySQL.

## Comandos manuales

```bash
cd backend
npm run migrate
npm run dev
```

```bash
cd frontend
npm run dev
```

## Migracion / publicacion con Docker

```bash
cd infrastructure
docker-compose up --build -d
```

URLs Docker:

- Frontend: http://localhost:8082
- Backend API: http://localhost:3002
- Health: http://localhost:3002/api/health
- MySQL del contenedor: localhost:3308

## Verificacion

```bash
curl http://localhost:3010/api/health
```

Para Docker:

```bash
curl http://localhost:3002/api/health
docker-compose logs -f
```
