-- Seed: Rústico Barber & Concept Shop — datos iniciales
-- Contraseña de todos los usuarios (seed): password
-- Cambiar en producción con: npm run migrate && UPDATE usuarios SET password_hash = ... WHERE email = '...'

DO $$
DECLARE
    v_admin_id    UUID;
    v_barbero1_id UUID;
    v_barbero2_id UUID;
    v_barbero3_id UUID;
    v_b1_id       UUID;
    v_b2_id       UUID;
    v_b3_id       UUID;
    v_s1_id       UUID;
    v_s2_id       UUID;
    v_s3_id       UUID;
    v_s4_id       UUID;
    v_c1_id       UUID;
    v_c2_id       UUID;
    v_c3_id       UUID;
BEGIN

-- ── Usuarios ──────────────────────────────────────────────────────────────────
INSERT INTO usuarios (nombre, email, telefono, password_hash, rol) VALUES
    ('Santiago Gómez', 'admin@rustico.co', '+573133930398', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
    ('Carlos Medina', 'carlos@rustico.co', '+573001112233', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'barbero'),
    ('Juan Morales', 'juan@rustico.co', '+573004445566', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'barbero'),
    ('Andrés Torres', 'andres@rustico.co', '+573007778899', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'barbero'),
    ('Laura Patiño', 'recepcion@rustico.co', '+573009990011', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'recepcion')
ON CONFLICT (email) DO NOTHING;

SELECT id INTO v_admin_id    FROM usuarios WHERE email = 'admin@rustico.co';
SELECT id INTO v_barbero1_id FROM usuarios WHERE email = 'carlos@rustico.co';
SELECT id INTO v_barbero2_id FROM usuarios WHERE email = 'juan@rustico.co';
SELECT id INTO v_barbero3_id FROM usuarios WHERE email = 'andres@rustico.co';

-- ── Barberos ──────────────────────────────────────────────────────────────────
INSERT INTO barberos (usuario_id, especialidad, porcentaje_comision, color_agenda) VALUES
    (v_barbero1_id, 'Corte clásico y barba', 45.00, '#2B5741'),
    (v_barbero2_id, 'Degradados y diseños', 40.00, '#B87333'),
    (v_barbero3_id, 'Tratamientos y afeitado clásico', 42.00, '#4A7C8E')
ON CONFLICT (usuario_id) DO NOTHING;

SELECT id INTO v_b1_id FROM barberos WHERE usuario_id = v_barbero1_id;
SELECT id INTO v_b2_id FROM barberos WHERE usuario_id = v_barbero2_id;
SELECT id INTO v_b3_id FROM barberos WHERE usuario_id = v_barbero3_id;

-- ── Catálogo de servicios ─────────────────────────────────────────────────────
INSERT INTO tipo_servicios (nombre, descripcion, duracion_min, precio_cop, categoria) VALUES
    ('Corte clásico', 'Corte con tijera y máquina, arreglo de patillas', 40, 35000, 'corte'),
    ('Corte + Barba', 'Corte completo más arreglo y perfilado de barba', 60, 55000, 'combo'),
    ('Afeitado clásico', 'Afeitado a navaja con toalla caliente y productos premium', 45, 40000, 'barba'),
    ('Corte niño', 'Corte para menores de 12 años', 30, 25000, 'corte'),
    ('Hidratación capilar', 'Tratamiento nutritivo con masaje de cuero cabelludo', 30, 30000, 'tratamiento'),
    ('Diseño de barba', 'Perfilado, diseño y definición de contornos de barba', 30, 35000, 'barba')
ON CONFLICT DO NOTHING;

SELECT id INTO v_s1_id FROM tipo_servicios WHERE nombre = 'Corte clásico';
SELECT id INTO v_s2_id FROM tipo_servicios WHERE nombre = 'Corte + Barba';
SELECT id INTO v_s3_id FROM tipo_servicios WHERE nombre = 'Afeitado clásico';
SELECT id INTO v_s4_id FROM tipo_servicios WHERE nombre = 'Diseño de barba';

-- ── Clientes de ejemplo ───────────────────────────────────────────────────────
INSERT INTO clientes (nombre, telefono, email, segmento, total_visitas) VALUES
    ('Ricardo Vargas', '+573112223344', 'rvargas@gmail.com', 'vip', 15),
    ('Diego Bermúdez', '+573155556677', null, 'frecuente', 6),
    ('Mateo Castillo', '+573188889900', 'mcastillo@gmail.com', 'nuevo', 1)
ON CONFLICT DO NOTHING;

SELECT id INTO v_c1_id FROM clientes WHERE telefono = '+573112223344';
SELECT id INTO v_c2_id FROM clientes WHERE telefono = '+573155556677';
SELECT id INTO v_c3_id FROM clientes WHERE telefono = '+573188889900';

-- ── Citas de hoy (demo) ───────────────────────────────────────────────────────
INSERT INTO agenda (cliente_id, barbero_id, servicio_id, inicio, fin, estado, precio_cop, notas, created_by)
VALUES
    (v_c1_id, v_b1_id, v_s2_id,
     (CURRENT_DATE + INTERVAL '9 hours')  AT TIME ZONE 'America/Bogota',
     (CURRENT_DATE + INTERVAL '10 hours') AT TIME ZONE 'America/Bogota',
     'confirmada', 55000, 'Cliente VIP, prefiere tijera sobre máquina', v_admin_id),

    (v_c2_id, v_b2_id, v_s1_id,
     (CURRENT_DATE + INTERVAL '10 hours')        AT TIME ZONE 'America/Bogota',
     (CURRENT_DATE + INTERVAL '10 hours 40 min') AT TIME ZONE 'America/Bogota',
     'confirmada', 35000, null, v_admin_id),

    (v_c3_id, v_b3_id, v_s3_id,
     (CURRENT_DATE + INTERVAL '11 hours')        AT TIME ZONE 'America/Bogota',
     (CURRENT_DATE + INTERVAL '11 hours 45 min') AT TIME ZONE 'America/Bogota',
     'confirmada', 40000, 'Primera visita', v_admin_id),

    (v_c1_id, v_b1_id, v_s4_id,
     (CURRENT_DATE + INTERVAL '14 hours')        AT TIME ZONE 'America/Bogota',
     (CURRENT_DATE + INTERVAL '14 hours 30 min') AT TIME ZONE 'America/Bogota',
     'pendiente', 35000, null, v_admin_id)
ON CONFLICT DO NOTHING;

END $$;
