/**
 * BARBEROS — Suite completa
 * Cubre: CRUD, disponibilidad, estadísticas, regla: no eliminar con citas activas
 */
import request from 'supertest';
import app from '../app';
import { closePool } from '../shared/database/pg.client';
import { db } from './helpers/db';
import { createAdmin, createBarbero, createServicio, createCita } from './helpers/fixtures';

const api = () => request(app);

let admin: Awaited<ReturnType<typeof createAdmin>>;

beforeAll(async () => {
  await db.truncateAll();
  admin = await createAdmin({ email: 'barberos-admin@test.co' });
});

afterAll(async () => {
  await closePool();
});

// ─── GET /barberos ─────────────────────────────────────────────────────────────
describe('GET /api/v1/barberos', () => {
  beforeAll(async () => {
    await createBarbero({ nombre: 'Barbero Activo', email: 'b-activo@test.co' });
  });

  it('lista barberos activos', async () => {
    const res = await api()
      .get('/api/v1/barberos')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0]).toHaveProperty('nombre');
    expect(res.body.data[0]).toHaveProperty('color_agenda');
  });

  it('sin token → 401', async () => {
    const res = await api().get('/api/v1/barberos');
    expect(res.status).toBe(401);
  });
});

// ─── POST /barberos ────────────────────────────────────────────────────────────
describe('POST /api/v1/barberos', () => {
  it('crea barbero con usuario asociado', async () => {
    const res = await api()
      .post('/api/v1/barberos')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        nombre:              'Nuevo Barbero QA',
        email:               'nuevo-barber-qa@test.co',
        password:            'Password1',
        especialidad:        'Cortes modernos',
        porcentaje_comision: 45,
        color_agenda:        '#FF5733',
        horario_inicio:      '09:00',
        horario_fin:         '18:00',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.nombre).toBe('Nuevo Barbero QA');
    expect(Number(res.body.data.porcentaje_comision)).toBe(45);
    expect(res.body.data.color_agenda).toBe('#FF5733');
  });

  it('rechaza email duplicado', async () => {
    const res = await api()
      .post('/api/v1/barberos')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        nombre:   'Dup Barbero',
        email:    'nuevo-barber-qa@test.co',
        password: 'Password1',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/correo/i);
  });

  it('rechaza sin nombre/email/password → 400', async () => {
    const res = await api()
      .post('/api/v1/barberos')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ nombre: 'Sin email' });

    expect(res.status).toBe(400);
  });
});

// ─── PUT /barberos/:id ─────────────────────────────────────────────────────────
describe('PUT /api/v1/barberos/:id', () => {
  let barberoId: string;

  beforeAll(async () => {
    const b = await createBarbero({ nombre: 'Barbero Update', email: 'update-barber@test.co' });
    barberoId = b.barberoId;
  });

  it('actualiza datos del barbero', async () => {
    const res = await api()
      .put(`/api/v1/barberos/${barberoId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ especialidad: 'Barba VIP', porcentaje_comision: 50 });

    expect(res.status).toBe(200);
    expect(res.body.data.especialidad).toBe('Barba VIP');
    expect(Number(res.body.data.porcentaje_comision)).toBe(50);
  });
});

// ─── PATCH /barberos/:id/activo ────────────────────────────────────────────────
describe('PATCH /api/v1/barberos/:id/activo', () => {
  let barberoId: string;

  beforeAll(async () => {
    const b = await createBarbero({ nombre: 'Toggle Barbero', email: 'toggle-barber@test.co' });
    barberoId = b.barberoId;
  });

  it('desactiva barbero', async () => {
    const res = await api()
      .patch(`/api/v1/barberos/${barberoId}/activo`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ activo: false });

    expect(res.status).toBe(200);
    expect(res.body.data.activo).toBe(false);
  });

  it('activa barbero', async () => {
    const res = await api()
      .patch(`/api/v1/barberos/${barberoId}/activo`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ activo: true });

    expect(res.status).toBe(200);
    expect(res.body.data.activo).toBe(true);
  });

  it('rechaza campo activo no boolean', async () => {
    const res = await api()
      .patch(`/api/v1/barberos/${barberoId}/activo`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ activo: 'si' });

    expect(res.status).toBe(400);
  });
});

// ─── GET /barberos/:id/disponibilidad ─────────────────────────────────────────
describe('GET /api/v1/barberos/:id/disponibilidad', () => {
  let barberoId: string;

  beforeAll(async () => {
    const b = await createBarbero({ nombre: 'Disponible Barber', email: 'dispo-barber@test.co' });
    barberoId = b.barberoId;
  });

  it('retorna slots disponibles para un día hábil', async () => {
    // Buscar el próximo lunes (día 1 — días laborales por defecto [1..6])
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 1);
    while (fecha.getDay() === 0) fecha.setDate(fecha.getDate() + 1); // skip domingo
    const fechaStr = fecha.toISOString().split('T')[0];

    const res = await api()
      .get(`/api/v1/barberos/${barberoId}/disponibilidad?fecha=${fechaStr}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    // Debe haber slots de 30 min entre 08:00 y 20:00
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toMatch(/^\d{2}:\d{2}$/);
  });

  it('retorna array vacío para domingo', async () => {
    // Domingo = día 0, que NO está en días laborales {1..6}
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + ((7 - fecha.getDay()) % 7 || 7));
    const fechaStr = fecha.toISOString().split('T')[0];

    const res = await api()
      .get(`/api/v1/barberos/${barberoId}/disponibilidad?fecha=${fechaStr}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('requiere parámetro fecha → 400', async () => {
    const res = await api()
      .get(`/api/v1/barberos/${barberoId}/disponibilidad`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(400);
  });
});

// ─── DELETE /barberos/:id ──────────────────────────────────────────────────────
describe('DELETE /api/v1/barberos/:id', () => {
  it('rechaza eliminar barbero con citas activas', async () => {
    const b = await createBarbero({ nombre: 'Ocupado Barber', email: 'ocupado@test.co' });
    const s = await createServicio({ nombre: 'Svc Ocupado' });

    // Crear una cita pendiente para este barbero
    await createCita({
      barberoId: b.barberoId, servicioId: s.id,
      createdBy: admin.id, estado: 'confirmada',
    });

    const res = await api()
      .delete(`/api/v1/barberos/${b.barberoId}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cita/i);
  });

  it('elimina barbero sin citas activas', async () => {
    const b = await createBarbero({ nombre: 'Libre Barber', email: 'libre-barber@test.co' });

    const res = await api()
      .delete(`/api/v1/barberos/${b.barberoId}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
  });
});

// ─── GET /barberos/:id/estadisticas ───────────────────────────────────────────
describe('GET /api/v1/barberos/:id/estadisticas', () => {
  let barberoId: string;

  beforeAll(async () => {
    const b = await createBarbero({ nombre: 'Stats Barbero', email: 'stats-barber@test.co' });
    barberoId = b.barberoId;
  });

  it('retorna estadísticas del mes actual', async () => {
    const res = await api()
      .get(`/api/v1/barberos/${barberoId}/estadisticas`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('total_citas');
    expect(res.body.data).toHaveProperty('completadas');
    expect(res.body.data).toHaveProperty('ingresos_cop');
    expect(res.body.data).toHaveProperty('ticket_promedio');
  });
});
