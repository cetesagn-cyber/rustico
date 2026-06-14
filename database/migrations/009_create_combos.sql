-- Migration: 009_create_combos
-- Combos de servicios y productos

CREATE TABLE IF NOT EXISTS combos (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      VARCHAR(255) NOT NULL,
    descripcion TEXT,
    precio_cop  INTEGER      NOT NULL,
    activo      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_combos_updated_at
    BEFORE UPDATE ON combos
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TABLE IF NOT EXISTS combo_items (
    id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    combo_id UUID        NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
    tipo     VARCHAR(10) NOT NULL CHECK (tipo IN ('servicio','producto')),
    item_id  UUID        NOT NULL,
    cantidad INTEGER     NOT NULL DEFAULT 1
);
