# Checklist de Publicacion - Rustico BarberAdmin

## Estado actual

- Backend Node/TypeScript compilando correctamente.
- Administracion React/Vite y app PWA compilando correctamente.
- Base de datos local configurada para MySQL/XAMPP.
- Seed de prueba probado en `rustico_prueba`.
- Credenciales de prueba: `admin@rustico.co` / `password`.

## Exposicion de hoy con XAMPP

1. Iniciar MySQL desde el panel de XAMPP.
2. Revisar `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=rustico_prueba
PORT=3010
NODE_ENV=development
FRONTEND_URL=http://localhost:5180,http://127.0.0.1:5180,http://localhost:5181,http://127.0.0.1:5181,http://192.168.0.9:5180,http://192.168.0.9:5181
```

3. Preparar base y datos:

```bash
cd backend
npm run migrate
```

4. Iniciar servicios:

```bash
start-backend.bat
start-administracion.bat
start-app-pwa.bat
```

URLs:

- Administracion: http://localhost:5180
- App PWA barberos: http://localhost:5181
- Backend API: http://localhost:3010
- Health: http://localhost:3010/api/health

Credenciales para mostrar:

- Usuario: `admin@rustico.co`
- Clave: `password`

## Guion corto para exponer

1. Abrir Dashboard y mostrar KPIs del dia.
2. Ir a Agenda, crear o editar una cita y confirmar que aparece en la vista semanal.
3. Abrir Clientes y mostrar historial/segmentacion.
4. Abrir Catalogo para precios, productos y combos.
5. Abrir Financiero y Estadisticas para cierre, comisiones y graficas.
6. Cerrar con WhatsApp/confirmacion publica si el backend esta corriendo.

## Datos de prueba verificados

La preparacion de MySQL crea tablas y seed automatico. Conteos verificados:

- usuarios: 6
- barberos: 5
- tipo_servicios: 27
- clientes: 20
- agenda: 2329
- comisiones: 1911
- gastos: 15

## Migracion / Docker

Docker usa un MySQL propio en contenedor:

```bash
cd infrastructure
docker-compose up --build -d
```

URLs Docker:

- Administracion: http://localhost:8082
- App PWA barberos: http://localhost:8083
- Backend API: http://localhost:3002
- Health: http://localhost:3002/api/health
- MySQL: localhost:3308

## Verificaciones

```bash
cd backend
npm run build
npm run migrate
```

```bash
cd apps/administracion
npm run build
```

```bash
cd apps/app-pwa
npm run build
```

## Pendiente antes de produccion

- Cambiar `JWT_SECRET`.
- Definir dominio real en `FRONTEND_URL`.
- Usar usuario MySQL con contrasena fuerte.
- Habilitar HTTPS.
- Revisar credenciales del seed antes de publicar.
