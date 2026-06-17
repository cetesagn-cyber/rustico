# Rustico BarberAdmin

Sistema de gestion para Rustico Barber & Concept Shop.

Este repositorio esta organizado para mostrar dos experiencias separadas al cliente:

| Producto | Carpeta | Uso | URL local |
|---|---|---|---|
| Portal de administracion | `apps/portal-administracion` | Recepcion, administracion, agenda, clientes, catalogo, finanzas, estadisticas y WhatsApp | http://localhost:5180 |
| App barberos | `apps/app-barberos` | Agenda diaria, clientes y perfil del barbero desde celular | http://localhost:5181 |
| API backend | `backend` | Autenticacion, datos, reglas de negocio y servicios compartidos | http://localhost:3010 |

## Estructura

```text
Rustico/
├── apps/
│   ├── portal-administracion/   # Portal interno para administracion y recepcion
│   └── app-barberos/            # App instalable para barberos
├── backend/                     # API Node/TypeScript
├── database/                    # Migraciones y datos semilla
├── infrastructure/              # Docker Compose
├── assets/                      # Fotos y material visual
├── docs/                        # Documentacion historica, seguridad y prototipos
├── start-backend.bat
├── start-portal-administracion.bat
└── start-app-barberos.bat
```

## Demo Local

1. Abrir XAMPP e iniciar MySQL.
2. Ejecutar `start-backend.bat`.
3. Ejecutar `start-portal-administracion.bat`.
4. Ejecutar `start-app-barberos.bat`.

Credenciales demo:

| Campo | Valor |
|---|---|
| Usuario | `admin@rustico.co` |
| Clave | `password` |

## Recorrido Para Cliente

1. Portal de administracion: abrir Dashboard y mostrar KPIs del dia.
2. Agenda: crear o editar una cita y cambiar estado.
3. Clientes: revisar historial y segmentacion.
4. Catalogo: servicios, productos y combos.
5. Financiero y estadisticas: cierres, comisiones y graficas.
6. App barberos: entrar como barbero y revisar agenda desde vista movil.

## Comandos Manuales

Backend:

```bash
cd backend
npm run migrate
npm run dev
```

Portal de administracion:

```bash
cd apps/portal-administracion
npm run dev
npm run build
```

App barberos:

```bash
cd apps/app-barberos
npm run dev
npm run build
```

## Docker

```bash
cd infrastructure
docker compose up --build -d
```

URLs Docker:

| Servicio | URL |
|---|---|
| Portal de administracion | http://localhost:8082 |
| App barberos | http://localhost:8083 |
| Backend API | http://localhost:3002 |
| Health API | http://localhost:3002/api/health |

## Estado

- Portal de administracion: React + Vite + TypeScript.
- App barberos: React + Vite + TypeScript + PWA.
- Backend: Node.js + Express + TypeScript.
- Base de datos local: MySQL/XAMPP para demo.

Antes de publicar en produccion real:

- Cambiar `JWT_SECRET`.
- Definir dominios finales en `FRONTEND_URL`.
- Usar usuario MySQL con contrasena fuerte.
- Habilitar HTTPS.
- Cambiar o retirar credenciales demo.
