/**
 * AGENDA — Suite completa de citas
 * Cubre: crear, solapamiento, listar, cambiar estado, comisiones, tokens,
 *        resumen diario, endpoints públicos de confirmación.
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

beforeAll(async () => {
  await db.truncateAll();
  admin    = await createAdmin();
  barbero  = await createBarbero();
  servicio = await createServicio({ nombre: 'Corte QA', duracion_min: 30, precio_cop: 55000 });
  cliente  = await createCliente({ nombre: 'Cliente QA' });
});

afterAll(async () => {
  await closePool();
});

// ─── Autenticación requerida ───────────────────────────────────────────────────
describe('Rutas protegidas', () => {
  it('GET /agenda sin token → 401', async () => {
    const res = await api().get('/api/v1/agenda');
    expect(res.status).toBe(401);
  });

  it('POST /agenda sin token → 401', async () => {
    const res = await api().post('/api/v1/agenda').send({});
    expect(res.status).toBe(401);
  });
});

// ─── Crear cita ────────────────────────────────────────────────────────────────
describe('POST /api/v1/agenda', () => {
  const manana = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.toISOString();
  };

  it('crea cita correctamente', async () => {
    const res = await api()
      .post('/api/v1/agenda')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        barbero_id:  barbero.barberoId,
        servicio_id: servicio.id,
        cliente_id:  cliente.id,
        inicio:      manana(),
        metodo_pago: 'efectivo',
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      barbero_id:    barbero.barberoId,
      servicio_nombre: 'Corte QA',
      precio_cop:    55000,
      estado:        'confirmada',
    });
    expect(res.body.data.token_confirmacion).toBeTruthy();
  });

  it('detecta solapamiento y devuelve 400', async () => {
    // La primera cita ya ocupa las 9:00-9:30 → intentar crear en 9:15 debe fallar
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 15, 0, 0);

    const res = await api()
      .post('/api/v1/agenda')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        barbero_id:  barbero.barberoId,
        servicio_id: servicio.id,
        inicio:      d.toISOString(),
        metodo_pago: 'efectivo',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/horario/i);
  });

  it('rechaza servicio inexistente', async () => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(10, 0, 0, 0);

    const res = await api()
      .post('/api/v1/agenda')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        barbero_id:  barbero.barberoId,
        servicio_id: '00000000-0000-0000-0000-000000000000',
        inicio:      d.toISOString(),
        metodo_pago: 'efectivo',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/servicio/i);
  });

  it('acepta precio personalizado', async () => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setHours(10, 0, 0, 0);

    const res = await api()
      .post('/api/v1/agenda')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        barbero_id:  barbero.barberoId,
        servicio_id: servicio.id,
        inicio:      d.toISOString(),
        precio_cop:  80000,
        metodo_pago: 'datafono',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.precio_cop).toBe(80000);
    expect(res.body.data.metodo_pago).toBe('datafono');
  });
});

// ─── Listar por fecha ──────────────────────────────────────────────────────────
describe('GET /api/v1/agenda', () => {
  it('lista citas del día', async () => {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const fechaStr = manana.toISOString().split('T')[0];

    const res = await api()
      .get(`/api/v1/agenda?fecha=${fechaStr}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    // Al menos la cita creada en el test anterior
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('lista por barbero específico', async () => {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const fechaStr = manana.toISOString().split('T')[0];

    const res = await api()
      .get(`/api/v1/agenda/barbero/${barbero.barberoId}?fecha=${fechaStr}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ─── Obtener cita ──────────────────────────────────────────────────────────────
describe('GET /api/v1/agenda/:id', () => {
  let citaId: string;

  beforeAll(async () => {
    const cita = await createCita({
      barberoId: barbero.barberoId, servicioId: servicio.id,
      createdBy: admin.id,
    });
    citaId = cita.id;
  });

  it('obtiene cita por ID', async () => {
    const res = await api()
      .get(`/api/v1/agenda/${citaId}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(citaId);
    expect(res.body.data.servicio_nombre).toBe('Corte QA');
  });

  it('devuelve 404 para ID inexistente', async () => {
    const res = await api()
      .get('/api/v1/agenda/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(404);
  });
});

// ─── Cambiar estado ────────────────────────────────────────────────────────────
describe('PATCH /api/v1/agenda/:id/estado', () => {
  let citaId: string;

  beforeAll(async () => {
    const cita = await createCita({
      barberoId: barbero.barberoId, servicioId: servicio.id,
      createdBy: admin.id, clienteId: cliente.id,
    });
    citaId = cita.id;
  });

  it('completa la cita y crea comisión automáticamente', async () => {
    const res = await api()
      .patch(`/api/v1/agenda/${citaId}/estado`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ estado: 'completada' });

    expect(res.status).toBe(200);

    // Verificar que se creó una comisión en la BD
    const comisiones = await db.rows(
      `SELECT * FROM comisiones WHERE cita_id = '${citaId}'`,
    );
    expect(comisiones.length).toBe(1);
    expect(Number(comisiones[0].monto_cop)).toBeGreaterThan(0);
    expect(comisiones[0].estado).toBe('pendiente');
  });

  it('cancela cita correctamente', async () => {
    const cita2 = await createCita({
      barberoId: barbero.barberoId, servicioId: servicio.id,
      createdBy: admin.id,
    });

    const res = await api()
      .patch(`/api/v1/agenda/${cita2.id}/estado`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ estado: 'cancelada' });

    expect(res.status).toBe(200);
  });

  it('rechaza estado inválido', async () => {
    const res = await api()
      .patch(`/api/v1/agenda/${citaId}/estado`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

// ─── Resumen del día ───────────────────────────────────────────────────────────
describe('GET /api/v1/agenda/resumen', () => {
  it('devuelve totales del día', async () => {
    const hoy = new Date().toISOString().split('T')[0];
    const res = await api()
      .get(`/api/v1/agenda/resumen?fecha=${hoy}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('total_citas');
    expect(res.body.data).toHaveProperty('completadas');
    expect(res.body.data).toHaveProperty('ingresos_cop');
  });
});

// ─── Token de confirmación (público) ──────────────────────────────────────────
describe('Endpoints públicos de confirmación', () => {
  let token: string;
  let citaId: string;

  beforeAll(async () => {
    const cita = await createCita({
      barberoId: barbero.barberoId, servicioId: servicio.id,
      createdBy: admin.id,
    });
    token  = cita.token;
    citaId = cita.id;
  });

  it('GET /confirmar/:token devuelve datos de la cita', async () => {
    const res = await api().get(`/api/v1/agenda/confirmar/${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.token_confirmacion).toBe(token);
  });

  it('PATCH /confirmar/:token confirma la cita', async () => {
    const res = await api().patch(`/api/v1/agenda/confirmar/${token}`);
    expect(res.status).toBe(200);
  });

  it('token inexistente → 404', async () => {
    const res = await api().get('/api/v1/agenda/confirmar/tokeninvalidoxxxxxxxx');
    expect(res.status).toBe(404);
  });
});
