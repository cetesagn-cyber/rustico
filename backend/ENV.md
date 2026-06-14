# Rustico BarberAdmin - Configuracion de Desarrollo

Anade estas variables de entorno en `backend/.env` para probar con MySQL de XAMPP:

```env
# Base de datos - MySQL / XAMPP
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=rustico_prueba

# Seguridad JWT
JWT_SECRET=rustico-jwt-secret-change-in-production-min-32chars
JWT_EXPIRY=8h
REFRESH_TOKEN_EXPIRY=30d

# Servidor
PORT=3003
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:5175
```

Antes de iniciar el backend, abre el panel de XAMPP y enciende MySQL. El backend crea la base `rustico_prueba`, las tablas y datos de prueba automaticamente en la primera ejecucion.

## Scripts disponibles

- `npm run dev` - Inicia en modo desarrollo con nodemon
- `npm run build` - Compila TypeScript a JavaScript
- `npm start` - Ejecuta la version compilada
- `npm run migrate` - Crea/verifica esquema MySQL y datos iniciales
- `npm run seed` - Verifica datos de prueba sin duplicarlos si ya existen

## Variables importantes

| Variable | Descripcion | Ejemplo |
|----------|-------------|---------|
| DB_HOST | Host de MySQL/XAMPP | localhost |
| DB_PORT | Puerto de MySQL | 3306 |
| DB_USER | Usuario de MySQL | root |
| DB_PASSWORD | Contrasena de MySQL | vacio en XAMPP local |
| DB_NAME | Base de datos de prueba | rustico_prueba |
| JWT_SECRET | Clave para firmar tokens JWT, minimo 32 caracteres | rustico-... |
| NODE_ENV | Entorno | development |
| FRONTEND_URL | URL del frontend para CORS | http://localhost:5175 |
