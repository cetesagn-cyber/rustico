-- Schema SQLite para Rústico BarberAdmin POC

CREATE TABLE IF NOT EXISTS usuarios (
    id          TEXT PRIMARY KEY,
    nombre      TEXT NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    telefono    TEXT,
    password_hash TEXT NOT NULL,
    rol         TEXT NOT NULL DEFAULT 'recepcion' CHECK(rol IN ('admin','barbero','recepcion')),
    activo      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS barberos (
    id                  TEXT PRIMARY KEY,
    usuario_id          TEXT UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    especialidad        TEXT,
    porcentaje_comision REAL NOT NULL DEFAULT 40.0,
    color_agenda        TEXT NOT NULL DEFAULT '#2B5741',
    horario_inicio      TEXT NOT NULL DEFAULT '08:00',
    horario_fin         TEXT NOT NULL DEFAULT '20:00',
    dias_laborales      TEXT NOT NULL DEFAULT '[1,2,3,4,5,6]',
    activo              INTEGER NOT NULL DEFAULT 1,
    created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tipo_servicios (
    id           TEXT PRIMARY KEY,
    nombre       TEXT NOT NULL,
    descripcion  TEXT,
    duracion_min INTEGER NOT NULL DEFAULT 30,
    precio_cop   INTEGER NOT NULL,
    categoria    TEXT NOT NULL DEFAULT 'corte',
    activo       INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clientes (
    id                TEXT PRIMARY KEY,
    nombre            TEXT NOT NULL,
    telefono          TEXT UNIQUE,
    email             TEXT UNIQUE,
    notas_privadas    TEXT,
    segmento          TEXT NOT NULL DEFAULT 'nuevo' CHECK(segmento IN ('nuevo','frecuente','vip','en_riesgo','inactivo')),
    total_visitas     INTEGER NOT NULL DEFAULT 0,
    ticket_promedio   INTEGER NOT NULL DEFAULT 0,
    ultimo_servicio   TEXT,
    barbero_preferido TEXT REFERENCES barberos(id) ON DELETE SET NULL,
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agenda (
    id                   TEXT PRIMARY KEY,
    cliente_id           TEXT REFERENCES clientes(id) ON DELETE SET NULL,
    barbero_id           TEXT NOT NULL REFERENCES barberos(id) ON DELETE RESTRICT,
    servicio_id          TEXT NOT NULL REFERENCES tipo_servicios(id) ON DELETE RESTRICT,
    inicio               TEXT NOT NULL,
    fin                  TEXT NOT NULL,
    estado               TEXT NOT NULL DEFAULT 'confirmada' CHECK(estado IN ('pendiente','confirmada','completada','cancelada','no_show')),
    precio_cop           INTEGER NOT NULL,
    notas                TEXT,
    token_confirmacion   TEXT UNIQUE,
    recordatorio_enviado INTEGER NOT NULL DEFAULT 0,
    created_by           TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at           TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comisiones (
    id         TEXT PRIMARY KEY,
    barbero_id TEXT NOT NULL REFERENCES barberos(id),
    cita_id    TEXT UNIQUE NOT NULL REFERENCES agenda(id) ON DELETE CASCADE,
    monto_cop  INTEGER NOT NULL,
    porcentaje REAL NOT NULL,
    estado     TEXT NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente','pagada')),
    periodo    TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS productos (
    id          TEXT PRIMARY KEY,
    nombre      TEXT NOT NULL,
    descripcion TEXT,
    precio_cop  INTEGER NOT NULL DEFAULT 0,
    categoria   TEXT NOT NULL DEFAULT 'cuidado',
    activo      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS combos (
    id          TEXT PRIMARY KEY,
    nombre      TEXT NOT NULL,
    descripcion TEXT,
    precio_cop  INTEGER NOT NULL,
    activo      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS combo_items (
    id       TEXT PRIMARY KEY,
    combo_id TEXT NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
    tipo     TEXT NOT NULL CHECK(tipo IN ('servicio','producto')),
    item_id  TEXT NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_agenda_barbero_fecha ON agenda(barbero_id, inicio);
CREATE INDEX IF NOT EXISTS idx_agenda_fecha         ON agenda(inicio);
CREATE INDEX IF NOT EXISTS idx_agenda_token         ON agenda(token_confirmacion);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre      ON clientes(nombre);
