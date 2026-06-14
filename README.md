<div align="center">

<br/>

<img src="frontend/public/logo-rustico.png" alt="Rústico Barber & Concept Shop" width="480"/>

<br/><br/>

*Sistema de Gestión Integral · Bogotá, Colombia · Est. 2018*

<br/>

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://www.sqlite.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React_18_+_Vite-SPA-61DAFB?style=flat-square&logo=react&logoColor=black)](https://vitejs.dev)

[![Estado](https://img.shields.io/badge/Estado-v0.1.0_MVP-4A7050?style=flat-square&labelColor=1a2e22)](.)
[![Instagram](https://img.shields.io/badge/Instagram-rusticobarbershop__official-E4405F?style=flat-square&logo=instagram&logoColor=white)](https://instagram.com/rusticobarbershop_official)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-%2B57_313_3930398-25D366?style=flat-square&logo=whatsapp&logoColor=white)](https://wa.me/573133930398)

</div>

---

## Visión General

**Rústico BarberAdmin** es el panel de administración propio de [Rústico Barber & Concept Shop](https://instagram.com/rusticobarbershop_official). Centraliza agenda, CRM de clientes, catálogo de servicios y productos, combos con descuentos, comisiones de barberos, financiero y estadísticas — todo en un solo sistema sin dependencias externas de pago.

> Desarrollado específicamente para operaciones en Colombia: formato de moneda COP, zona horaria `America/Bogota`, confirmaciones vía WhatsApp sin API externa.

---

## Módulos Implementados

| # | Módulo | Estado |
|:---:|---|:---:|
| 1 | **Dashboard** — KPIs del día, citas próximas, ingresos | ✅ Listo |
| 2 | **Agenda** — CRUD de citas, vista semanal, confirmación WA, recordatorios automáticos | ✅ Listo |
| 3 | **Clientes** — CRM con historial, segmentación automática, búsqueda paginada | ✅ Listo |
| 4 | **Barberos** — CRUD completo, activar/desactivar, comisiones, color de agenda | ✅ Listo |
| 5 | **Catálogo** — Servicios (precio editable inline), Productos, Combos con descuentos | ✅ Listo |
| 6 | **Financiero** — Cierres diarios, registro de comisiones, historial de pagos | ✅ Listo |
| 7 | **Estadísticas** — Gráficas recharts: ingresos, citas, horas pico, segmentos, barberos | ✅ Listo |
| 8 | **Confirmar cita** — Página pública `/c/:token` para que el cliente confirme su cita | ✅ Listo |

---

## Stack Tecnológico

### Backend
| Paquete | Versión | Uso |
|---|---|---|
| Express | 4.x | Servidor HTTP / API REST |
| TypeScript | 5.x | Tipado estático |
| better-sqlite3 | 12.x | Base de datos SQLite (síncrona, sin servidor) |
| jsonwebtoken | 9.x | Autenticación JWT |
| bcryptjs | 2.x | Hash de contraseñas |
| node-cron | 4.x | Cron job de recordatorios (cada 5 min) |
| uuid | 9.x | Generación de IDs y tokens de confirmación |
| morgan | 1.x | Logging de requests |

### Frontend
| Paquete | Versión | Uso |
|---|---|---|
| React | 18.x | UI declarativa |
| Vite | 5.x | Build tool y dev server |
| TypeScript | 5.x | Tipado estático |
| React Router DOM | 6.x | Enrutamiento SPA |
| Zustand | 4.x | Estado global (auth) |
| recharts | 3.x | Gráficas (Area, Bar, Pie, Composed) |
| lucide-react | 0.368 | Iconografía |

---

## Estructura del Proyecto

```
Rustico/
├── backend/
│   └── src/
│       ├── app.ts                          # Entry point, registro de rutas
│       ├── modules/
│       │   ├── auth/                       # JWT login, verificación de token
│       │   ├── agenda/                     # Citas, confirmación por token, recordatorios
│       │   ├── barberos/                   # CRUD barberos + toggle activo
│       │   ├── clientes/                   # CRM + historial de servicios
│       │   ├── combos/                     # Combos de servicios y productos
│       │   ├── financiero/                 # Cierres diarios y comisiones
│       │   ├── productos/                  # CRUD productos del catálogo
│       │   ├── servicios/                  # CRUD tipo_servicios + toggle activo
│       │   └── estadisticas/               # Agregaciones para gráficas
│       └── shared/
│           ├── database/
│           │   ├── schema.sql              # DDL completo (9 tablas)
│           │   ├── init.ts                 # initDatabase() + seed inicial
│           │   └── sqlite.client.ts        # Instancia db + helper uuidv4
│           ├── jobs/
│           │   └── recordatorios.job.ts    # Cron: marca citas 3h antes
│           └── middlewares/
│               └── error.handler.ts
│
├── frontend/
│   └── src/
│       ├── api/
│       │   └── client.ts                   # Wrapper fetch (get/post/put/patch/delete)
│       ├── components/
│       │   ├── Layout.tsx                  # Shell con sidebar
│       │   ├── Sidebar.tsx                 # Navegación lateral (paleta Marble & Sage)
│       │   └── ProtectedRoute.tsx
│       ├── pages/
│       │   ├── Login.tsx
│       │   ├── Dashboard.tsx
│       │   ├── Agenda.tsx                  # Vista semanal + banner recordatorios WA
│       │   ├── Clientes.tsx
│       │   ├── Barberos.tsx
│       │   ├── Catalogo.tsx                # Tabs: Servicios | Productos | Combos
│       │   ├── Financiero.tsx
│       │   ├── Estadisticas.tsx            # Gráficas recharts
│       │   └── Confirmar.tsx               # Página pública /c/:token
│       ├── store/
│       │   └── auth.store.ts               # Zustand: usuario, token, login/logout
│       ├── App.tsx                         # Router con rutas protegidas
│       └── index.css                       # Variables CSS — paleta Marble & Sage
│
└── README.md
```

---

## Base de Datos

SQLite se crea automáticamente en `backend/rustico.db` al arrancar por primera vez. No requiere instalación ni configuración adicional.

### Tablas

| Tabla | Descripción |
|---|---|
| `usuarios` | Cuentas del sistema — roles: `admin`, `barbero`, `recepcion` |
| `barberos` | Perfil del barbero: comisión, color de agenda, horario, días laborales |
| `tipo_servicios` | Catálogo de servicios: nombre, duración, precio, categoría |
| `productos` | Catálogo de productos de venta: nombre, precio, categoría |
| `combos` | Paquetes combinados con precio especial |
| `combo_items` | Ítems de cada combo (servicio o producto + cantidad) |
| `clientes` | CRM: datos, segmento, estadísticas de visitas |
| `agenda` | Citas: barbero, servicio, estado, token de confirmación |
| `comisiones` | Comisiones por cita (pendiente / pagada) |

### Seed automático (primera ejecución)

Al correr por primera vez se cargan automáticamente:
- **3 barberos**: Carlos Medina, Juan Morales, Andrés Torres
- **6 servicios**: Corte clásico, Corte + Barba, Afeitado clásico, Corte niño, Hidratación capilar, Diseño de barba
- **3 clientes**: Ricardo Vargas (VIP), Diego Bermúdez (frecuente), Mateo Castillo (nuevo)
- **6 citas** para el día actual con distintos estados

---

## Instalación y Arranque

### Requisitos
- Node.js v18 o superior
- npm v9 o superior

### Pasos

```bash
# 1. Instalar dependencias del backend
cd backend
npm install

# 2. Crear archivo de variables de entorno
copy .env.example .env   # Windows
cp .env.example .env     # macOS/Linux

# 3. Arrancar el backend (puerto 3001)
npm run dev

# ─── en otra terminal ───────────────────────────────────

# 4. Instalar dependencias del frontend
cd frontend
npm install

# 5. Arrancar el frontend (puerto 5173)
npm run dev
```

Abrir `http://localhost:5173` en el navegador.

### Credenciales de acceso (seed)

| Campo | Valor |
|---|---|
| Email | `admin@rustico.co` |
| Contraseña | `password` |

---

## Variables de Entorno

Archivo: `backend/.env`

```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

JWT_SECRET=rustico-jwt-secret-cambia-en-produccion
JWT_EXPIRES_IN=8h
```

> En producción cambia `JWT_SECRET` por una cadena aleatoria de al menos 32 caracteres.

---

## API Reference

Base URL: `http://localhost:3001/api/v1`

Todos los endpoints excepto `/auth/login` y `/agenda/confirmar/:token` requieren header `Authorization: Bearer <token>`.

### Auth
| Método | Ruta | Descripción |
|:---:|---|---|
| `POST` | `/auth/login` | Obtener JWT |
| `GET` | `/auth/perfil` | Datos del usuario autenticado |

### Agenda
| Método | Ruta | Descripción |
|:---:|---|---|
| `GET` | `/agenda?fecha=YYYY-MM-DD` | Citas del día |
| `POST` | `/agenda` | Crear cita |
| `PUT` | `/agenda/:id` | Editar cita |
| `PATCH` | `/agenda/:id/estado` | Cambiar estado |
| `GET` | `/agenda/confirmar/:token` | Ver cita por token (público) |
| `PATCH` | `/agenda/confirmar/:token` | Confirmar cita por token (público) |
| `GET` | `/agenda/recordatorios-pendientes` | Citas listas para recordatorio WA |
| `PATCH` | `/agenda/:id/recordatorio-enviado` | Marcar recordatorio como enviado |

### Clientes
| Método | Ruta | Descripción |
|:---:|---|---|
| `GET` | `/clientes?q=busqueda&page=1` | Listar con búsqueda y paginación |
| `GET` | `/clientes/:id` | Detalle + historial de citas |
| `POST` | `/clientes` | Crear cliente |

### Barberos
| Método | Ruta | Descripción |
|:---:|---|---|
| `GET` | `/barberos` | Listar barberos activos |
| `POST` | `/barberos` | Crear barbero + usuario |
| `PUT` | `/barberos/:id` | Editar barbero |
| `PATCH` | `/barberos/:id/activo` | Activar / desactivar |
| `DELETE` | `/barberos/:id` | Eliminar (bloquea si tiene citas activas) |

### Catálogo
| Método | Ruta | Descripción |
|:---:|---|---|
| `GET` | `/servicios?todos=1` | Listar servicios |
| `POST` | `/servicios` | Crear servicio |
| `PUT` | `/servicios/:id` | Editar (incluye precio) |
| `PATCH` | `/servicios/:id/activo` | Activar / desactivar |
| `GET` | `/productos?todos=1` | Listar productos |
| `POST` | `/productos` | Crear producto |
| `PUT` | `/productos/:id` | Editar producto |
| `PATCH` | `/productos/:id/activo` | Activar / desactivar |
| `GET` | `/combos` | Listar combos con ítems |
| `POST` | `/combos` | Crear combo con ítems |
| `PUT` | `/combos/:id` | Editar combo y sus ítems |
| `PATCH` | `/combos/:id/activo` | Activar / desactivar |

### Financiero y Estadísticas
| Método | Ruta | Descripción |
|:---:|---|---|
| `GET` | `/financiero/resumen?fecha=YYYY-MM-DD` | Resumen del día |
| `GET` | `/financiero/comisiones` | Comisiones pendientes de pago |
| `PATCH` | `/financiero/comisiones/pagar` | Marcar comisiones como pagadas |
| `GET` | `/estadisticas/evolucion?meses=6` | Tendencia mensual de ingresos y citas |
| `GET` | `/estadisticas/operaciones?meses=6` | Horas pico, días, segmentos, top servicios |

---

## Flujo de Confirmación por WhatsApp

El sistema no requiere ninguna API externa de WhatsApp. Funciona con **links `wa.me`**:

1. Al crear una cita se genera automáticamente un `token_confirmacion` (hex de 16 chars).
2. El recepcionista envía el link `wa.me/573XXXXXXXXX?text=...` desde el botón **WA** en la agenda.
3. El mensaje incluye la URL `https://tu-dominio.com/c/<token>`.
4. El cliente abre la URL → ve los detalles → presiona "Confirmar mi asistencia".
5. El estado de la cita cambia a `confirmada` en la base de datos.

### Recordatorios automáticos

Un cron job corre cada 5 minutos. Detecta citas que estén entre **2h 50min** y **3h 10min** en el futuro, con estado `pendiente` o `confirmada`, y cliente con teléfono registrado. Las marca con `recordatorio_enviado = 1`. El panel muestra un banner ámbar con el botón para enviar el recordatorio por WhatsApp.

---

## Paleta de Colores — Marble & Sage

| Variable CSS | Valor | Uso |
|---|---|---|
| `--fondo` | `#F8F8F5` | Fondo general (marble white) |
| `--superficie` | `#FFFFFF` | Tarjetas y modales |
| `--superficie2` | `#EDF0EA` | Inputs y fondos secundarios |
| `--verde` | `#4A7050` | Sage — botones, activos, links |
| `--verde-hover` | `#3A5A40` | Hover de acciones primarias |
| `--cobre` | `#B89870` | Tan accent — precios, énfasis |
| `--borde` | `#C5D0BE` | Bordes de tarjetas e inputs |
| `--texto` | `#1E2E22` | Texto principal |
| `--texto-suave` | `#587860` | Texto secundario y labels |

El sidebar mantiene fondo oscuro `#1A2E22` para identidad de marca. Los botones de acción siempre usan `color: '#fff'` explícito (no `var(--blanco)`).

---

## Scripts Disponibles

### Backend (`cd backend`)
```bash
npm run dev       # Servidor de desarrollo con nodemon (puerto 3001)
npm run build     # Compilar TypeScript → dist/
npm start         # Servidor producción desde dist/
```

### Frontend (`cd frontend`)
```bash
npm run dev       # Dev server Vite con proxy a :3001 (puerto 5173)
npm run build     # Build de producción (tsc + vite build)
npm run preview   # Preview del build de producción
```

---

## Roles y Permisos

| Rol | Puede hacer |
|---|---|
| `admin` | Todo: CRUD de barberos, servicios, productos, combos, ver financiero y estadísticas |
| `barbero` | Ver agenda propia, marcar estados de citas |
| `recepcion` | Crear y editar citas, ver clientes, enviar recordatorios |

---

<div align="center">

<br/>

[![Instagram](https://img.shields.io/badge/Instagram-rusticobarbershop__official-E4405F?style=flat-square&logo=instagram&logoColor=white)](https://instagram.com/rusticobarbershop_official)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-%2B57_313_3930398-25D366?style=flat-square&logo=whatsapp&logoColor=white)](https://wa.me/573133930398)
[![Ubicación](https://img.shields.io/badge/Bogotá-Cra._13_%2378--17-4A7050?style=flat-square&logo=googlemaps&logoColor=white)](https://maps.google.com/?q=Cra+13+%2378-17+Bogotá)

<br/>

*Construido para* **Rústico Barber & Concept Shop** *· Bogotá, Colombia 🇨🇴*

<br/>

</div>
