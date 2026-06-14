/**
 * ADELANTOS — Suite completa
 * Cubre: resumen del día, crear adelanto, anular adelanto, validaciones.
 */
import request from 'supertest';
import app from '../app';
import { closePool } from '../shared/database/pg.client';
import { db } from './helpers/db';
import { createAdmin, createBarbero } from './helpers/fixtures';

const api = () => request(app);
const hoy = () => new Date().toISOString().split('T')[0];

let admin:   Awaited<ReturnType<typeof createAdmin>>;
let barbero: Awaited<ReturnType<typeof createBarbero>>;

beforeAll(async () => {
  await db.truncateAll();
  admin   = await createAdmin({ email: 'adelantos-admin@test.co' });
  barbero = await createBarbero({ nombre: 'Barbero Adelantos', email: 'adel-barber@test.co' });
});

afterAll(async () => {
  await closePool();
});

// ─── Resumen del día ────────────────────────────────────────────────────────────
describe('GET /api/v1/adelantos/resumen', () => {
  it('retorna resumen diario de adelantos', async () => {
    const res = await api()
      .get(`/api/v1/adelantos/resumen?fecha=${hoy()}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('total_adelantos');
    expect(res.body.data).toHaveProperty('porBarbero');
    expect(Array.isArray(res.body.data.porBarbero)).toBe(true);
  });

  it('sin token → 401', async () => {
    const res = await api().get(`/api/v1/adelantos/resumen?fecha=${hoy()}`);
    expect(res.status).toBe(401);
  });
});

// ─── Crear adelanto ─────────────────────────────────────────────────────────────
describe('POST /api/v1/adelantos', () => {
  it('crea adelanto para un barbero', async () => {
    const res = await api()
      .post('/api/v1/adelantos')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        barbero_id: barbero.barberoId,
        monto_cop:  80000,
        concepto:   'Adelanto quincena',
        fecha:      hoy(),
      });

    expect(res.status).toBe(201);
    expect(res.body.data.barbero_id).toBe(barbero.barberoId);
    expect(Number(res.body.data.monto_cop)).toBe(80000);
    expect(res.body.data.estado).toBe('activo');
  });

  it('rechaza monto cero → 400', async () => {
    const res = await api()
      .post('/api/v1/adelantos')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        barbero_id: barbero.barberoId,
        monto_cop:  0,
        fecha:      hoy(),
      });

    expect(res.status).toBe(400);
  });

  it('rechaza monto negativo → 400', async () => {
    const res = await api()
      .post('/api/v1/adelantos')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        barbero_id: barbero.barberoId,
        monto_cop:  -5000,
        fecha:      hoy(),
      });

    expect(res.status).toBe(400);
  });

  it('rechaza barbero_id inexistente → 400', async () => {
    const res = await api()
      .post('/api/v1/adelantos')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        barbero_id: '00000000-0000-0000-0000-000000000000',
        monto_cop:  50000,
        fecha:      hoy(),
      });

    expect(res.status).toBe(400);
  });
});

// ─── Listar adelantos ───────────────────────────────────────────────────────────
describe('GET /api/v1/adelantos', () => {
  it('lista adelantos del período', async () => {
    const res = await api()
      .get(`/api/v1/adelantos?desde=${hoy()}&hasta=${hoy()}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const adelanto = res.body.data[0];
    expect(adelanto).toHaveProperty('monto_cop');
    expect(adelanto).toHaveProperty('barbero_nombre');
    expect(adelanto).toHaveProperty('estado');
  });

  it('filtra por barbero', async () => {
    const res = await api()
      .get(`/api/v1/adelantos?desde=${hoy()}&hasta=${hoy()}&barbero_id=${barbero.barberoId}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.every((a: any) => a.barbero_id === barbero.barberoId)).toBe(true);
  });
});

// ─── Anular adelanto ────────────────────────────────────────────────────────────
describe('DELETE /api/v1/adelantos/:id', () => {
  let adelantoId: string;

  beforeAll(async () => {
    const res = await api()
      .post('/api/v1/adelantos')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        barbero_id: barbero.barberoId,
        monto_cop:  30000,
        concepto:   'Adelanto para anular',
        fecha:      hoy(),
      });
    adelantoId = res.body.data.id;
  });

  it('anula el adelanto (soft delete → estado anulado)', async () => {
    const res = await api()
      .delete(`/api/v1/adelantos/${adelantoId}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);

    // Verificar directamente en BD que cambió a estado 'anulado'
    const row = await db.row<{ estado: string }>(
      `SELECT estado FROM adelantos WHERE id = '${adelantoId}'`,
    );
    expect(row?.estado).toBe('anulado');
  });

  it('ID inexistente → 404', async () => {
    const res = await api()
      .delete('/api/v1/adelantos/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(404);
  });
});
