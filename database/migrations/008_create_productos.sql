-- Migration: 008_create_productos
-- Catálogo de productos del concept shop

CREATE TABLE IF NOT EXISTS productos (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      VARCHAR(255) NOT NULL,
    descripcion TEXT,
    precio_cop  INTEGER      NOT NULL DEFAULT 0,
    categoria   VARCHAR(50)  NOT NULL DEFAULT 'cuidado',
    activo      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_productos_updated_at
    BEFORE UPDATE ON productos
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
