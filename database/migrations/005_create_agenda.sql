-- Migration: 005_create_agenda
-- Tabla de citas (core del sistema)

CREATE TYPE estado_cita AS ENUM ('pendiente', 'confirmada', 'completada', 'cancelada', 'no_show');

CREATE TABLE IF NOT EXISTS agenda (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id  UUID          REFERENCES clientes(id) ON DELETE SET NULL,
    barbero_id  UUID          NOT NULL REFERENCES barberos(id) ON DELETE RESTRICT,
    servicio_id UUID          NOT NULL REFERENCES tipo_servicios(id) ON DELETE RESTRICT,
    inicio      TIMESTAMPTZ   NOT NULL,
    fin         TIMESTAMPTZ   NOT NULL,
    estado      estado_cita   NOT NULL DEFAULT 'confirmada',
    precio_cop             INTEGER       NOT NULL,
    metodo_pago            VARCHAR(10)   NOT NULL DEFAULT 'efectivo' CHECK (metodo_pago IN ('efectivo','datafono','mixto')),
    notas                  TEXT,
    token_confirmacion     VARCHAR(50)   UNIQUE,
    recordatorio_enviado   SMALLINT      NOT NULL DEFAULT 0,
    created_by             UUID          REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_fin_despues_inicio CHECK (fin > inicio)
);

CREATE TRIGGER trg_agenda_updated_at
    BEFORE UPDATE ON agenda
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE INDEX idx_agenda_barbero_fecha ON agenda(barbero_id, inicio);
CREATE INDEX idx_agenda_cliente       ON agenda(cliente_id);
CREATE INDEX idx_agenda_estado        ON agenda(estado);
CREATE INDEX idx_agenda_fecha         ON agenda(inicio);
CREATE INDEX idx_agenda_token         ON agenda(token_confirmacion);
