/**
 * FINANCIERO — Suite completa
 * Cubre: resumen período, comisiones (listar/pagar), gastos (CRUD), cierre de caja,
 *        resumen mensual múltiple. Verifica lógica de rentabilidad.
 */
import request from 'supertest';
import app from '../app';
import { closePool } from '../shared/database/pg.client';
import { db } from './helpers/db';
import { createAdmin, createBarbero, createServicio, createCliente, createCita } from './helpers/fixtures';

const api = () => request(app);

let admin:    Awaited<ReturnType<typeof createAdmin>>;
let barbero:  Awaited<ReturnType<typeof createBarbero>>;
let servicio: Awaited<ReturnType<typeof createServicio>>;
let cliente:  Awaited<ReturnType<typeof createCliente>>;

const hoy = () => new Date().toISOString().split('T')[0];
const ayer = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

beforeAll(async () => {
  await db.truncateAll();
  admin    = await createAdmin({ email: 'fin-admin@test.co' });
  barbero  = await createBarbero({ nombre: 'Barbero Fin', email: 'fin-barber@test.co', porcentaje: 40 });
  servicio = await createServicio({ nombre: 'Svc Financiero', precio_cop: 100000 });
  cliente  = await createCliente({ nombre: 'Cliente Fin' });

  // Cita completada → genera comisión al marcar como completada
  const cita = await createCita({
    barberoId: barbero.barberoId,
    servicioId: servicio.id,
    createdBy: admin.id,
    clienteId: cliente.id,
    estado: 'confirmada',
  });

  // Completar la cita vía API para que se genere la comisión
  await api()
    .patch(`/api/v1/agenda/${cita.id}/estado`)
    .set('Authorization', `Bearer ${admin.token}`)
    .send({ estado: 'completada' });
});

afterAll(async () => {
  await closePool();
});

// ─── Resumen período ───────────────────────────────────────────────────────────
describe('GET /api/v1/financiero/resumen', () => {
  it('retorna totales del período solicitado', async () => {
    const hoyStr = hoy();
    const res = await api()
      .get(`/api/v1/financiero/resumen?desde=${hoyStr}&hasta=${hoyStr}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d).toHaveProperty('total_citas');
    expect(d).toHaveProperty('ingresos_brutos');
    expect(d).toHaveProperty('comisiones_total');
    expect(d).toHaveProperty('neto_barberia');
    expect(d).toHaveProperty('porBarbero');
    expect(Array.isArray(d.porBarbero)).toBe(true);
  });

  it('verifica que neto_barberia = ingresos - comisiones', async () => {
    const hoyStr = hoy();
    const res = await api()
      .get(`/api/v1/financiero/resumen?desde=${hoyStr}&hasta=${hoyStr}`)
      .set('Authorization', `Bearer ${admin.token}`);

    const d = res.body.data;
    const esperado = Number(d.ingresos_brutos) - Number(d.comisiones_total);
    expect(Number(d.neto_barberia)).toBeCloseTo(esperado, 0);
  });

  it('sin token → 401', async () => {
    const res = await api().get(`/api/v1/financiero/resumen?desde=${hoy()}&hasta=${hoy()}`);
    expect(res.status).toBe(401);
  });
});

// ─── Comisiones ────────────────────────────────────────────────────────────────
describe('GET /api/v1/financiero/comisiones', () => {
  it('lista comisiones pendientes', async () => {
    const res = await api()
      .get('/api/v1/financiero/comisiones?estado=pendiente')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0]).toHaveProperty('monto_cop');
    expect(res.body.data[0]).toHaveProperty('barbero_nombre');
  });
});

describe('POST /api/v1/financiero/comisiones/pagar', () => {
  it('paga comisiones seleccionadas', async () => {
    // Obtener IDs de comisiones pendientes
    const list = await api()
      .get('/api/v1/financiero/comisiones?estado=pendiente')
      .set('Authorization', `Bearer ${admin.token}`);

    const ids = list.body.data.slice(0, 1).map((c: any) => c.id);
    expect(ids.length).toBeGreaterThan(0);

    const res = await api()
      .post('/api/v1/financiero/comisiones/pagar')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ ids });

    expect(res.status).toBe(200);
    expect(res.body.data.actualizadas).toBe(ids.length);

    // Verificar que cambió a 'pagada'
    const after = await db.rows(`SELECT estado FROM comisiones WHERE id = '${ids[0]}'`);
    expect(after[0].estado).toBe('pagada');
  });

  it('body vacío → 400', async () => {
    const res = await api()
      .post('/api/v1/financiero/comisiones/pagar')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ ids: [] });

    expect(res.status).toBe(400);
  });
});

// ─── Gastos ────────────────────────────────────────────────────────────────────
describe('CRUD /api/v1/financiero/gastos', () => {
  let gastoId: string;

  it('crea gasto correctamente', async () => {
    const res = await api()
      .post('/api/v1/financiero/gastos')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        concepto:  'Arriendo local',
        monto_cop: 1800000,
        categoria: 'arriendo',
        fecha:     hoy(),
      });

    expect(res.status).toBe(201);
    expect(res.body.data.concepto).toBe('Arriendo local');
    expect(Number(res.body.data.monto_cop)).toBe(1800000);
    gastoId = res.body.data.id;
  });

  it('lista gastos del período', async () => {
    const res = await api()
      .get(`/api/v1/financiero/gastos?desde=${hoy()}&hasta=${hoy()}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((g: any) => g.id === gastoId)).toBe(true);
  });

  it('actualiza gasto', async () => {
    const res = await api()
      .put(`/api/v1/financiero/gastos/${gastoId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ monto_cop: 2000000, notas: 'Incremento de renta' });

    expect(res.status).toBe(200);
    expect(Number(res.body.data.monto_cop)).toBe(2000000);
    expect(res.body.data.notas).toContain('renta');
  });

  it('rechaza monto negativo → 400', async () => {
    const res = await api()
      .post('/api/v1/financiero/gastos')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ concepto: 'Negativo', monto_cop: -100, categoria: 'otros', fecha: hoy() });

    expect(res.status).toBe(400);
  });

  it('elimina gasto', async () => {
    const res = await api()
      .delete(`/api/v1/financiero/gastos/${gastoId}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.eliminado).toBe(true);

    const gone = await db.row(`SELECT id FROM gastos WHERE id = '${gastoId}'`);
    expect(gone).toBeUndefined();
  });
});

// ─── Cierre de caja ────────────────────────────────────────────────────────────
describe('GET /api/v1/financiero/cierre', () => {
  it('retorna datos de cierre con adelantos y balance', async () => {
    const hoyStr = hoy();
    const res = await api()
      .get(`/api/v1/financiero/cierre?desde=${hoyStr}&hasta=${hoyStr}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d).toHaveProperty('efectivo_caja');
    expect(d).toHaveProperty('balance_final');
    expect(d).toHaveProperty('total_adelantos');
    expect(d).toHaveProperty('adelantosPorBarbero');
    expect(d).toHaveProperty('gastosDetalle');
  });
});

// ─── Resumen mensual ───────────────────────────────────────────────────────────
describe('GET /api/v1/financiero/mensual', () => {
  it('retorna evolución mensual con rentabilidad', async () => {
    const res = await api()
      .get('/api/v1/financiero/mensual?meses=3')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    if (res.body.data.length > 0) {
      const mes = res.body.data[0];
      expect(mes).toHaveProperty('mes');
      expect(mes).toHaveProperty('ingresos');
      expect(mes).toHaveProperty('gastos');
      expect(mes).toHaveProperty('rentabilidad');
    }
  });
});
