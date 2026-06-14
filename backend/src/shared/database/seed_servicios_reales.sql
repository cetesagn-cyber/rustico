-- ─────────────────────────────────────────────────────────────────────────────
-- Rústico Barber & Concept Shop — Setup real: servicios + barberos
-- Ejecutar en phpMyAdmin: selecciona la BD "rustico" → pestaña SQL → pegar y ejecutar
-- ─────────────────────────────────────────────────────────────────────────────
-- ADVERTENCIA: limpia agenda, comisiones y datos demo. Usuarios y barberos
-- demo se reemplazan por el equipo real. Usar en el primer arranque productivo.
-- ─────────────────────────────────────────────────────────────────────────────

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Limpiar datos demo
DELETE FROM comisiones;
DELETE FROM agenda;
DELETE FROM tipo_servicios;

-- Limpiar barberos y usuarios demo (se reemplazarán por el equipo real)
DELETE FROM barberos;
DELETE FROM usuarios WHERE rol IN ('barbero');
-- El admin (admin@rustico.co) se conserva si ya existe

SET FOREIGN_KEY_CHECKS = 1;

-- ── SERVICIOS ──────────────────────────────────────────────────────────────
-- CORTE
INSERT INTO tipo_servicios (id, nombre, descripcion, duracion_min, precio_cop, categoria, activo) VALUES
  (UUID(), 'Corte',      NULL, 30, 55000, 'corte', 1),
  (UUID(), 'Corte VIP',  NULL, 45, 80000, 'corte', 1),
  (UUID(), 'Cerquillo',  NULL, 15, 25000, 'corte', 1),
-- BARBA
  (UUID(), 'Barba',                               NULL, 20, 50000, 'barba', 1),
  (UUID(), 'Barba VIP',                           NULL, 30, 80000, 'barba', 1),
  (UUID(), 'Tinte Barba',                         NULL, 15, 25000, 'barba', 1),
  (UUID(), 'Depilación Cejas / Nariz / Oídos',   NULL, 15, 25000, 'barba', 1),
-- COMBOS
  (UUID(), 'Combo Corte - Barba',                                      NULL,  50,  99000, 'combo', 1),
  (UUID(), 'Combo Corte - Barba - Mascarilla',                        NULL,  70, 149000, 'combo', 1),
  (UUID(), 'Combo VIP Corte - Barba',                                  NULL,  60, 130000, 'combo', 1),
  (UUID(), 'Servicio VIP (Spa Facial + Corte y Barba + Depilaciones)', NULL, 120, 300000, 'combo', 1),
-- TRATAMIENTOS
  (UUID(), 'Keratina Completa',         NULL, 120, 190000, 'tratamiento', 1),
  (UUID(), 'Keratina Mechón',           NULL,  90, 160000, 'tratamiento', 1),
  (UUID(), 'Tinte Cejas',               NULL,  20,  50000, 'tratamiento', 1),
  (UUID(), 'Tinte Cabello',             NULL,  45,  70000, 'tratamiento', 1),
  (UUID(), 'Decoloración',              NULL,  45,  50000, 'tratamiento', 1),
  (UUID(), 'Mascarilla Hidroplástica',  NULL,  30,  50000, 'tratamiento', 1),
  (UUID(), 'Mascarilla de Colágeno',    NULL,  30,  50000, 'tratamiento', 1),
  (UUID(), 'Mascarilla de Hidratación', NULL,  30,  50000, 'tratamiento', 1),
  (UUID(), 'Mascarilla Puntos Negros',  NULL,  20,  30000, 'tratamiento', 1),
  (UUID(), 'Mascarilla Ojeras',         NULL,  20,  50000, 'tratamiento', 1),
  (UUID(), 'Mascarilla Led',            NULL,  30,  50000, 'tratamiento', 1),
  (UUID(), 'Spa Facial (6 Mascarillas)',NULL,  90, 200000, 'tratamiento', 1),
  (UUID(), 'Ampolletas',                NULL,  20,  40000, 'tratamiento', 1),
  (UUID(), 'Cóctel de Hidratación',     NULL,  20,  40000, 'tratamiento', 1),
-- OTROS
  (UUID(), 'Manicure', NULL, 30, 35000, 'otro', 1),
  (UUID(), 'Pedicure', NULL, 45, 40000, 'otro', 1);

-- ── ADMIN (solo si no existe) ───────────────────────────────────────────────
INSERT IGNORE INTO usuarios (id, nombre, email, telefono, password_hash, rol)
  VALUES (UUID(), 'Mónica Sánchez', 'admin@rustico.co', '+573133930398',
          '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');
-- Contraseña por defecto: "password" — cámbiala desde el panel después del primer login

-- ── BARBEROS REALES ────────────────────────────────────────────────────────
-- Insertar usuarios barberos
SET @davidUsId    = UUID();
SET @cristianUsId = UUID();
SET @estebanUsId  = UUID();
SET @julianUsId   = UUID();
SET @leonardoUsId = UUID();

INSERT INTO usuarios (id, nombre, email, telefono, password_hash, rol) VALUES
  (@davidUsId,    'David Casierra',    'david@rustico.co',    '+573001112200',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'barbero'),
  (@cristianUsId, 'Cristian Villamil', 'cristian@rustico.co', '+573002223300',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'barbero'),
  (@estebanUsId,  'Esteban Gómez',     'esteban@rustico.co',  '+573003334400',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'barbero'),
  (@julianUsId,   'Julian Vargas',     'julian@rustico.co',   '+573004445500',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'barbero'),
  (@leonardoUsId, 'Leonardo Dorantes', 'leonardo@rustico.co', '+573005556600',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'barbero');

-- Insertar registros de barberos
INSERT INTO barberos (id, usuario_id, especialidad, porcentaje_comision, color_agenda, horario_inicio, horario_fin, dias_laborales) VALUES
  (UUID(), @davidUsId,    'Head Barber — Corte clásico y técnicas premium', 50.00, '#D4921A', '08:00', '20:00', '[1,2,3,4,5,6]'),
  (UUID(), @cristianUsId, 'Expert Barber — Degradados y diseños modernos',  42.00, '#2A5080', '08:00', '20:00', '[1,2,3,4,5,6]'),
  (UUID(), @estebanUsId,  'Expert Barber — Barba, afeitado y perfilado',    42.00, '#4A7C8E', '08:00', '20:00', '[1,2,3,4,5,6]'),
  (UUID(), @julianUsId,   'Expert Barber — Cortes creativos y tendencias',  42.00, '#7A5A9E', '08:00', '20:00', '[1,2,3,4,5,6]'),
  (UUID(), @leonardoUsId, 'Expert Barber — Tratamientos y cortes premium',  42.00, '#2A7048', '08:00', '20:00', '[1,2,3,4,5,6]');

-- ── VERIFICACIÓN ───────────────────────────────────────────────────────────
SELECT 'SERVICIOS' AS tabla, COUNT(*) AS total FROM tipo_servicios
UNION ALL
SELECT 'BARBEROS',           COUNT(*)           FROM barberos
UNION ALL
SELECT 'USUARIOS',           COUNT(*)           FROM usuarios;

SELECT b.id, u.nombre, b.especialidad, b.porcentaje_comision, b.color_agenda
FROM barberos b JOIN usuarios u ON u.id = b.usuario_id
ORDER BY b.porcentaje_comision DESC;
