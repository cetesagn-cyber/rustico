# Proyecto Rustico BarberAdmin

Documento maestro del proyecto.

Fecha: 2026-06-10

## Resumen

Rustico BarberAdmin es un sistema de gestion para Rustico Barber & Concept Shop. Centraliza agenda, CRM de clientes, barberos, catalogo, finanzas, estadisticas, WhatsApp y una propuesta de app movil/PWA para que cada barbero pueda gestionar sus citas desde el celular.

## Objetivo del sistema

- Organizar la operacion diaria de la barberia.
- Controlar agenda y disponibilidad de barberos.
- Gestionar clientes y su historial.
- Administrar servicios, productos y combos.
- Calcular comisiones y apoyar cierres financieros.
- Medir estadisticas de ventas, citas y comportamiento de clientes.
- Facilitar confirmaciones por WhatsApp.
- Crear una experiencia movil para barberos.

## Estado actual

El proyecto esta funcional en Docker con MySQL y cuenta con un prototipo movil publicado localmente.

### URLs activas

- Aplicacion principal: http://localhost:8082
- Backend API health: http://localhost:3002/api/health
- MySQL Docker: localhost:3308
- Preview app movil barberos: http://localhost:8092

### Credenciales demo

- Usuario: `admin@rustico.co`
- Clave: `password`

## Stack tecnico

### Frontend

- React 18
- Vite
- TypeScript
- React Router DOM
- Zustand
- Recharts
- Lucide React

### Backend

- Node.js
- Express
- TypeScript
- MySQL con `mysql2`
- JWT
- bcryptjs
- Helmet
- CORS
- Rate limiting
- Morgan
- node-cron
- whatsapp-web.js

### Infraestructura

- Docker Compose
- MySQL 8.4
- Nginx para servir SPA
- Backend Node en contenedor

## Estructura general

```text
Rustico/
├── backend/
│   ├── src/
│   │   ├── app.ts
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── agenda/
│   │   │   ├── clientes/
│   │   │   ├── barberos/
│   │   │   ├── servicios/
│   │   │   ├── productos/
│   │   │   ├── combos/
│   │   │   ├── financiero/
│   │   │   ├── estadisticas/
│   │   │   ├── adelantos/
│   │   │   └── whatsapp/
│   │   └── shared/
│   │       ├── database/
│   │       ├── middlewares/
│   │       └── jobs/
│   ├── scripts/
│   │   └── import-clientes-xlsx.mjs
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── api/
│   │   └── store/
│   ├── public/
│   ├── nginx.conf
│   └── Dockerfile
├── infrastructure/
│   └── docker-compose.yml
├── database/
│   ├── migrations/
│   └── seeds/
├── preview.html
├── serve-preview.mjs
├── PUBLICACION.md
├── LISTO_PARA_PUBLICAR.md
├── QUICKSTART.md
├── DEPLOYMENT.md
├── ACTUALIZACIONES_PROYECTO.md
└── PROYECTO_RUSTICO.md
```

## Modulos implementados

### Dashboard

Vista inicial con indicadores operativos:

- KPIs del dia.
- Citas proximas.
- Ingresos.
- Resumen de actividad.

### Agenda

Gestion de citas:

- Crear citas.
- Editar citas.
- Cambiar estados.
- Confirmar citas.
- Vista semanal.
- Recordatorios.
- Integracion con clientes, servicios y barberos.

Estados usados:

- `pendiente`
- `confirmada`
- `completada`
- `cancelada`
- `no_show`

### Clientes / CRM

CRM para gestionar clientes:

- Nombre.
- Telefono.
- Email.
- Notas privadas.
- Segmentacion.
- Historial de citas.
- Total de visitas.
- Ticket promedio.
- Ultimo servicio.
- Barbero preferido.

Segmentos:

- `nuevo`
- `frecuente`
- `vip`
- `en_riesgo`
- `inactivo`

### Barberos

Modulo para administracion de barberos:

- Crear/editar barberos.
- Activar/desactivar.
- Horario.
- Dias laborales.
- Color de agenda.
- Porcentaje de comision.
- Estado WhatsApp.

### Catalogo

Gestion de:

- Servicios.
- Productos.
- Combos.
- Precios.
- Duracion de servicios.
- Categorias.

### Financiero

Gestion de operacion financiera:

- Cierres.
- Comisiones.
- Pagos.
- Gastos.
- Adelantos.

### Estadisticas

Graficas y metricas:

- Ingresos.
- Citas.
- Horas pico.
- Segmentos de clientes.
- Rendimiento por barbero.

### WhatsApp

Modulo para comunicacion:

- Estado de conexion.
- Envio de mensajes.
- Confirmaciones.
- Recordatorios.

## Base de datos

Motor actual en Docker:

- MySQL 8.4
- Base: `rustico_prueba`
- Puerto publicado: `3308`

Tablas principales:

- `usuarios`
- `barberos`
- `tipo_servicios`
- `clientes`
- `agenda`
- `comisiones`
- `productos`
- `combos`
- `combo_items`
- `gastos`
- `adelantos`

## Clientes importados

Se importo el archivo:

```text
Rustico/BASE DE DATOS CLIENTES.xlsx
```

Nombre ordenado actual:

```text
Rustico/base-datos-clientes.xlsx
```

Resultado:

- Filas Excel: `1621`
- Clientes validos detectados: `1608`
- Clientes creados: `1576`
- Clientes actualizados: `32`
- Filas omitidas: `13`
- Total actual en CRM: `1596`

El importador creado esta en:

```text
backend/scripts/import-clientes-xlsx.mjs
```

Modo simulacion:

```bash
cd backend
node scripts/import-clientes-xlsx.mjs "..\Rustico\base-datos-clientes.xlsx" --dry-run
```

Importacion real:

```bash
cd backend
node scripts/import-clientes-xlsx.mjs "..\Rustico\base-datos-clientes.xlsx"
```

## Autenticacion

El backend usa autenticacion por JWT.

Flujo general:

```text
Login
  -> Validar credenciales
  -> Validar usuario activo
  -> Emitir JWT
  -> Guardar token en frontend
  -> Enviar Authorization: Bearer <token>
  -> Proteger rutas por rol
```

Roles:

- `admin`
- `barbero`
- `recepcion`

Reglas recomendadas para la app movil:

- Solo usuarios activos pueden ingresar.
- El rol `barbero` solo debe ver sus propias citas.
- El backend debe deducir el `barbero_id` desde el token.
- El frontend movil no debe poder forzar citas a nombre de otro barbero.

## App movil para barberos

Se creo un prototipo visual publicado en:

```text
http://localhost:8092
```

Archivo:

```text
preview.html
```

Servidor:

```text
serve-preview.mjs
```

### Concepto

La app movil de barberos se recomienda como PWA:

- Es una pagina web instalable en celular.
- No requiere Play Store ni App Store inicialmente.
- Usa el mismo backend.
- Permite actualizaciones rapidas.
- Cada barbero entra con su usuario.

### Pantallas del prototipo

- Login.
- Agenda de hoy.
- Nueva cita.
- Clientes.
- Perfil.

### Login demo del prototipo

- Usuario: `juan@rustico.co`
- Clave: `password`

El login del preview es visual. La version real deberia consumir el endpoint de autenticacion del backend.

### Paleta visual del prototipo

Se ajusto para usar la misma linea del menu de administracion:

- Azul principal: `#2A5080`
- Azul oscuro: `#1E3354`
- Azul suave: `#A8C0D8`
- Cobre: `#D4921A`
- Fondo: `#F4F5F8`
- Superficie: `#FFFFFF`
- Bordes: `#C2CAD8`
- Texto: `#1A2440`

### Logo

El prototipo usa el mismo logo del menu de administracion:

```text
frontend/public/logo-nuevo-2.png
```

## Configuracion Docker actual

Archivo:

```text
infrastructure/docker-compose.yml
```

Servicios:

- `mysql`
- `backend`
- `frontend`

Puertos publicados:

- MySQL: `3308:3306`
- Backend: `3002:3001`
- Frontend: `8082:80`

Variables principales del backend Docker:

```env
DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=rustico_prueba
PORT=3001
NODE_ENV=production
FRONTEND_URL=http://localhost:8082
JWT_EXPIRY=8h
```

## Como iniciar el proyecto

### Docker

```bash
cd infrastructure
docker compose up -d
```

Ver estado:

```bash
docker compose ps
```

Ver logs:

```bash
docker compose logs -f
```

Detener:

```bash
docker compose down
```

### Desarrollo local con XAMPP

1. Abrir XAMPP.
2. Iniciar MySQL.
3. Ejecutar `start-backend.bat`.
4. Ejecutar `start-frontend.bat`.

URLs locales de desarrollo:

- Frontend: http://localhost:5180
- Backend: http://localhost:3010
- Health: http://localhost:3010/api/health

## Comandos de verificacion

Backend:

```bash
cd backend
npm run build
```

Frontend:

```bash
cd frontend
npm run build
```

Docker:

```bash
cd infrastructure
docker compose config
docker compose ps
```

Health:

```bash
curl http://localhost:3002/api/health
```

## Correcciones tecnicas recientes

### Backend Docker

Archivo:

```text
backend/Dockerfile
```

Cambios:

- Node 20.
- Instalacion de `python3`, `make`, `g++`.
- `npm ci --omit=dev`.

Motivo:

- `better-sqlite3` y dependencias nativas fallaban con Node 18 Alpine sin herramientas de compilacion.

### MySQL 8

Archivo:

```text
backend/src/shared/database/init.ts
```

Cambio:

- `dias_laborales` paso de `TEXT` a `VARCHAR(50)`.

Motivo:

- MySQL 8 no permite `DEFAULT` en columnas `TEXT`.

### Nginx SPA

Archivo:

```text
frontend/nginx.conf
```

Cambios:

- `root /usr/share/nginx/html`.
- `try_files $uri /index.html`.
- Proxy `/api/` preservando rutas.

Motivo:

- Evitar error 500 y ciclo interno al cargar `/`.
- Permitir que `/api/v1/...` llegue correctamente al backend.

## Seguridad pendiente para produccion

Antes de publicar en produccion real:

- Cambiar `JWT_SECRET`.
- Crear usuario MySQL con contrasena fuerte.
- No usar root sin contrasena.
- Definir dominio real en `FRONTEND_URL`.
- Habilitar HTTPS.
- Revisar credenciales demo del seed.
- Controlar CORS por dominio final.
- Hacer backup de base de datos.
- Definir estrategia de restauracion.

## Roadmap recomendado

### Fase 1

- Consolidar demo principal en Docker.
- Validar todos los modulos con clientes importados.
- Revisar busqueda y rendimiento del CRM con 1500+ clientes.

### Fase 2

- Convertir el prototipo movil en rutas reales del frontend:
  - `/barbero/login`
  - `/barbero/agenda`
  - `/barbero/nueva-cita`
  - `/barbero/clientes`
  - `/barbero/perfil`

### Fase 3

- Conectar app movil al backend real.
- Proteger agenda por usuario/rol.
- Permitir que cada barbero cree citas solo para si mismo.
- Generar mensaje de WhatsApp desde cita creada.

### Fase 4

- Convertir app movil en PWA instalable.
- Agregar manifest.
- Agregar iconos.
- Agregar service worker basico.
- Probar en Android.

### Fase 5

- Evaluar app nativa con React Native/Expo si se necesitan:
  - Notificaciones push avanzadas.
  - Acceso a contactos del celular.
  - Publicacion en tiendas.
  - Mejor modo offline.

## Archivos clave

- `README.md`: descripcion general original.
- `PUBLICACION.md`: checklist de publicacion.
- `LISTO_PARA_PUBLICAR.md`: resumen operativo para demo/migracion.
- `QUICKSTART.md`: guia rapida.
- `DEPLOYMENT.md`: guia de despliegue.
- `ACTUALIZACIONES_PROYECTO.md`: cambios recientes.
- `PROYECTO_RUSTICO.md`: documento maestro.
- `preview.html`: prototipo movil.
- `serve-preview.mjs`: servidor del prototipo.
- `backend/scripts/import-clientes-xlsx.mjs`: importador de clientes.
- `infrastructure/docker-compose.yml`: infraestructura Docker.

## Estado final

El proyecto esta listo para:

- Presentar la aplicacion principal.
- Mostrar el CRM cargado con clientes reales.
- Mostrar el concepto movil para barberos.
- Continuar hacia una PWA conectada al backend.
