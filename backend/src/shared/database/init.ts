import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { pool, uuidv4 } from './mysql.client';

const TABLES = [
  `CREATE TABLE IF NOT EXISTS usuarios (
    id            VARCHAR(36)  NOT NULL,
    nombre        VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    telefono      VARCHAR(50)  DEFAULT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol           ENUM('admin','barbero','recepcion') NOT NULL DEFAULT 'recepcion',
    activo        TINYINT(1)   NOT NULL DEFAULT 1,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_usuarios_email (email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS barberos (
    id                  VARCHAR(36)   NOT NULL,
    usuario_id          VARCHAR(36)   NOT NULL,
    especialidad        VARCHAR(255)  DEFAULT NULL,
    porcentaje_comision DECIMAL(5,2)  NOT NULL DEFAULT 40.00,
    color_agenda        VARCHAR(20)   NOT NULL DEFAULT '#2B5741',
    horario_inicio      VARCHAR(5)    NOT NULL DEFAULT '08:00',
    horario_fin         VARCHAR(5)    NOT NULL DEFAULT '20:00',
    dias_laborales      VARCHAR(50)   NOT NULL DEFAULT '[1,2,3,4,5,6]',
    activo              TINYINT(1)    NOT NULL DEFAULT 1,
    whatsapp_activo     TINYINT(1)    NOT NULL DEFAULT 1,
    created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_barberos_usuario (usuario_id),
    CONSTRAINT fk_barberos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS tipo_servicios (
    id           VARCHAR(36)  NOT NULL,
    nombre       VARCHAR(255) NOT NULL,
    descripcion  TEXT         DEFAULT NULL,
    duracion_min INT          NOT NULL DEFAULT 30,
    precio_cop   INT          NOT NULL,
    categoria    VARCHAR(50)  NOT NULL DEFAULT 'corte',
    activo       TINYINT(1)   NOT NULL DEFAULT 1,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS clientes (
    id                VARCHAR(36)  NOT NULL,
    nombre            VARCHAR(255) NOT NULL,
    telefono          VARCHAR(50)  DEFAULT NULL,
    email             VARCHAR(255) DEFAULT NULL,
    notas_privadas    TEXT         DEFAULT NULL,
    segmento          ENUM('nuevo','frecuente','vip','en_riesgo','inactivo') NOT NULL DEFAULT 'nuevo',
    total_visitas     INT          NOT NULL DEFAULT 0,
    ticket_promedio   INT          NOT NULL DEFAULT 0,
    ultimo_servicio   DATE         DEFAULT NULL,
    barbero_preferido VARCHAR(36)  DEFAULT NULL,
    created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_clientes_telefono (telefono),
    UNIQUE KEY uq_clientes_email (email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS agenda (
    id                   VARCHAR(36) NOT NULL,
    cliente_id           VARCHAR(36) DEFAULT NULL,
    barbero_id           VARCHAR(36) NOT NULL,
    servicio_id          VARCHAR(36) NOT NULL,
    inicio               DATETIME    NOT NULL,
    fin                  DATETIME    NOT NULL,
    estado               ENUM('pendiente','confirmada','completada','cancelada','no_show') NOT NULL DEFAULT 'confirmada',
    precio_cop           INT         NOT NULL,
    metodo_pago          ENUM('efectivo','datafono','mixto') NOT NULL DEFAULT 'efectivo',
    notas                TEXT        DEFAULT NULL,
    token_confirmacion   VARCHAR(50) DEFAULT NULL,
    recordatorio_enviado TINYINT(1)  NOT NULL DEFAULT 0,
    created_by           VARCHAR(36) DEFAULT NULL,
    created_at           DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_agenda_token (token_confirmacion),
    KEY idx_agenda_barbero_fecha (barbero_id, inicio),
    KEY idx_agenda_fecha (inicio),
    CONSTRAINT fk_agenda_barbero FOREIGN KEY (barbero_id) REFERENCES barberos(id),
    CONSTRAINT fk_agenda_servicio FOREIGN KEY (servicio_id) REFERENCES tipo_servicios(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS comisiones (
    id         VARCHAR(36)  NOT NULL,
    barbero_id VARCHAR(36)  NOT NULL,
    cita_id    VARCHAR(36)  NOT NULL,
    monto_cop  INT          NOT NULL,
    porcentaje DECIMAL(5,2) NOT NULL,
    estado     ENUM('pendiente','pagada') NOT NULL DEFAULT 'pendiente',
    periodo    VARCHAR(7)   DEFAULT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_comisiones_cita (cita_id),
    CONSTRAINT fk_comisiones_barbero FOREIGN KEY (barbero_id) REFERENCES barberos(id),
    CONSTRAINT fk_comisiones_cita    FOREIGN KEY (cita_id)    REFERENCES agenda(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS productos (
    id          VARCHAR(36)  NOT NULL,
    nombre      VARCHAR(255) NOT NULL,
    descripcion TEXT         DEFAULT NULL,
    precio_cop  INT          NOT NULL DEFAULT 0,
    categoria   VARCHAR(50)  NOT NULL DEFAULT 'cuidado',
    activo      TINYINT(1)   NOT NULL DEFAULT 1,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS combos (
    id          VARCHAR(36)  NOT NULL,
    nombre      VARCHAR(255) NOT NULL,
    descripcion TEXT         DEFAULT NULL,
    precio_cop  INT          NOT NULL,
    activo      TINYINT(1)   NOT NULL DEFAULT 1,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS combo_items (
    id       VARCHAR(36) NOT NULL,
    combo_id VARCHAR(36) NOT NULL,
    tipo     ENUM('servicio','producto') NOT NULL,
    item_id  VARCHAR(36) NOT NULL,
    cantidad INT         NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    CONSTRAINT fk_combo_items_combo FOREIGN KEY (combo_id) REFERENCES combos(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS gastos (
    id         VARCHAR(36)  NOT NULL,
    concepto   VARCHAR(255) NOT NULL,
    monto_cop  INT          NOT NULL,
    categoria  VARCHAR(50)  NOT NULL DEFAULT 'operativo',
    fecha      DATE         NOT NULL,
    notas      TEXT         DEFAULT NULL,
    creado_por VARCHAR(36)  DEFAULT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_gastos_fecha (fecha),
    CONSTRAINT fk_gastos_usuario FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS adelantos (
    id           VARCHAR(36)  NOT NULL,
    barbero_id   VARCHAR(36)  NOT NULL,
    monto_cop    INT          NOT NULL,
    fecha        DATE         NOT NULL,
    notas        TEXT         DEFAULT NULL,
    estado       ENUM('activo','anulado') NOT NULL DEFAULT 'activo',
    creado_por   VARCHAR(36)  DEFAULT NULL,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_adelantos_barbero_fecha (barbero_id, fecha),
    KEY idx_adelantos_fecha (fecha),
    CONSTRAINT fk_adelantos_barbero FOREIGN KEY (barbero_id) REFERENCES barberos(id),
    CONSTRAINT fk_adelantos_usuario FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

async function crearBaseDeDatos() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
  });
  const dbName = process.env.DB_NAME || 'rustico';
  await conn.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.end();
}

async function aplicarSeed(conn: mysql.PoolConnection) {
  const [rows] = await conn.execute('SELECT COUNT(*) as n FROM usuarios');
  const n = (rows as any[])[0].n;
  if (n > 0) {
    console.log('ℹ️  Base de datos ya tiene datos — omitiendo seed');
    return;
  }

  console.log('🌱 Generando 3 meses de datos — Rústico BarberAdmin...');
  const hash = bcrypt.hashSync('password', 10);
  const pad2 = (v: number) => String(v).padStart(2, '0');
  const minToHMS = (m: number) => `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}:00`;

  // ── Usuarios ─────────────────────────────────────────────────────────────────
  const monicaId      = uuidv4();
  const davidUsId     = uuidv4();
  const cristianUsId  = uuidv4();
  const estebanUsId   = uuidv4();
  const julianUsId    = uuidv4();
  const leonardoUsId  = uuidv4();

  await conn.execute(
    `INSERT INTO usuarios (id, nombre, email, telefono, password_hash, rol) VALUES
      (?, 'Mónica Díaz',        'admin@rustico.co',     '+573133930398', ?, 'admin'),
      (?, 'David Casierra',     'david@rustico.co',     '+573001112200', ?, 'barbero'),
      (?, 'Cristian Villamil',  'cristian@rustico.co',  '+573002223300', ?, 'barbero'),
      (?, 'Esteban Gómez',      'esteban@rustico.co',   '+573003334400', ?, 'barbero'),
      (?, 'Julian Vargas',      'julian@rustico.co',    '+573004445500', ?, 'barbero'),
      (?, 'Leonardo Dorantes',  'leonardo@rustico.co',  '+573005556600', ?, 'barbero')`,
    [
      monicaId,     hash,
      davidUsId,    hash,
      cristianUsId, hash,
      estebanUsId,  hash,
      julianUsId,   hash,
      leonardoUsId, hash,
    ],
  );

  // ── Barberos ─────────────────────────────────────────────────────────────────
  const davidId    = uuidv4();
  const cristianId = uuidv4();
  const estebanId  = uuidv4();
  const julianId   = uuidv4();
  const leonardoId = uuidv4();

  await conn.execute(
    `INSERT INTO barberos (id, usuario_id, especialidad, porcentaje_comision, color_agenda) VALUES
      (?, ?, 'Head Barber — Corte clásico y técnicas premium',  50.00, '#D4921A'),
      (?, ?, 'Expert Barber — Degradados y diseños modernos',   42.00, '#2A5080'),
      (?, ?, 'Expert Barber — Barba, afeitado y perfilado',     42.00, '#4A7C8E'),
      (?, ?, 'Expert Barber — Cortes creativos y tendencias',   42.00, '#7A5A9E'),
      (?, ?, 'Expert Barber — Tratamientos y cortes premium',   42.00, '#2A7048')`,
    [
      davidId,    davidUsId,
      cristianId, cristianUsId,
      estebanId,  estebanUsId,
      julianId,   julianUsId,
      leonardoId, leonardoUsId,
    ],
  );

  // ── Servicios reales — Rústico Barber & Concept Shop ─────────────────────────
  // Corte
  const sCorte         = uuidv4();
  const sCorteVip      = uuidv4();
  const sCerquillo     = uuidv4();
  // Barba
  const sBarba         = uuidv4();
  const sBarbaVip      = uuidv4();
  const sTinteBarba    = uuidv4();
  const sDepilacion    = uuidv4();
  // Combos
  const sCombo         = uuidv4();
  const sComboMasc     = uuidv4();
  const sComboVip      = uuidv4();
  const sServicioVip   = uuidv4();
  // Tratamientos
  const sKeratina      = uuidv4();
  const sKeratinaM     = uuidv4();
  const sTinteCejas    = uuidv4();
  const sTinteCabello  = uuidv4();
  const sDecoloracion  = uuidv4();
  const sMascHidro     = uuidv4();
  const sMascColageno  = uuidv4();
  const sMascHidra     = uuidv4();
  const sMascPuntos    = uuidv4();
  const sMascOjeras    = uuidv4();
  const sMascLed       = uuidv4();
  const sSpaFacial     = uuidv4();
  const sAmpolletas    = uuidv4();
  const sCoctel        = uuidv4();
  // Otros
  const sManicure      = uuidv4();
  const sPedicure      = uuidv4();

  await conn.execute(
    `INSERT INTO tipo_servicios (id, nombre, descripcion, duracion_min, precio_cop, categoria) VALUES
      -- CORTE
      (?, 'Corte',                                                    NULL, 30,  55000, 'corte'),
      (?, 'Corte VIP',                                                NULL, 45,  80000, 'corte'),
      (?, 'Cerquillo',                                                NULL, 15,  25000, 'corte'),
      -- BARBA
      (?, 'Barba',                                                    NULL, 20,  50000, 'barba'),
      (?, 'Barba VIP',                                                NULL, 30,  80000, 'barba'),
      (?, 'Tinte Barba',                                              NULL, 15,  25000, 'barba'),
      (?, 'Depilación Cejas / Nariz / Oídos',                        NULL, 15,  25000, 'barba'),
      -- COMBOS
      (?, 'Combo Corte - Barba',                                      NULL, 50,  99000, 'combo'),
      (?, 'Combo Corte - Barba - Mascarilla',                        NULL, 70, 149000, 'combo'),
      (?, 'Combo VIP Corte - Barba',                                  NULL, 60, 130000, 'combo'),
      (?, 'Servicio VIP (Spa Facial + Corte y Barba + Depilaciones)', NULL,120, 300000, 'combo'),
      -- TRATAMIENTOS
      (?, 'Keratina Completa',          NULL, 120, 190000, 'tratamiento'),
      (?, 'Keratina Mechón',            NULL,  90, 160000, 'tratamiento'),
      (?, 'Tinte Cejas',                NULL,  20,  50000, 'tratamiento'),
      (?, 'Tinte Cabello',              NULL,  45,  70000, 'tratamiento'),
      (?, 'Decoloración',               NULL,  45,  50000, 'tratamiento'),
      (?, 'Mascarilla Hidroplástica',   NULL,  30,  50000, 'tratamiento'),
      (?, 'Mascarilla de Colágeno',     NULL,  30,  50000, 'tratamiento'),
      (?, 'Mascarilla de Hidratación',  NULL,  30,  50000, 'tratamiento'),
      (?, 'Mascarilla Puntos Negros',   NULL,  20,  30000, 'tratamiento'),
      (?, 'Mascarilla Ojeras',          NULL,  20,  50000, 'tratamiento'),
      (?, 'Mascarilla Led',             NULL,  30,  50000, 'tratamiento'),
      (?, 'Spa Facial (6 Mascarillas)', NULL,  90, 200000, 'tratamiento'),
      (?, 'Ampolletas',                 NULL,  20,  40000, 'tratamiento'),
      (?, 'Cóctel de Hidratación',      NULL,  20,  40000, 'tratamiento'),
      -- OTROS
      (?, 'Manicure',                   NULL,  30,  35000, 'otro'),
      (?, 'Pedicure',                   NULL,  45,  40000, 'otro')`,
    [
      sCorte, sCorteVip, sCerquillo,
      sBarba, sBarbaVip, sTinteBarba, sDepilacion,
      sCombo, sComboMasc, sComboVip, sServicioVip,
      sKeratina, sKeratinaM, sTinteCejas, sTinteCabello, sDecoloracion,
      sMascHidro, sMascColageno, sMascHidra, sMascPuntos, sMascOjeras, sMascLed,
      sSpaFacial, sAmpolletas, sCoctel,
      sManicure, sPedicure,
    ],
  );

  // ── Clientes (20) ─────────────────────────────────────────────────────────────
  type Seg = 'vip' | 'frecuente' | 'nuevo' | 'en_riesgo' | 'inactivo';
  interface CliRow { id: string; nombre: string; tel: string; seg: Seg; visitas: number; gasto: number; ultimo: string | null; }

  const clientes: CliRow[] = [
    { id: uuidv4(), nombre: 'Ricardo Vargas',   tel: '+573112223344', seg: 'vip',       visitas: 0, gasto: 0, ultimo: null },
    { id: uuidv4(), nombre: 'Felipe Ramírez',   tel: '+573113334455', seg: 'vip',       visitas: 0, gasto: 0, ultimo: null },
    { id: uuidv4(), nombre: 'Mauricio Jiménez', tel: '+573175556677', seg: 'vip',       visitas: 0, gasto: 0, ultimo: null },
    { id: uuidv4(), nombre: 'Diego Bermúdez',   tel: '+573155556678', seg: 'frecuente', visitas: 0, gasto: 0, ultimo: null },
    { id: uuidv4(), nombre: 'Mateo Castillo',   tel: '+573158889900', seg: 'frecuente', visitas: 0, gasto: 0, ultimo: null },
    { id: uuidv4(), nombre: 'Sebastián Ruiz',   tel: '+573160001122', seg: 'frecuente', visitas: 0, gasto: 0, ultimo: null },
    { id: uuidv4(), nombre: 'Miguel Herrera',   tel: '+573161112233', seg: 'frecuente', visitas: 0, gasto: 0, ultimo: null },
    { id: uuidv4(), nombre: 'Camilo Ortega',    tel: '+573162223344', seg: 'frecuente', visitas: 0, gasto: 0, ultimo: null },
    { id: uuidv4(), nombre: 'Daniel Gómez',     tel: '+573163334455', seg: 'frecuente', visitas: 0, gasto: 0, ultimo: null },
    { id: uuidv4(), nombre: 'Luis Peña',        tel: '+573164445566', seg: 'frecuente', visitas: 0, gasto: 0, ultimo: null },
    { id: uuidv4(), nombre: 'Alejandro Díaz',   tel: '+573173334455', seg: 'frecuente', visitas: 0, gasto: 0, ultimo: null },
    { id: uuidv4(), nombre: 'Oscar Martínez',   tel: '+573174445566', seg: 'frecuente', visitas: 0, gasto: 0, ultimo: null },
    { id: uuidv4(), nombre: 'Tomás Arango',     tel: '+573165556677', seg: 'nuevo',     visitas: 0, gasto: 0, ultimo: null },
    { id: uuidv4(), nombre: 'Santiago Mejía',   tel: '+573166667788', seg: 'nuevo',     visitas: 0, gasto: 0, ultimo: null },
    { id: uuidv4(), nombre: 'Esteban Pardo',    tel: '+573167778899', seg: 'nuevo',     visitas: 0, gasto: 0, ultimo: null },
    { id: uuidv4(), nombre: 'Jhony Rodríguez',  tel: '+573172223344', seg: 'nuevo',     visitas: 0, gasto: 0, ultimo: null },
    { id: uuidv4(), nombre: 'Nicolás Vargas',   tel: '+573168889900', seg: 'en_riesgo', visitas: 0, gasto: 0, ultimo: null },
    { id: uuidv4(), nombre: 'Jhon Castro',      tel: '+573169990011', seg: 'en_riesgo', visitas: 0, gasto: 0, ultimo: null },
    { id: uuidv4(), nombre: 'Andrés Pineda',    tel: '+573170001122', seg: 'inactivo',  visitas: 0, gasto: 0, ultimo: null },
    { id: uuidv4(), nombre: 'Carlos Suárez',    tel: '+573171112233', seg: 'inactivo',  visitas: 0, gasto: 0, ultimo: null },
  ];

  const cliPH  = clientes.map(() => '(?,?,?,NULL,?,0,0,NULL)').join(',');
  const cliVals: any[] = [];
  for (const c of clientes) cliVals.push(c.id, c.nombre, c.tel, c.seg);
  await conn.execute(
    `INSERT INTO clientes (id,nombre,telefono,email,segmento,total_visitas,ticket_promedio,ultimo_servicio) VALUES ${cliPH}`,
    cliVals,
  );

  // ── Tablas de servicios y barberos para el generador ─────────────────────────
  const SERVS = [
    { id: sCorte,      dur: 30,  precio:  55000, w: 28 },
    { id: sBarba,      dur: 20,  precio:  50000, w: 16 },
    { id: sCombo,      dur: 50,  precio:  99000, w: 20 },
    { id: sComboVip,   dur: 60,  precio: 130000, w:  8 },
    { id: sCerquillo,  dur: 15,  precio:  25000, w:  8 },
    { id: sMascHidra,  dur: 30,  precio:  50000, w:  8 },
    { id: sKeratina,   dur: 120, precio: 190000, w:  5 },
    { id: sCorteVip,   dur: 45,  precio:  80000, w:  7 },
  ];
  const BARBS = [
    { id: davidId,    pct: 50, offset:  0 },  // Head Barber
    { id: cristianId, pct: 42, offset: 10 },  // Expert Barber
    { id: estebanId,  pct: 42, offset: 15 },  // Expert Barber
    { id: julianId,   pct: 42, offset: 20 },  // Expert Barber
    { id: leonardoId, pct: 42, offset: 25 },  // Expert Barber
  ];
  const PESO_S = SERVS.reduce((a, s) => a + s.w, 0);
  const CLI_W  = clientes.map(c => c.seg === 'vip' ? 10 : c.seg === 'frecuente' ? 6 : c.seg === 'nuevo' ? 3 : 1);
  const PESO_C = CLI_W.reduce((a, b) => a + b, 0);

  const rndS = () => { let r = Math.floor(Math.random() * PESO_S); for (const s of SERVS) { r -= s.w; if (r < 0) return s; } return SERVS[0]; };
  const rndC = () => { let r = Math.floor(Math.random() * PESO_C); for (let i = 0; i < clientes.length; i++) { r -= CLI_W[i]; if (r < 0) return clientes[i]; } return clientes[0]; };

  // ── Bucle de fechas: 1 Mar 2026 → hoy ────────────────────────────────────────
  const ahoraDate = new Date();
  const hoyStr    = `${ahoraDate.getFullYear()}-${pad2(ahoraDate.getMonth() + 1)}-${pad2(ahoraDate.getDate())}`;
  const ahoraMins = ahoraDate.getHours() * 60 + ahoraDate.getMinutes();

  const agendaRows:   any[][] = [];
  const comisionRows: any[][] = [];

  let cursor = new Date('2026-03-01T12:00:00');
  const finDate = new Date(`${hoyStr}T23:59:59`);

  while (cursor <= finDate) {
    const dow    = cursor.getDay();
    const fechaS = `${cursor.getFullYear()}-${pad2(cursor.getMonth() + 1)}-${pad2(cursor.getDate())}`;
    const esHoy  = fechaS === hoyStr;
    const esPast = cursor < ahoraDate && !esHoy;

    if (dow !== 0) {
      for (const barb of BARBS) {
        let min = 8 * 60 + barb.offset;
        const nCitas = 4 + Math.floor(Math.random() * 4);

        for (let i = 0; i < nCitas; i++) {
          if (min >= 19 * 60) break;
          const serv   = rndS();
          const finMin = min + serv.dur;
          if (finMin > 20 * 60) break;

          let estado: string;
          if (esHoy) {
            if (min < ahoraMins) {
              const r = Math.random();
              estado = r < 0.83 ? 'completada' : r < 0.93 ? 'cancelada' : 'no_show';
            } else {
              estado = Math.random() < 0.68 ? 'confirmada' : 'pendiente';
            }
          } else if (esPast) {
            const r = Math.random();
            estado = r < 0.82 ? 'completada' : r < 0.93 ? 'cancelada' : 'no_show';
          } else {
            estado = Math.random() < 0.65 ? 'confirmada' : 'pendiente';
          }

          const cliente = rndC();
          const citaId  = uuidv4();

          agendaRows.push([
            citaId, cliente.id, barb.id, serv.id,
            `${fechaS} ${minToHMS(min)}`,
            `${fechaS} ${minToHMS(finMin)}`,
            estado, serv.precio, null, uuidv4().slice(0, 16), monicaId,
          ]);

          if (estado === 'completada') {
            const monto   = Math.round(serv.precio * barb.pct / 100);
            const periodo = fechaS.slice(0, 7);
            comisionRows.push([uuidv4(), barb.id, citaId, monto, barb.pct, 'pagada', periodo]);
            cliente.visitas++;
            cliente.gasto += serv.precio;
            if (!cliente.ultimo || fechaS > cliente.ultimo) cliente.ultimo = fechaS;
          }

          min = finMin + 5 + Math.floor(Math.random() * 11);
        }
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  // ── Insert agenda en batches ──────────────────────────────────────────────────
  for (let i = 0; i < agendaRows.length; i += 100) {
    const batch = agendaRows.slice(i, i + 100);
    const ph = batch.map(() => '(?,?,?,?,?,?,?,?,?,?,?)').join(',');
    await conn.execute(
      `INSERT INTO agenda (id,cliente_id,barbero_id,servicio_id,inicio,fin,estado,precio_cop,notas,token_confirmacion,created_by) VALUES ${ph}`,
      ([] as any[]).concat(...batch),
    );
  }
  console.log(`  ✓ ${agendaRows.length} citas`);

  // ── Insert comisiones en batches ──────────────────────────────────────────────
  for (let i = 0; i < comisionRows.length; i += 100) {
    const batch = comisionRows.slice(i, i + 100);
    const ph = batch.map(() => '(?,?,?,?,?,?,?)').join(',');
    await conn.execute(
      `INSERT INTO comisiones (id,barbero_id,cita_id,monto_cop,porcentaje,estado,periodo) VALUES ${ph}`,
      ([] as any[]).concat(...batch),
    );
  }
  console.log(`  ✓ ${comisionRows.length} comisiones`);

  // ── Actualizar stats de clientes ──────────────────────────────────────────────
  for (const c of clientes) {
    if (c.visitas > 0) {
      await conn.execute(
        `UPDATE clientes SET total_visitas=?, ticket_promedio=?, ultimo_servicio=? WHERE id=?`,
        [c.visitas, Math.round(c.gasto / c.visitas), c.ultimo, c.id],
      );
    }
  }

  // ── Gastos fijos mensuales ────────────────────────────────────────────────────
  const GASTOS = [
    { concepto: 'Arriendo local Cra. 13 #78-17',        monto: 1800000, cat: 'arriendo',      dia: '01' },
    { concepto: 'Insumos y productos profesionales',     monto: 430000,  cat: 'insumos',       dia: '05' },
    { concepto: 'Servicios públicos — luz y agua',       monto: 240000,  cat: 'servicios',     dia: '10' },
    { concepto: 'Pauta digital y redes sociales',        monto: 150000,  cat: 'marketing',     dia: '15' },
    { concepto: 'Mantenimiento y productos de limpieza', monto: 95000,   cat: 'mantenimiento', dia: '20' },
  ];
  for (const mes of ['2026-03', '2026-04', '2026-05']) {
    for (const g of GASTOS) {
      const fecha = `${mes}-${g.dia}`;
      if (fecha > hoyStr) continue;
      await conn.execute(
        `INSERT INTO gastos (id,concepto,monto_cop,categoria,fecha,creado_por) VALUES (?,?,?,?,?,?)`,
        [uuidv4(), g.concepto, g.monto, g.cat, fecha, monicaId],
      );
    }
  }

  console.log('✅ Seed completado — Rústico BarberAdmin listo');
}

export async function initDatabase() {
  await crearBaseDeDatos();

  const conn = await pool.getConnection();
  try {
    for (const ddl of TABLES) {
      await conn.execute(ddl);
    }
    console.log('✅ Schema MySQL aplicado');
    await aplicarSeed(conn);
  } finally {
    conn.release();
  }
}
