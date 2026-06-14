/**
 * ESTADÍSTICAS — Suite completa
 * Cubre: evolución mensual, KPIs del negocio, operaciones diarias,
 *        análisis de clientes, insights de rentabilidad.
 */
import request from 'supertest';
import app from '../app';
import { closePool } from '../shared/database/pg.client';
import { db } from './helpers/db';
import { createAdmin, createBarbero, createServicio, createCliente, createCita } from './helpers/fixtures';

const api = () => request(app);
const hoy = () => new Date().toISOString().split('T')[0];

let admin:   Awaited<ReturnType<typeof createAdmin>>;

beforeAll(async () => {
  await db.truncateAll();
  admin = await createAdmin({ email: 'stats-admin@test.co' });

  // Poblar datos mínimos para que los endpoints no devuelvan arrays vacíos
  const barbero  = await createBarbero({ nombre: 'Barbero Stats', email: 'barber-stats@test.co', porcentaje: 40 });
  const servicio = await createServicio({ nombre: 'Svc Stats', precio_cop: 60000 });
  const cliente  = await createCliente({ nombre: 'Cliente Stats' });

  const cita = await createCita({
    barberoId:  barbero.barberoId,
    servicioId: servicio.id,
    createdBy:  admin.id,
    clienteId:  cliente.id,
    estado:     'confirmada',
  });

  // Completar cita para generar ingreso + comisión
  await api()
    .patch(`/api/v1/agenda/${cita.id}/estado`)
    .set('Authorization', `Bearer ${admin.token}`)
    .send({ estado: 'completada' });
});

afterAll(async () => {
  await closePool();
});

// ─── Evolución mensual ──────────────────────────────────────────────────────────
describe('GET /api/v1/estadisticas/evolucion', () => {
  it('retorna array con datos de evolución', async () => {
    const res = await api()
      .get('/api/v1/estadisticas/evolucion?meses=3')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);

    if (res.body.data.length > 0) {
      const punto = res.body.data[0];
      expect(punto).toHaveProperty('mes');
      expect(punto).toHaveProperty('ingresos');
      expect(punto).toHaveProperty('citas');
    }
  });

  it('sin token → 401', async () => {
    const res = await api().get('/api/v1/estadisticas/evolucion');
    expect(res.status).toBe(401);
  });
});

// ─── KPIs del negocio ───────────────────────────────────────────────────────────
describe('GET /api/v1/estadisticas/kpis', () => {
  it('retorna KPIs con ticket promedio y ocupación', async () => {
    const res = await api()
      .get(`/api/v1/estadisticas/kpis?desde=${hoy()}&hasta=${hoy()}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d).toHaveProperty('ticket_promedio');
    expect(d).toHaveProperty('total_citas');
    expect(d).toHaveProperty('tasa_completadas');
    expect(typeof d.tasa_completadas).toBe('number');
    expect(d.tasa_completadas).toBeGreaterThanOrEqual(0);
    expect(d.tasa_completadas).toBeLessThanOrEqual(100);
  });

  it('tasa_completadas entre 0 y 100', async () => {
    const res = await api()
      .get(`/api/v1/estadisticas/kpis?desde=${hoy()}&hasta=${hoy()}`)
      .set('Authorization', `Bearer ${admin.token}`);

    const tasa = Number(res.body.data.tasa_completadas);
    expect(tasa).toBeGreaterThanOrEqual(0);
    expect(tasa).toBeLessThanOrEqual(100);
  });
});

// ─── Operaciones diarias ────────────────────────────────────────────────────────
describe('GET /api/v1/estadisticas/operaciones', () => {
  it('retorna resumen operativo del período', async () => {
    const res = await api()
      .get(`/api/v1/estadisticas/operaciones?desde=${hoy()}&hasta=${hoy()}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('citas_completadas');
    expect(res.body.data).toHaveProperty('ingresos_cop');
    expect(res.body.data).toHaveProperty('hora_pico');
  });
});

// ─── Análisis de clientes ────────────────────────────────────────────────────────
describe('GET /api/v1/estadisticas/clientes', () => {
  it('retorna distribución de segmentos', async () => {
    const res = await api()
      .get('/api/v1/estadisticas/clientes')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d).toHaveProperty('total');
    expect(d).toHaveProperty('porSegmento');
    expect(Array.isArray(d.porSegmento)).toBe(true);
    expect(d).toHaveProperty('nuevosEsteMes');
    expect(typeof d.nuevosEsteMes).toBe('number');
  });
});

// ─── Insights de rentabilidad ───────────────────────────────────────────────────
describe('GET /api/v1/estadisticas/insights', () => {
  it('retorna insights con servicio y barbero más rentable', async () => {
    const res = await api()
      .get(`/api/v1/estadisticas/insights?desde=${hoy()}&hasta=${hoy()}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    const d = res.body.data;
    // Los campos pueden ser null si no hay datos suficientes
    expect(d).toHaveProperty('servicio_top');
    expect(d).toHaveProperty('barbero_top');
    expect(d).toHaveProperty('dia_mas_rentable');
  });
});
