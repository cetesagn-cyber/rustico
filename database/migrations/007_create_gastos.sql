-- Migration: 007_create_gastos
-- Gastos operativos del local

CREATE TABLE IF NOT EXISTS gastos (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    concepto   VARCHAR(255) NOT NULL,
    monto_cop  INTEGER      NOT NULL,
    categoria  VARCHAR(50)  NOT NULL DEFAULT 'operativo',
    fecha      DATE         NOT NULL,
    notas      TEXT,
    creado_por UUID         REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_gastos_updated_at
    BEFORE UPDATE ON gastos
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE INDEX idx_gastos_fecha ON gastos(fecha);
