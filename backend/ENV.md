# Rustico BarberAdmin - Configuracion de entorno

El backend actual usa PostgreSQL mediante `DATABASE_URL`.

## Desarrollo local

Crea `backend/.env` con valores equivalentes a estos:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/rustico
JWT_SECRET=cambia-esto-por-un-secreto-seguro-de-al-menos-32-caracteres
JWT_EXPIRY=8h
REFRESH_TOKEN_EXPIRY=30d
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## Publicacion con Docker Compose

Desde `infrastructure/`, crea un archivo `.env` basado en `.env.example`:

```env
POSTGRES_PASSWORD=cambia-esta-contrasena
JWT_SECRET=cambia-esto-por-un-secreto-seguro-de-al-menos-32-caracteres
FRONTEND_URL=https://tu-dominio-admin.com,https://tu-dominio-barberos.com
```

Luego ejecuta:

```bash
docker compose up -d --build
```

## Scripts disponibles

- `npm run dev` - Inicia en modo desarrollo con nodemon.
- `npm run build` - Compila TypeScript a JavaScript.
- `npm start` - Ejecuta la version compilada.
- `npm run migrate` - Aplica migraciones.
- `npm run seed` - Verifica datos de prueba sin duplicarlos si ya existen.

## Variables importantes

| Variable | Descripcion | Ejemplo |
|----------|-------------|---------|
| DATABASE_URL | Conexion PostgreSQL usada por el backend | postgresql://usuario:password@host:5432/rustico |
| JWT_SECRET | Clave para firmar tokens JWT, minimo 32 caracteres | secreto-largo-generado |
| JWT_EXPIRY | Duracion del token JWT | 8h |
| REFRESH_TOKEN_EXPIRY | Duracion documentada para refresh tokens | 30d |
| PORT | Puerto interno del backend | 3001 |
| NODE_ENV | Entorno | production |
| FRONTEND_URL | Origenes permitidos para CORS, separados por coma | https://admin.example.com |
