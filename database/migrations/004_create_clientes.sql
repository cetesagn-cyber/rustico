-- Migration: 004_create_clientes
-- Perfil CRM de clientes de la barbería

CREATE TYPE segmento_cliente AS ENUM ('nuevo', 'frecuente', 'vip', 'en_riesgo', 'inactivo');

CREATE TABLE IF NOT EXISTS clientes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre          VARCHAR(100)      NOT NULL,
    telefono        VARCHAR(20)       UNIQUE,
    email           VARCHAR(150)      UNIQUE,
    notas_privadas  TEXT,
    segmento        segmento_cliente  NOT NULL DEFAULT 'nuevo',
    total_visitas   INTEGER           NOT NULL DEFAULT 0,
    ticket_promedio INTEGER           NOT NULL DEFAULT 0,
    ultimo_servicio DATE,
    barbero_preferido UUID            REFERENCES barberos(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_clientes_updated_at
    BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE INDEX idx_clientes_telefono ON clientes(telefono);
CREATE INDEX idx_clientes_segmento ON clientes(segmento);
CREATE INDEX idx_clientes_nombre   ON clientes(nombre);
