# Publicacion / Demo - Rustico

## Estructura Publicable

- `apps/portal-administracion`: portal interno para administracion y recepcion.
- `apps/app-barberos`: app movil/PWA para barberos.
- `backend`: API y reglas de negocio.
- `database`: migraciones y seed.
- `infrastructure`: Docker Compose.

## Variables De Demo

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=rustico_prueba
PORT=3010
NODE_ENV=development
FRONTEND_URL=http://localhost:5180,http://127.0.0.1:5180,http://localhost:5181,http://127.0.0.1:5181
```

## Arranque

```bash
start-backend.bat
start-portal-administracion.bat
start-app-barberos.bat
```

URLs:

- Portal de administracion: http://localhost:5180
- App barberos: http://localhost:5181
- Backend API: http://localhost:3010
- Health: http://localhost:3010/api/health

Credenciales:

- Usuario: `admin@rustico.co`
- Clave: `password`

## Verificaciones

```bash
cd backend
npm run build
npm run migrate
```

```bash
cd apps/portal-administracion
npm run build
```

```bash
cd apps/app-barberos
npm run build
```

## Docker

```bash
cd infrastructure
docker compose up --build -d
```

- Portal de administracion: http://localhost:8082
- App barberos: http://localhost:8083
- Backend API: http://localhost:3002
