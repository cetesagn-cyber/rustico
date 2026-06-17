# Quick Start - Rustico

## Demo Local

1. Abre XAMPP e inicia MySQL.
2. Ejecuta `start-backend.bat`.
3. Ejecuta `start-portal-administracion.bat`.
4. Ejecuta `start-app-barberos.bat`.

URLs:

- Portal de administracion: http://localhost:5180
- App barberos: http://localhost:5181
- Backend API: http://localhost:3010
- Health: http://localhost:3010/api/health

Credenciales demo:

- Usuario: `admin@rustico.co`
- Clave: `password`

## Comandos Manuales

```bash
cd backend
npm run migrate
npm run dev
```

```bash
cd apps/portal-administracion
npm run dev
```

```bash
cd apps/app-barberos
npm run dev
```

## Docker

```bash
cd infrastructure
docker compose up --build -d
```

- Portal de administracion: http://localhost:8082
- App barberos: http://localhost:8083
- Backend API: http://localhost:3002
