# Actualizaciones del Proyecto Rustico

Fecha: 2026-06-10

## Estado actual

El proyecto quedo preparado para demo, migracion Docker y presentacion de una propuesta movil para barberos.

## URLs activas

### Aplicacion principal en Docker

- Frontend: http://localhost:8082
- Backend health: http://localhost:3002/api/health
- MySQL Docker: localhost:3308
- Base de datos: `rustico_prueba`

### Preview app movil barberos

- Prototipo: http://localhost:8092
- Archivo: `preview.html`
- Servidor local: `serve-preview.mjs`

## Cambios de infraestructura

- Docker Desktop fue iniciado y se levantaron los servicios con `docker compose`.
- Se cambiaron los puertos publicados para evitar conflictos:
  - Frontend Docker: `8082`
  - Backend Docker: `3002`
  - MySQL Docker: `3308`
- `docker-compose.yml` fue actualizado con esos puertos.
- Se elimino la propiedad obsoleta `version` del compose.

## Correcciones Docker

### Backend

Archivo modificado: `backend/Dockerfile`

- Se cambio la imagen base de Node 18 a Node 20.
- Se agregaron herramientas necesarias para dependencias nativas:
  - `python3`
  - `make`
  - `g++`
- Se cambio instalacion de produccion a `npm ci --omit=dev`.

### Base de datos

Archivo modificado: `backend/src/shared/database/init.ts`

- Se corrigio la columna `dias_laborales`.
- Antes era `TEXT NOT NULL DEFAULT ...`, lo cual falla en MySQL 8.
- Ahora usa `VARCHAR(50) NOT NULL DEFAULT '[1,2,3,4,5,6]'`.

### Frontend Nginx

Archivo modificado: `frontend/nginx.conf`

- Se corrigio el proxy para preservar rutas `/api`.
- Se agrego `root /usr/share/nginx/html`.
- Se ajusto `try_files` para evitar error 500 en la SPA.

## Documentacion actualizada

Archivos modificados:

- `PUBLICACION.md`
- `LISTO_PARA_PUBLICAR.md`
- `QUICKSTART.md`
- `DEPLOYMENT.md`

Se actualizaron:

- Puertos reales de Docker.
- URLs de acceso.
- Pasos de demo.
- Pasos de migracion.
- Checklist de publicacion.

## Prototipo movil para barberos

Archivo principal: `preview.html`

Se creo una muestra visual tipo app movil/PWA para barberos con:

- Login de barbero.
- Agenda del dia.
- Nueva cita.
- Clientes.
- Perfil del barbero.
- Accion simulada de WhatsApp.
- Navegacion inferior movil.
- Boton rapido para crear cita.

### Login demo

Credenciales visuales usadas en el prototipo:

- Usuario: `juan@rustico.co`
- Clave: `password`

El login es una simulacion visual. Todavia no autentica contra el backend real.

### Paleta visual

El prototipo fue ajustado para usar la misma linea visual del menu de administracion:

- Azul principal: `#2A5080`
- Azul oscuro: `#1E3354`
- Cobre: `#D4921A`
- Fondo claro: `#F4F5F8`
- Superficie: `#FFFFFF`
- Texto: `#1A2440`

### Logo

Se cambio el prototipo para usar el mismo logo del menu de administracion:

- `frontend/public/logo-nuevo-2.png`

## Importacion de clientes al CRM

Archivo Excel cargado:

- `Rustico/BASE DE DATOS CLIENTES.xlsx`
- Nombre ordenado actual: `Rustico/base-datos-clientes.xlsx`

Base destino:

- MySQL Docker
- Host: `localhost`
- Puerto: `3308`
- Base: `rustico_prueba`
- Tabla: `clientes`

Resultado de importacion:

- Filas Excel: `1621`
- Clientes validos detectados: `1608`
- Clientes creados: `1576`
- Clientes actualizados: `32`
- Filas omitidas: `13`
- Total actual en CRM: `1596`

## Importador creado

Archivo creado:

- `backend/scripts/import-clientes-xlsx.mjs`

Funcion:

- Lee el archivo `.xlsx` sin dependencias externas.
- Extrae clientes de la hoja principal.
- Mapea columnas a CRM:
  - Nombre cliente -> `nombre`
  - Celular -> `telefono`
  - Correo -> `email`
  - Nuevo/incluido -> `segmento`
  - Barbero, cumpleanos, primer contacto, recomendado por, comentarios y columnas extra -> `notas_privadas`
- Evita duplicados por telefono o email.
- Si existe, actualiza.
- Si no existe, crea.

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

## Verificaciones realizadas

- Frontend Docker responde en `http://localhost:8082`.
- Backend Docker responde en `http://localhost:3002/api/health`.
- MySQL Docker esta healthy en puerto `3308`.
- Preview movil responde en `http://localhost:8092`.
- Clientes importados verificados en tabla `clientes`.

## Recomendacion siguiente

La mejor ruta para la app de barberos es construirla como PWA dentro del frontend actual:

- `/barbero/login`
- `/barbero/agenda`
- `/barbero/nueva-cita`
- `/barbero/clientes`
- `/barbero/perfil`

Luego se conecta al backend real usando JWT y permisos por rol `barbero`.
