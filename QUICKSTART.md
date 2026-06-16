# Quick Start - Rustico BarberAdmin

## Demo local con XAMPP

1. Abre XAMPP e inicia MySQL.
2. Ejecuta `start-backend.bat`.
3. Ejecuta `start-administracion.bat`.
4. Ejecuta `start-app-pwa.bat` si vas a revisar la app de barberos.
5. Entra con `admin@rustico.co` / `password`.

URLs locales:

- Administracion: http://localhost:5180
- App PWA barberos: http://localhost:5181
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
cd apps/administracion
npm run dev
```

```bash
cd apps/app-pwa
npm run dev
```

## Migracion / publicacion con Docker

```bash
cd infrastructure
docker-compose up --build -d
```

URLs Docker:

- Administracion: http://localhost:8082
- App PWA barberos: http://localhost:8083
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
