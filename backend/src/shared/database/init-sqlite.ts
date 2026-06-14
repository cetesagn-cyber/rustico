import bcrypt from 'bcryptjs';
import { db, uuidv4 } from './sqlite.client';

const TABLES = [
  `CREATE TABLE IF NOT EXISTS usuarios (
    id            TEXT PRIMARY KEY,
    nombre        TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    telefono      TEXT,
    password_hash TEXT NOT NULL,
    rol           TEXT NOT NULL CHECK(rol IN ('admin','barbero','recepcion')) DEFAULT 'recepcion',
    activo        INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS barberos (
    id                  TEXT PRIMARY KEY,
    usuario_id          TEXT NOT NULL UNIQUE,
    especialidad        TEXT,
    porcentaje_comision REAL NOT NULL DEFAULT 40.00,
    color_agenda        TEXT NOT NULL DEFAULT '#2B5741',
    horario_inicio      TEXT NOT NULL DEFAULT '08:00',
    horario_fin         TEXT NOT NULL DEFAULT '20:00',
    dias_laborales      TEXT NOT NULL DEFAULT '[1,2,3,4,5,6]',
    activo              INTEGER NOT NULL DEFAULT 1,
    whatsapp_activo     INTEGER NOT NULL DEFAULT 1,
    created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS tipo_servicios (
    id           TEXT PRIMARY KEY,
    nombre       TEXT NOT NULL,
    descripcion  TEXT,
    duracion_min INTEGER NOT NULL DEFAULT 30,
    precio_cop   INTEGER NOT NULL,
    categoria    TEXT NOT NULL DEFAULT 'corte',
    activo       INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS clientes (
    id                TEXT PRIMARY KEY,
    nombre            TEXT NOT NULL,
    telefono          TEXT UNIQUE,
    email             TEXT UNIQUE,
    notas_privadas    TEXT,
    segmento          TEXT NOT NULL CHECK(segmento IN ('nuevo','frecuente','vip','en_riesgo','inactivo')) DEFAULT 'nuevo',
    total_visitas     INTEGER NOT NULL DEFAULT 0,
    ticket_promedio   INTEGER NOT NULL DEFAULT 0,
    ultimo_servicio   TEXT,
    barbero_preferido TEXT,
    created_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS agenda (
    id                   TEXT PRIMARY KEY,
    cliente_id           TEXT,
    barbero_id           TEXT NOT NULL,
    servicio_id          TEXT NOT NULL,
    inicio               TEXT NOT NULL,
    fin                  TEXT NOT NULL,
    estado               TEXT NOT NULL CHECK(estado IN ('pendiente','confirmada','completada','cancelada','no_show')) DEFAULT 'confirmada',
    precio_cop           INTEGER NOT NULL,
    metodo_pago          TEXT CHECK(metodo_pago IN ('efectivo','datafono','mixto')) DEFAULT 'efectivo',
    notas                TEXT,
    token_confirmacion   TEXT UNIQUE,
    recordatorio_enviado INTEGER NOT NULL DEFAULT 0,
    created_by           TEXT,
    created_at           TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(barbero_id) REFERENCES barberos(id),
    FOREIGN KEY(servicio_id) REFERENCES tipo_servicios(id)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_agenda_barbero_fecha ON agenda(barbero_id, inicio)`,
  `CREATE INDEX IF NOT EXISTS idx_agenda_fecha ON agenda(inicio)`,

  `CREATE TABLE IF NOT EXISTS comisiones (
    id         TEXT PRIMARY KEY,
    barbero_id TEXT NOT NULL,
    cita_id    TEXT NOT NULL UNIQUE,
    monto_cop  INTEGER NOT NULL,
    porcentaje REAL NOT NULL,
    estado     TEXT NOT NULL CHECK(estado IN ('pendiente','pagada')) DEFAULT 'pendiente',
    periodo    TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(barbero_id) REFERENCES barberos(id),
    FOREIGN KEY(cita_id) REFERENCES agenda(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS productos (
    id          TEXT PRIMARY KEY,
    nombre      TEXT NOT NULL,
    descripcion TEXT,
    precio_cop  INTEGER NOT NULL DEFAULT 0,
    categoria   TEXT NOT NULL DEFAULT 'cuidado',
    activo      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS combos (
    id          TEXT PRIMARY KEY,
    nombre      TEXT NOT NULL,
    descripcion TEXT,
    precio_cop  INTEGER NOT NULL,
    activo      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS combo_items (
    id       TEXT PRIMARY KEY,
    combo_id TEXT NOT NULL,
    tipo     TEXT NOT NULL CHECK(tipo IN ('servicio','producto')),
    item_id  TEXT NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY(combo_id) REFERENCES combos(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS gastos (
    id         TEXT PRIMARY KEY,
    concepto   TEXT NOT NULL,
    monto_cop  INTEGER NOT NULL,
    categoria  TEXT NOT NULL DEFAULT 'operativo',
    fecha      TEXT NOT NULL,
    notas      TEXT,
    creado_por TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(creado_por) REFERENCES usuarios(id) ON DELETE SET NULL
  )`,

  `CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos(fecha)`,

  `CREATE TABLE IF NOT EXISTS adelantos (
    id           TEXT PRIMARY KEY,
    barbero_id   TEXT NOT NULL,
    monto_cop    INTEGER NOT NULL,
    fecha        TEXT NOT NULL,
    notas        TEXT,
    estado       TEXT NOT NULL CHECK(estado IN ('activo','anulado')) DEFAULT 'activo',
    creado_por   TEXT,
    created_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(barbero_id) REFERENCES barberos(id),
    FOREIGN KEY(creado_por) REFERENCES usuarios(id) ON DELETE SET NULL
  )`,

  `CREATE INDEX IF NOT EXISTS idx_adelantos_barbero_fecha ON adelantos(barbero_id, fecha)`,
  `CREATE INDEX IF NOT EXISTS idx_adelantos_fecha ON adelantos(fecha)`,
];

function aplicarSeed() {
  try {
    const existing = db.prepare('SELECT COUNT(*) as n FROM usuarios').get() as any;
    if (existing.n > 0) {
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

    const insertUsuarios = db.prepare(
      `INSERT INTO usuarios (id, nombre, email, telefono, password_hash, rol) VALUES (?, ?, ?, ?, ?, ?)`
    );

    const usuariosData = [
      [monicaId,     'Mónica Díaz',        'admin@rustico.co',     '+573133930398', hash, 'admin'],
      [davidUsId,    'David Casierra',     'david@rustico.co',     '+573001112200', hash, 'barbero'],
      [cristianUsId, 'Cristian Villamil',  'cristian@rustico.co',  '+573002223300', hash, 'barbero'],
      [estebanUsId,  'Esteban Gómez',      'esteban@rustico.co',   '+573003334400', hash, 'barbero'],
      [julianUsId,   'Julian Vargas',      'julian@rustico.co',    '+573004445500', hash, 'barbero'],
      [leonardoUsId, 'Leonardo Dorantes',  'leonardo@rustico.co',  '+573005556600', hash, 'barbero'],
    ];

    const transInsertUsuarios = db.transaction((users: any[]) => {
      for (const u of users) insertUsuarios.run(...u);
    });
    transInsertUsuarios(usuariosData);

    // ── Barberos ─────────────────────────────────────────────────────────────────
    const davidId    = uuidv4();
    const cristianId = uuidv4();
    const estebanId  = uuidv4();
    const julianId   = uuidv4();
    const leonardoId = uuidv4();

    const insertBarberos = db.prepare(
      `INSERT INTO barberos (id, usuario_id, especialidad, porcentaje_comision, color_agenda) VALUES (?, ?, ?, ?, ?)`
    );

    const barberosData = [
      [davidId,    davidUsId,    'Head Barber — Corte clásico y técnicas premium',  50.00, '#D4921A'],
      [cristianId, cristianUsId, 'Expert Barber — Degradados y diseños modernos',   42.00, '#2A5080'],
      [estebanId,  estebanUsId,  'Expert Barber — Barba, afeitado y perfilado',     42.00, '#4A7C8E'],
      [julianId,   julianUsId,   'Expert Barber — Cortes creativos y tendencias',   42.00, '#7A5A9E'],
      [leonardoId, leonardoUsId, 'Expert Barber — Tratamientos y cortes premium',   42.00, '#2A7048'],
    ];

    const transInsertBarberos = db.transaction((barbs: any[]) => {
      for (const b of barbs) insertBarberos.run(...b);
    });
    transInsertBarberos(barberosData);

    // ── Servicios reales — Rústico Barber & Concept Shop ─────────────────────────
    const sCorte         = uuidv4();
    const sCorteVip      = uuidv4();
    const sCerquillo     = uuidv4();
    const sBarba         = uuidv4();
    const sBarbaVip      = uuidv4();
    const sTinteBarba    = uuidv4();
    const sDepilacion    = uuidv4();
    const sCombo         = uuidv4();
    const sComboMasc     = uuidv4();
    const sComboVip      = uuidv4();
    const sServicioVip   = uuidv4();
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
    const sManicure      = uuidv4();
    const sPedicure      = uuidv4();

    const insertServicios = db.prepare(
      `INSERT INTO tipo_servicios (id, nombre, descripcion, duracion_min, precio_cop, categoria) VALUES (?, ?, ?, ?, ?, ?)`
    );

    const serviciosData = [
      [sCorte,       'Corte',                                                    null, 30,  55000, 'corte'],
      [sCorteVip,    'Corte VIP',                                                null, 45,  80000, 'corte'],
      [sCerquillo,   'Cerquillo',                                                null, 15,  25000, 'corte'],
      [sBarba,       'Barba',                                                    null, 20,  50000, 'barba'],
      [sBarbaVip,    'Barba VIP',                                                null, 30,  80000, 'barba'],
      [sTinteBarba,  'Tinte Barba',                                              null, 15,  25000, 'barba'],
      [sDepilacion,  'Depilación Cejas / Nariz / Oídos',                        null, 15,  25000, 'barba'],
      [sCombo,       'Combo Corte - Barba',                                      null, 50,  99000, 'combo'],
      [sComboMasc,   'Combo Corte - Barba - Mascarilla',                        null, 70, 149000, 'combo'],
      [sComboVip,    'Combo VIP Corte - Barba',                                  null, 60, 130000, 'combo'],
      [sServicioVip, 'Servicio VIP (Spa Facial + Corte y Barba + Depilaciones)', null,120, 300000, 'combo'],
      [sKeratina,    'Keratina Completa',          null, 120, 190000, 'tratamiento'],
      [sKeratinaM,   'Keratina Mechón',            null,  90, 160000, 'tratamiento'],
      [sTinteCejas,  'Tinte Cejas',                null,  20,  50000, 'tratamiento'],
      [sTinteCabello,'Tinte Cabello',              null,  45,  70000, 'tratamiento'],
      [sDecoloracion,'Decoloración',               null,  45,  50000, 'tratamiento'],
      [sMascHidro,   'Mascarilla Hidroplástica',   null,  30,  50000, 'tratamiento'],
      [sMascColageno,'Mascarilla de Colágeno',     null,  30,  50000, 'tratamiento'],
      [sMascHidra,   'Mascarilla de Hidratación',  null,  30,  50000, 'tratamiento'],
      [sMascPuntos,  'Mascarilla Puntos Negros',   null,  20,  30000, 'tratamiento'],
      [sMascOjeras,  'Mascarilla Ojeras',          null,  20,  50000, 'tratamiento'],
      [sMascLed,     'Mascarilla Led',             null,  30,  50000, 'tratamiento'],
      [sSpaFacial,   'Spa Facial (6 Mascarillas)', null,  90, 200000, 'tratamiento'],
      [sAmpolletas,  'Ampolletas',                 null,  20,  40000, 'tratamiento'],
      [sCoctel,      'Cóctel de Hidratación',      null,  20,  40000, 'tratamiento'],
      [sManicure,    'Manicure',                   null,  30,  35000, 'otro'],
      [sPedicure,    'Pedicure',                   null,  45,  40000, 'otro'],
    ];

    const transInsertServicios = db.transaction((servs: any[]) => {
      for (const s of servs) insertServicios.run(...s);
    });
    transInsertServicios(serviciosData);

    // ── Clientes (20) ─────────────────────────────────────────────────────────────
    interface CliRow { id: string; nombre: string; tel: string; seg: string; visitas: number; gasto: number; ultimo: string | null; }
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

    const insertClientes = db.prepare(
      `INSERT INTO clientes (id,nombre,telefono,segmento,total_visitas,ticket_promedio,ultimo_servicio) VALUES (?,?,?,?,?,?,?)`
    );

    const transInsertClientes = db.transaction((clis: any[]) => {
      for (const c of clis) insertClientes.run(c.id, c.nombre, c.tel, c.seg, 0, 0, null);
    });
    transInsertClientes(clientes);

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
      { id: davidId,    pct: 50, offset:  0 },
      { id: cristianId, pct: 42, offset: 10 },
      { id: estebanId,  pct: 42, offset: 15 },
      { id: julianId,   pct: 42, offset: 20 },
      { id: leonardoId, pct: 42, offset: 25 },
    ];
    const PESO_S = SERVS.reduce((a, s) => a + s.w, 0);
    const CLI_W  = clientes.map(c => c.seg === 'vip' ? 10 : c.seg === 'frecuente' ? 6 : c.seg === 'nuevo' ? 3 : 1);
    const PESO_C = CLI_W.reduce((a, b) => a + b, 0);

    const rndS = () => { let r = Math.floor(Math.random() * PESO_S); for (const s of SERVS) { r -= s.w; if (r < 0) return s; } return SERVS[0]; };
    const rndC = () => { let r = Math.floor(Math.random() * PESO_C); for (let i = 0; i < clientes.length; i++) { r -= CLI_W[i]; if (r < 0) return clientes[i]; } return clientes[0]; };

    // ── Bucle de fechas ──────────────────────────────────────────────────────────
    const ahoraDate = new Date();
    const hoyStr    = `${ahoraDate.getFullYear()}-${pad2(ahoraDate.getMonth() + 1)}-${pad2(ahoraDate.getDate())}`;
    const ahoraMins = ahoraDate.getHours() * 60 + ahoraDate.getMinutes();

    const agendaRows:   any[] = [];
    const comisionRows: any[] = [];

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
    const insertAgenda = db.prepare(
      `INSERT INTO agenda (id,cliente_id,barbero_id,servicio_id,inicio,fin,estado,precio_cop,notas,token_confirmacion,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    );

    const transInsertAgenda = db.transaction((rows: any[]) => {
      for (const r of rows) insertAgenda.run(...r);
    });
    transInsertAgenda(agendaRows);
    console.log(`  ✓ ${agendaRows.length} citas`);

    // ── Insert comisiones ─────────────────────────────────────────────────────────
    const insertComisiones = db.prepare(
      `INSERT INTO comisiones (id,barbero_id,cita_id,monto_cop,porcentaje,estado,periodo) VALUES (?,?,?,?,?,?,?)`
    );

    const transInsertComisiones = db.transaction((rows: any[]) => {
      for (const r of rows) insertComisiones.run(...r);
    });
    transInsertComisiones(comisionRows);
    console.log(`  ✓ ${comisionRows.length} comisiones`);

    // ── Actualizar stats de clientes ──────────────────────────────────────────────
    const updateCliente = db.prepare(
      `UPDATE clientes SET total_visitas=?, ticket_promedio=?, ultimo_servicio=? WHERE id=?`
    );

    const transUpdateClientes = db.transaction((clis: any[]) => {
      for (const c of clis) {
        if (c.visitas > 0) {
          updateCliente.run(c.visitas, Math.round(c.gasto / c.visitas), c.ultimo, c.id);
        }
      }
    });
    transUpdateClientes(clientes);

    // ── Gastos fijos mensuales ────────────────────────────────────────────────────
    const GASTOS = [
      { concepto: 'Arriendo local Cra. 13 #78-17',        monto: 1800000, cat: 'arriendo',      dia: '01' },
      { concepto: 'Insumos y productos profesionales',     monto: 430000,  cat: 'insumos',       dia: '05' },
      { concepto: 'Servicios públicos — luz y agua',       monto: 240000,  cat: 'servicios',     dia: '10' },
      { concepto: 'Pauta digital y redes sociales',        monto: 150000,  cat: 'marketing',     dia: '15' },
      { concepto: 'Mantenimiento y productos de limpieza', monto: 95000,   cat: 'mantenimiento', dia: '20' },
    ];

    const insertGasto = db.prepare(
      `INSERT INTO gastos (id,concepto,monto_cop,categoria,fecha,creado_por) VALUES (?,?,?,?,?,?)`
    );

    const transInsertGastos = db.transaction((gastos: any[]) => {
      for (const g of gastos) insertGasto.run(...g);
    });

    const gastosRows = [];
    for (const mes of ['2026-03', '2026-04', '2026-05']) {
      for (const g of GASTOS) {
        const fecha = `${mes}-${g.dia}`;
        if (fecha > hoyStr) continue;
        gastosRows.push([uuidv4(), g.concepto, g.monto, g.cat, fecha, monicaId]);
      }
    }
    transInsertGastos(gastosRows);

    console.log('✅ Seed completado — Rústico BarberAdmin listo');
  } catch (error) {
    console.error('❌ Error al aplicar seed:', error);
    throw error;
  }
}

export function initDatabase() {
  try {
    for (const ddl of TABLES) {
      db.exec(ddl);
    }
    console.log('✅ Schema SQLite aplicado');
    aplicarSeed();
  } catch (error) {
    console.error('❌ Error al inicializar base de datos:', error);
    throw error;
  }
}
