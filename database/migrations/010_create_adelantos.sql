-- Migration: 010_create_adelantos
-- Adelantos de comisión a barberos

CREATE TABLE IF NOT EXISTS adelantos (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    barbero_id   UUID        NOT NULL REFERENCES barberos(id),
    monto_cop    INTEGER     NOT NULL,
    fecha        DATE        NOT NULL,
    notas        TEXT,
    estado       VARCHAR(10) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','anulado')),
    creado_por   UUID        REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_adelantos_barbero_fecha ON adelantos(barbero_id, fecha);
CREATE INDEX idx_adelantos_fecha         ON adelantos(fecha);
