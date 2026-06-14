/**
 * SERVICIOS / PRODUCTOS / COMBOS — Suite completa
 * Cubre: CRUD completo de catálogo, toggle activo, validaciones.
 */
import request from 'supertest';
import app from '../app';
import { closePool } from '../shared/database/pg.client';
import { db } from './helpers/db';
import { createAdmin, createServicio } from './helpers/fixtures';

const api = () => request(app);
let admin: Awaited<ReturnType<typeof createAdmin>>;

beforeAll(async () => {
  await db.truncateAll();
  admin = await createAdmin({ email: 'svc-admin@test.co' });
});

afterAll(async () => {
  await closePool();
});

// ─── SERVICIOS ──────────────────────────────────────────────────────────────────
describe('CRUD /api/v1/servicios', () => {
  let svcId: string;

  it('lista servicios activos', async () => {
    await createServicio({ nombre: 'Svc Lista' });
    const res = await api()
      .get('/api/v1/servicios')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('crea servicio', async () => {
    const res = await api()
      .post('/api/v1/servicios')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ nombre: 'Corte QA Pro', duracion_min: 45, precio_cop: 75000, categoria: 'corte' });

    expect(res.status).toBe(201);
    expect(res.body.data.nombre).toBe('Corte QA Pro');
    expect(Number(res.body.data.precio_cop)).toBe(75000);
    svcId = res.body.data.id;
  });

  it('actualiza servicio', async () => {
    const res = await api()
      .put(`/api/v1/servicios/${svcId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ precio_cop: 80000 });

    expect(res.status).toBe(200);
    expect(Number(res.body.data.precio_cop)).toBe(80000);
  });

  it('desactiva servicio', async () => {
    const res = await api()
      .patch(`/api/v1/servicios/${svcId}/activo`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ activo: false });

    expect(res.status).toBe(200);
    expect(res.body.data.activo).toBe(false);
  });

  it('no aparece en listado cuando está inactivo', async () => {
    const res = await api()
      .get('/api/v1/servicios')
      .set('Authorization', `Bearer ${admin.token}`);

    const encontrado = res.body.data.find((s: any) => s.id === svcId);
    expect(encontrado).toBeUndefined();
  });
});

// ─── PRODUCTOS ──────────────────────────────────────────────────────────────────
describe('CRUD /api/v1/productos', () => {
  let prodId: string;

  it('crea producto', async () => {
    const res = await api()
      .post('/api/v1/productos')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ nombre: 'Pomada QA', precio_cop: 35000, categoria: 'cuidado' });

    expect(res.status).toBe(201);
    expect(res.body.data.nombre).toBe('Pomada QA');
    prodId = res.body.data.id;
  });

  it('lista productos activos', async () => {
    const res = await api()
      .get('/api/v1/productos')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some((p: any) => p.id === prodId)).toBe(true);
  });

  it('actualiza precio del producto', async () => {
    const res = await api()
      .put(`/api/v1/productos/${prodId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ precio_cop: 40000 });

    expect(res.status).toBe(200);
    expect(Number(res.body.data.precio_cop)).toBe(40000);
  });

  it('desactiva producto', async () => {
    const res = await api()
      .patch(`/api/v1/productos/${prodId}/activo`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ activo: false });

    expect(res.status).toBe(200);
    expect(res.body.data.activo).toBe(false);
  });
});

// ─── COMBOS ─────────────────────────────────────────────────────────────────────
describe('CRUD /api/v1/combos', () => {
  let comboId: string;
  let svcItem: Awaited<ReturnType<typeof createServicio>>;

  beforeAll(async () => {
    svcItem = await createServicio({ nombre: 'Svc Combo Item', precio_cop: 50000 });
  });

  it('crea combo con items', async () => {
    const res = await api()
      .post('/api/v1/combos')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        nombre:      'Combo QA',
        precio_cop:  90000,
        descripcion: 'Corte + barba',
        items: [
          { tipo: 'servicio', item_id: svcItem.id, cantidad: 1 },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.nombre).toBe('Combo QA');
    expect(res.body.data.items.length).toBe(1);
    comboId = res.body.data.id;
  });

  it('lista combos activos', async () => {
    const res = await api()
      .get('/api/v1/combos')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some((c: any) => c.id === comboId)).toBe(true);
  });

  it('actualiza precio del combo', async () => {
    const res = await api()
      .put(`/api/v1/combos/${comboId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ precio_cop: 95000 });

    expect(res.status).toBe(200);
    expect(Number(res.body.data.precio_cop)).toBe(95000);
  });
});
