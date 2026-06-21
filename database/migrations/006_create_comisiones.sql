-- Migration: 006_create_comisiones
-- Comisiones de barberos por cita

CREATE TYPE estado_comision AS ENUM ('pendiente', 'pagada');

CREATE TABLE IF NOT EXISTS comisiones (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbero_id   UUID             NOT NULL REFERENCES barberos(id) ON DELETE RESTRICT,
    cita_id      UUID             UNIQUE NOT NULL REFERENCES agenda(id) ON DELETE CASCADE,
    monto_cop    INTEGER          NOT NULL,
    porcentaje   NUMERIC(5,2)     NOT NULL,
    estado       estado_comision  NOT NULL DEFAULT 'pendiente',
    periodo      VARCHAR(10),
    pagado_en    TIMESTAMPTZ,
    created_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_comisiones_updated_at
    BEFORE UPDATE ON comisiones
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- Auto-calculate commission when a cita is completed
CREATE OR REPLACE FUNCTION fn_crear_comision_al_completar()
RETURNS TRIGGER AS $$
DECLARE
    v_porcentaje NUMERIC(5,2);
    v_monto      INTEGER;
    v_periodo    VARCHAR(10);
BEGIN
    IF NEW.estado = 'completada' AND OLD.estado != 'completada' THEN
        SELECT porcentaje_comision INTO v_porcentaje
        FROM barberos WHERE id = NEW.barbero_id;

        v_monto   := ROUND((NEW.precio_cop * v_porcentaje) / 100);
        v_periodo := TO_CHAR(NEW.inicio AT TIME ZONE 'America/Bogota', 'YYYY-MM');

        INSERT INTO comisiones (barbero_id, cita_id, monto_cop, porcentaje, periodo)
        VALUES (NEW.barbero_id, NEW.id, v_monto, v_porcentaje, v_periodo)
        ON CONFLICT (cita_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_comision_al_completar
    AFTER UPDATE ON agenda
    FOR EACH ROW EXECUTE FUNCTION fn_crear_comision_al_completar();

CREATE INDEX idx_comisiones_barbero  ON comisiones(barbero_id);
CREATE INDEX idx_comisiones_periodo  ON comisiones(periodo);
CREATE INDEX idx_comisiones_estado   ON comisiones(estado);
