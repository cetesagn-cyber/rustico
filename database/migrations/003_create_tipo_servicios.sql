-- Migration: 003_create_tipo_servicios
-- Catálogo de servicios de Rústico Barber & Concept Shop

CREATE TABLE IF NOT EXISTS tipo_servicios (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre       VARCHAR(150) NOT NULL,
    descripcion  TEXT,
    duracion_min INTEGER      NOT NULL DEFAULT 30,
    precio_cop   INTEGER      NOT NULL,
    categoria    VARCHAR(50)  NOT NULL DEFAULT 'corte',
    activo       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_servicios_updated_at
    BEFORE UPDATE ON tipo_servicios
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE INDEX idx_servicios_activo ON tipo_servicios(activo);
