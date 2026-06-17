# Listo Para Mostrar Al Cliente

## Servicios

- Backend: `backend`
- Portal de administracion: `apps/portal-administracion`
- App barberos: `apps/app-barberos`

## Arranque Local

1. Abrir XAMPP e iniciar MySQL.
2. Ejecutar `start-backend.bat`.
3. Ejecutar `start-portal-administracion.bat`.
4. Ejecutar `start-app-barberos.bat`.

URLs:

- Portal de administracion: http://localhost:5180
- App barberos: http://localhost:5181
- API: http://localhost:3010/api/health

## Validacion Antes De Mostrar

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

## Recorrido

1. Dashboard del portal.
2. Agenda: crear/editar cita.
3. Clientes: historial y busqueda.
4. Catalogo: servicios, productos y combos.
5. Financiero y estadisticas.
6. App barberos: agenda y perfil desde celular.
