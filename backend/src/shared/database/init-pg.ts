import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { query, execute, closePool, uuidv4 } from './pg.client';

const MIGRATIONS_DIR = path.join(__dirname, '../../../../../database/migrations');

async function aplicarMigraciones() {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    try {
      await execute(sql);
      console.log(`  ✓ ${file}`);
    } catch (err: any) {
      if (err.code === '42P07' || err.code === '42710') {
        // tabla/tipo ya existe — skip
      } else {
        throw err;
      }
    }
  }
}

async function aplicarSeed() {
  const rows = await query('SELECT COUNT(*) as n FROM usuarios');
  const n = Number((rows[0] as any).n);
  if (n > 0) {
    console.log('ℹ️  Base de datos ya tiene datos — omitiendo seed');
    return;
  }

  console.log('🌱 Generando datos iniciales — Rústico BarberAdmin...');
  const hash = bcrypt.hashSync('password', 10);
  const pad2 = (v: number) => String(v).padStart(2, '0');
  const minToTS = (fecha: string, m: number) =>
    `${fecha}T${pad2(Math.floor(m / 60))}:${pad2(m % 60)}:00-05:00`;

  // ── Usuarios ─────────────────────────────────────────────────────────────
  const monicaId     = uuidv4();
  const davidUsId    = uuidv4();
  const cristianUsId = uuidv4();
  const estebanUsId  = uuidv4();
  const julianUsId   = uuidv4();
  const leonardoUsId = uuidv4();

  const usuariosData = [
    [monicaId,     'Mónica Díaz',       'admin@rustico.co',    '+573133930398', hash, 'admin'],
    [davidUsId,    'David Casierra',    'david@rustico.co',    '+573001112200', hash, 'barbero'],
    [cristianUsId, 'Cristian Villamil', 'cristian@rustico.co', '+573002223300', hash, 'barbero'],
    [estebanUsId,  'Esteban Gómez',     'esteban@rustico.co',  '+573003334400', hash, 'barbero'],
    [julianUsId,   'Julian Vargas',     'julian@rustico.co',   '+573004445500', hash, 'barbero'],
    [leonardoUsId, 'Leonardo Dorantes', 'leonardo@rustico.co', '+573005556600', hash, 'barbero'],
  ];
  for (const u of usuariosData) {
    await execute(
      `INSERT INTO usuarios (id, nombre, email, telefono, password_hash, rol) VALUES ($1,$2,$3,$4,$5,$6)`,
      u,
    );
  }

  // ── Barberos ─────────────────────────────────────────────────────────────
  const davidId    = uuidv4();
  const cristianId = uuidv4();
  const estebanId  = uuidv4();
  const julianId   = uuidv4();
  const leonardoId = uuidv4();

  const barberosData = [
    [davidId,    davidUsId,    'Head Barber — Corte clásico y técnicas premium', 50.00, '#D4921A'],
    [cristianId, cristianUsId, 'Expert Barber — Degradados y diseños modernos',  42.00, '#2A5080'],
    [estebanId,  estebanUsId,  'Expert Barber — Barba, afeitado y perfilado',    42.00, '#4A7C8E'],
    [julianId,   julianUsId,   'Expert Barber — Cortes creativos y tendencias',  42.00, '#7A5A9E'],
    [leonardoId, leonardoUsId, 'Expert Barber — Tratamientos y cortes premium',  42.00, '#2A7048'],
  ];
  for (const b of barberosData) {
    await execute(
      `INSERT INTO barberos (id, usuario_id, especialidad, porcentaje_comision, color_agenda) VALUES ($1,$2,$3,$4,$5)`,
      b,
    );
  }

  // ── Servicios ─────────────────────────────────────────────────────────────
  const sCorte      = uuidv4(); const sCorteVip   = uuidv4(); const sCerquillo  = uuidv4();
  const sBarba      = uuidv4(); const sBarbaVip   = uuidv4(); const sTinteBarba = uuidv4();
  const sDepilacion = uuidv4(); const sCombo      = uuidv4(); const sComboMasc  = uuidv4();
  const sComboVip   = uuidv4(); const sServVip    = uuidv4(); const sKeratina   = uuidv4();
  const sKeratinaM  = uuidv4(); const sTinteCejas = uuidv4(); const sTinteCab   = uuidv4();
  const sDecolor    = uuidv4(); const sMascHidro  = uuidv4(); const sMascCola   = uuidv4();
  const sMascHidra  = uuidv4(); const sMascPuntos = uuidv4(); const sMascOj     = uuidv4();
  const sMascLed    = uuidv4(); const sSpaFacial  = uuidv4(); const sAmpolletas = uuidv4();
  const sCoctel     = uuidv4(); const sManicure   = uuidv4(); const sPedicure   = uuidv4();

  const serviciosData = [
    [sCorte,      'Corte',                                                    null, 30,  55000, 'corte'],
    [sCorteVip,   'Corte VIP',                                                null, 45,  80000, 'corte'],
    [sCerquillo,  'Cerquillo',                                                null, 15,  25000, 'corte'],
    [sBarba,      'Barba',                                                    null, 20,  50000, 'barba'],
    [sBarbaVip,   'Barba VIP',                                                null, 30,  80000, 'barba'],
    [sTinteBarba, 'Tinte Barba',                                              null, 15,  25000, 'barba'],
    [sDepilacion, 'Depilación Cejas / Nariz / Oídos',                        null, 15,  25000, 'barba'],
    [sCombo,      'Combo Corte - Barba',                                      null, 50,  99000, 'combo'],
    [sComboMasc,  'Combo Corte - Barba - Mascarilla',                        null, 70, 149000, 'combo'],
    [sComboVip,   'Combo VIP Corte - Barba',                                  null, 60, 130000, 'combo'],
    [sServVip,    'Servicio VIP (Spa Facial + Corte y Barba + Depilaciones)', null,120, 300000, 'combo'],
    [sKeratina,   'Keratina Completa',         null, 120, 190000, 'tratamiento'],
    [sKeratinaM,  'Keratina Mechón',           null,  90, 160000, 'tratamiento'],
    [sTinteCejas, 'Tinte Cejas',               null,  20,  50000, 'tratamiento'],
    [sTinteCab,   'Tinte Cabello',             null,  45,  70000, 'tratamiento'],
    [sDecolor,    'Decoloración',              null,  45,  50000, 'tratamiento'],
    [sMascHidro,  'Mascarilla Hidroplástica',  null,  30,  50000, 'tratamiento'],
    [sMascCola,   'Mascarilla de Colágeno',    null,  30,  50000, 'tratamiento'],
    [sMascHidra,  'Mascarilla de Hidratación', null,  30,  50000, 'tratamiento'],
    [sMascPuntos, 'Mascarilla Puntos Negros',  null,  20,  30000, 'tratamiento'],
    [sMascOj,     'Mascarilla Ojeras',         null,  20,  50000, 'tratamiento'],
    [sMascLed,    'Mascarilla Led',            null,  30,  50000, 'tratamiento'],
    [sSpaFacial,  'Spa Facial (6 Mascarillas)',null,  90, 200000, 'tratamiento'],
    [sAmpolletas, 'Ampolletas',                null,  20,  40000, 'tratamiento'],
    [sCoctel,     'Cóctel de Hidratación',     null,  20,  40000, 'tratamiento'],
    [sManicure,   'Manicure',                  null,  30,  35000, 'otro'],
    [sPedicure,   'Pedicure',                  null,  45,  40000, 'otro'],
  ];
  for (const s of serviciosData) {
    await execute(
      `INSERT INTO tipo_servicios (id, nombre, descripcion, duracion_min, precio_cop, categoria) VALUES ($1,$2,$3,$4,$5,$6)`,
      s,
    );
  }

  // ── Clientes ──────────────────────────────────────────────────────────────
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
  for (const c of clientes) {
    await execute(
      `INSERT INTO clientes (id, nombre, telefono, segmento, total_visitas, ticket_promedio) VALUES ($1,$2,$3,$4,0,0)`,
      [c.id, c.nombre, c.tel, c.seg],
    );
  }

  // ── Generador de citas ────────────────────────────────────────────────────
  const SERVS = [
    { id: sCorte,     dur: 30,  precio:  55000, w: 28 },
    { id: sBarba,     dur: 20,  precio:  50000, w: 16 },
    { id: sCombo,     dur: 50,  precio:  99000, w: 20 },
    { id: sComboVip,  dur: 60,  precio: 130000, w:  8 },
    { id: sCerquillo, dur: 15,  precio:  25000, w:  8 },
    { id: sMascHidra, dur: 30,  precio:  50000, w:  8 },
    { id: sKeratina,  dur: 120, precio: 190000, w:  5 },
    { id: sCorteVip,  dur: 45,  precio:  80000, w:  7 },
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

  const ahoraDate = new Date();
  const hoyStr    = ahoraDate.toISOString().slice(0, 10);
  const ahoraMins = ahoraDate.getHours() * 60 + ahoraDate.getMinutes();

  const agendaRows:   any[][] = [];
  const comisionRows: any[][] = [];

  let cursor = new Date('2026-03-01T12:00:00');
  const finDate = new Date(`${hoyStr}T23:59:59`);

  while (cursor <= finDate) {
    const dow    = cursor.getDay();
    const fechaS = cursor.toISOString().slice(0, 10);
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
            estado = min < ahoraMins
              ? (Math.random() < 0.83 ? 'completada' : Math.random() < 0.93 ? 'cancelada' : 'no_show')
              : (Math.random() < 0.68 ? 'confirmada' : 'pendiente');
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
            minToTS(fechaS, min), minToTS(fechaS, finMin),
            estado, serv.precio, null, uuidv4().replace(/-/g,'').slice(0,16), monicaId,
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

  // Insert citas en batches
  for (let i = 0; i < agendaRows.length; i += 50) {
    const batch = agendaRows.slice(i, i + 50);
    for (const r of batch) {
      await execute(
        `INSERT INTO agenda (id,cliente_id,barbero_id,servicio_id,inicio,fin,estado,precio_cop,notas,token_confirmacion,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        r,
      );
    }
  }
  console.log(`  ✓ ${agendaRows.length} citas`);

  for (const r of comisionRows) {
    await execute(
      `INSERT INTO comisiones (id,barbero_id,cita_id,monto_cop,porcentaje,estado,periodo)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (cita_id) DO NOTHING`,
      r,
    );
  }
  console.log(`  ✓ ${comisionRows.length} comisiones`);

  // Actualizar stats clientes
  for (const c of clientes) {
    if (c.visitas > 0) {
      await execute(
        `UPDATE clientes SET total_visitas=$1, ticket_promedio=$2, ultimo_servicio=$3 WHERE id=$4`,
        [c.visitas, Math.round(c.gasto / c.visitas), c.ultimo, c.id],
      );
    }
  }

  // Gastos fijos
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
      await execute(
        `INSERT INTO gastos (id,concepto,monto_cop,categoria,fecha,creado_por) VALUES ($1,$2,$3,$4,$5,$6)`,
        [uuidv4(), g.concepto, g.monto, g.cat, fecha, monicaId],
      );
    }
  }

  console.log('✅ Seed completado — Rústico BarberAdmin listo');
}

export async function initDatabase() {
  console.log('🔌 Conectando a PostgreSQL...');
  await aplicarMigraciones();
  console.log('✅ Migraciones aplicadas');
  await aplicarSeed();
}

// Ejecutar directamente: ts-node init-pg.ts
if (require.main === module) {
  initDatabase()
    .catch(err => { console.error('❌ Error:', err); process.exitCode = 1; })
    .finally(closePool);
}
