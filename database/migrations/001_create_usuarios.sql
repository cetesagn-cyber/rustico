-- Migration: 001_create_usuarios
-- Tabla de usuarios del sistema: admin, barbero, recepcion

CREATE TYPE rol_usuario AS ENUM ('admin', 'barbero', 'recepcion');

CREATE TABLE IF NOT EXISTS usuarios (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      VARCHAR(100)  NOT NULL,
    email       VARCHAR(150)  UNIQUE NOT NULL,
    telefono    VARCHAR(20)   UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol         rol_usuario   NOT NULL DEFAULT 'recepcion',
    activo      BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION fn_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol   ON usuarios(rol);
