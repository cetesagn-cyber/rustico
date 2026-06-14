/**
 * CLIENTES — Suite completa
 * Cubre: crear, listar (paginación, filtros), obtener, actualizar,
 *        historial de citas, resumen, segmentación automática.
 */
import request from 'supertest';
import app from '../app';
import { closePool } from '../shared/database/pg.client';
import { db } from './helpers/db';
import {
  createAdmin, createBarbero, createServicio,
  createCliente, createCita,
} from './helpers/fixtures';

const api = () => request(app);

let admin:   Awaited<ReturnType<typeof createAdmin>>;

beforeAll(async () => {
  await db.truncateAll();
  admin = await createAdmin({ email: 'clientes-admin@test.co' });

  // Crear 15 clientes de relleno para probar paginación
  for (let i = 0; i < 15; i++) {
    await createCliente({ nombre: `Cliente Pagina ${i}` });
  }
});

afterAll(async () => {
  await closePool();
});

// ─── Listar / Paginación ───────────────────────────────────────────────────────
describe('GET /api/v1/clientes', () => {
  it('retorna primera página con total', async () => {
    const res = await api()
      .get('/api/v1/clientes?pagina=1&limite=10')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.clientes.length).toBeLessThanOrEqual(10);
    expect(typeof res.body.data.total).toBe('number');
    expect(typeof res.body.data.totalPaginas).toBe('number');
    expect(res.body.data.pagina).toBe(1);
  });

  it('filtra por búsqueda de nombre', async () => {
    await createCliente({ nombre: 'BuscaMe ÚnicoXYZ' });

    const res = await api()
      .get('/api/v1/clientes?busqueda=BuscaMe')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.clientes.some((c: any) =>
      c.nombre.includes('BuscaMe'),
    )).toBe(true);
  });

  it('filtra por segmento', async () => {
    await createCliente({ nombre: 'Cliente VIP Test' });
    await db.rows(`UPDATE clientes SET segmento = 'vip' WHERE nombre = 'Cliente VIP Test'`);

    const res = await api()
      .get('/api/v1/clientes?segmento=vip')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.clientes.every((c: any) => c.segmento === 'vip')).toBe(true);
  });

  it('sin token → 401', async () => {
    const res = await api().get('/api/v1/clientes');
    expect(res.status).toBe(401);
  });
});

// ─── Crear ─────────────────────────────────────────────────────────────────────
describe('POST /api/v1/clientes', () => {
  it('crea cliente con datos básicos', async () => {
    const res = await api()
      .post('/api/v1/clientes')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        nombre:   'Juan Nuevo',
        telefono: '+573001234500',
        email:    'juan-nuevo@test.co',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.nombre).toBe('Juan Nuevo');
    expect(res.body.data.id).toBeTruthy();
  });

  it('crea cliente sin teléfono ni email (datos mínimos)', async () => {
    const res = await api()
      .post('/api/v1/clientes')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ nombre: 'Solo Nombre' });

    expect(res.status).toBe(201);
    expect(res.body.data.nombre).toBe('Solo Nombre');
  });
});

// ─── Obtener ───────────────────────────────────────────────────────────────────
describe('GET /api/v1/clientes/:id', () => {
  let clienteId: string;

  beforeAll(async () => {
    const c = await createCliente({ nombre: 'Cliente Obtener' });
    clienteId = c.id;
  });

  it('obtiene cliente por ID', async () => {
    const res = await api()
      .get(`/api/v1/clientes/${clienteId}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(clienteId);
    expect(res.body.data.nombre).toBe('Cliente Obtener');
  });

  it('ID inexistente → 404', async () => {
    const res = await api()
      .get('/api/v1/clientes/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(404);
  });
});

// ─── Actualizar ────────────────────────────────────────────────────────────────
describe('PUT /api/v1/clientes/:id', () => {
  let clienteId: string;

  beforeAll(async () => {
    const c = await createCliente({ nombre: 'Cliente Update' });
    clienteId = c.id;
  });

  it('actualiza nombre y notas', async () => {
    const res = await api()
      .put(`/api/v1/clientes/${clienteId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ nombre: 'Nombre Actualizado', notas_privadas: 'Cliente VIP, trato preferente' });

    expect(res.status).toBe(200);
    expect(res.body.data.nombre).toBe('Nombre Actualizado');
    expect(res.body.data.notas_privadas).toContain('VIP');
  });

  it('rechaza body vacío', async () => {
    const res = await api()
      .put(`/api/v1/clientes/${clienteId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

// ─── Historial ─────────────────────────────────────────────────────────────────
describe('GET /api/v1/clientes/:id/historial', () => {
  let clienteId: string;

  beforeAll(async () => {
    const c  = await createCliente({ nombre: 'Cliente Historial' });
    const b  = await createBarbero({ email: 'hist-barb@test.co' });
    const s  = await createServicio({ nombre: 'Svc Historial' });
    await createCita({ barberoId: b.barberoId, servicioId: s.id, createdBy: admin.id, clienteId: c.id });
    clienteId = c.id;
  });

  it('retorna historial de citas del cliente', async () => {
    const res = await api()
      .get(`/api/v1/clientes/${clienteId}/historial`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0]).toHaveProperty('servicio');
    expect(res.body.data[0]).toHaveProperty('barbero');
  });
});

// ─── Resumen ───────────────────────────────────────────────────────────────────
describe('GET /api/v1/clientes/resumen', () => {
  it('retorna conteos globales de clientes', async () => {
    const res = await api()
      .get('/api/v1/clientes/resumen')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(typeof res.body.data.total).toBe('number');
    expect(typeof res.body.data.conTelefono).toBe('number');
    expect(typeof res.body.data.conEmail).toBe('number');
    expect(Array.isArray(res.body.data.porSegmento)).toBe(true);
  });
});
