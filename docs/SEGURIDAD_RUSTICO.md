# Seguridad Rustico

Actualizado: 2026-06-13

## Aplicado en la aplicacion

- API protegida con JWT y validacion del usuario activo en cada solicitud.
- Rutas administrativas reforzadas por rol desde backend:
  - `admin`: usuarios, barberos, catalogo, finanzas, estadisticas, WhatsApp.
  - `admin` y `recepcion`: adelantos.
- La interfaz tambien bloquea rutas por rol para evitar acceso directo por URL.
- Sesion del navegador movida a `sessionStorage`; se eliminan tokens viejos de `localStorage`.
- Cierre automatico de sesion cuando la API responde `401`.
- Politica minima para contrasenas nuevas o cambiadas:
  - minimo 8 caracteres,
  - al menos una mayuscula,
  - al menos una minuscula,
  - al menos un numero.
- Correos normalizados en minusculas para login y usuarios nuevos.
- Login sin registro de longitud de contrasena en consola.
- Rate limit general y rate limit especial para login.
- Headers de seguridad en Nginx:
  - `Content-Security-Policy`
  - `X-Frame-Options`
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
- CORS restringido por `FRONTEND_URL` en produccion.

## Pendiente antes de produccion real

- Cambiar `JWT_SECRET` por un secreto unico de minimo 32 caracteres.
- Cambiar la clave de MySQL y no usar `MYSQL_ALLOW_EMPTY_PASSWORD`.
- Activar HTTPS con certificado valido.
- Mover secretos a variables de entorno del servidor o vault, no dejarlos en archivos versionados.
- Crear usuarios reales y cambiar cualquier contrasena demo.
- Definir expiracion de sesion recomendada: 2h a 8h segun operacion.
- Activar backups automaticos de MySQL.
- Revisar permisos por barbero para que cada barbero vea solo su agenda y sus clientes asignados.
- Implementar 2FA para administradores si se va a exponer en internet.
- Agregar auditoria de acciones sensibles: cambio de contrasena, pagos, gastos, eliminaciones y anulaciones.

## Recomendacion para app movil

La app movil debe consumir la misma API y los mismos roles. Para mayor seguridad:

- no guardar tokens en almacenamiento permanente;
- usar bloqueo biometrico/PIN si se empaqueta como app nativa;
- cerrar sesion al recibir `401`;
- no mostrar finanzas ni configuracion administrativa a rol `barbero`;
- limitar la vista del barbero a sus citas, clientes asignados y disponibilidad.

