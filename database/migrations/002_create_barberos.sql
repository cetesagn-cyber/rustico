-- Migration: 002_create_barberos
-- Perfil extendido de barberos (vinculado a usuario con rol='barbero')

CREATE TABLE IF NOT EXISTS barberos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id          UUID UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    especialidad        VARCHAR(200),
    porcentaje_comision NUMERIC(5,2)  NOT NULL DEFAULT 40.00,
    color_agenda        VARCHAR(7)    NOT NULL DEFAULT '#2B5741',
    horario_inicio      TIME          NOT NULL DEFAULT '08:00',
    horario_fin         TIME          NOT NULL DEFAULT '20:00',
    dias_laborales      INTEGER[]     NOT NULL DEFAULT '{1,2,3,4,5,6}',
    activo              BOOLEAN       NOT NULL DEFAULT TRUE,
    whatsapp_activo     BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_barberos_usuario ON barberos(usuario_id);
CREATE INDEX idx_barberos_activo  ON barberos(activo);
