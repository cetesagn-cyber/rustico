# Listo para exponer hoy y migrar

## Estado para demo

- Backend: Node/TypeScript + Express.
- Frontend: React/Vite.
- Base local: MySQL/XAMPP en `rustico_prueba`.
- Puertos locales reales: frontend `5180`, backend `3010`.
- Usuario demo: `admin@rustico.co`.
- Clave demo: `password`.

## Arranque para hoy

1. Abrir XAMPP e iniciar MySQL.
2. Ejecutar `start-backend.bat`.
3. Ejecutar `start-frontend.bat`.
4. Abrir http://localhost:5180.
5. Verificar API en http://localhost:3010/api/health.

Si otra persona se conecta desde la misma red, usar el enlace con la IP del equipo y puerto `5180`, por ejemplo `http://192.168.0.9:5180`.

## Validacion rapida antes de mostrar

```bash
cd backend
npm run build
npm run migrate
```

```bash
cd frontend
npm run build
```

## Recorrido sugerido

1. Dashboard: ventas, citas y resumen operativo.
2. Agenda: crear/editar cita, estados y confirmacion.
3. Clientes: historial, busqueda y segmentos.
4. Catalogo: servicios, productos y combos.
5. Financiero: comisiones, cierres y adelantos.
6. Estadisticas: graficas para decisiones.
7. WhatsApp: estado de conexion y mensajes si el servicio esta disponible.

## Migracion con Docker

Docker levanta MySQL, backend y frontend juntos:

```bash
cd infrastructure
docker-compose up --build -d
```

URLs Docker:

- Frontend: http://localhost:8082
- Backend API: http://localhost:3002
- Health: http://localhost:3002/api/health
- MySQL: localhost:3308

Comandos utiles:

```bash
cd infrastructure
docker-compose ps
docker-compose logs -f
docker-compose down
```

## Antes de produccion real

- Cambiar `JWT_SECRET`.
- Definir dominio final en `FRONTEND_URL`.
- Crear usuario MySQL con contrasena fuerte.
- Habilitar HTTPS.
- Quitar o cambiar credenciales demo del seed.
