/**
 * AUTH — Suite completa de autenticación y gestión de usuarios
 * Cubre: login, tokens, roles, register, actualizar, toggle, eliminar
 */
import request from 'supertest';
import app from '../app';
import { closePool } from '../shared/database/pg.client';
import { db } from './helpers/db';
import { createAdmin, createUsuario } from './helpers/fixtures';

const api = () => request(app);

beforeAll(async () => {
  await db.truncateAll();
});

afterAll(async () => {
  await closePool();
});

// ─── POST /auth/login ──────────────────────────────────────────────────────────
describe('POST /api/v1/auth/login', () => {
  let admin: Awaited<ReturnType<typeof createAdmin>>;

  beforeAll(async () => {
    admin = await createAdmin({ email: 'login-admin@test.co' });
  });

  it('devuelve token y datos con credenciales correctas', async () => {
    const res = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'login-admin@test.co', password: 'Password1' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.usuario.email).toBe('login-admin@test.co');
    expect(res.body.data.usuario.rol).toBe('admin');
    expect(res.body.data.usuario).not.toHaveProperty('password_hash');
  });

  it('rechaza contraseña incorrecta con 401', async () => {
    const res = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'login-admin@test.co', password: 'WrongPass9' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/credenciales/i);
  });

  it('rechaza email inexistente con 401', async () => {
    const res = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'nadie@test.co', password: 'Password1' });

    expect(res.status).toBe(401);
  });

  it('rechaza usuario inactivo', async () => {
    const inactivo = await createUsuario({ email: 'inactivo@test.co' });
    await db.rows(`UPDATE usuarios SET activo = FALSE WHERE id = '${inactivo.id}'`);

    const res = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'inactivo@test.co', password: 'Password1' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/inactivo/i);
  });

  it('normaliza email a minúsculas', async () => {
    const res = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'LOGIN-ADMIN@TEST.CO', password: 'Password1' });

    expect(res.status).toBe(200);
  });
});

// ─── GET /auth/me ──────────────────────────────────────────────────────────────
describe('GET /api/v1/auth/me', () => {
  let admin: Awaited<ReturnType<typeof createAdmin>>;

  beforeAll(async () => {
    admin = await createAdmin({ email: 'me-admin@test.co' });
  });

  it('devuelve perfil con token válido', async () => {
    const res = await api()
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(admin.id);
    expect(res.body.data.email).toBe('me-admin@test.co');
  });

  it('rechaza sin token → 401', async () => {
    const res = await api().get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('rechaza con token malformado → 401', async () => {
    const res = await api()
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer tokenbasura123');
    expect(res.status).toBe(401);
  });
});

// ─── POST /auth/register ───────────────────────────────────────────────────────
describe('POST /api/v1/auth/register', () => {
  let admin: Awaited<ReturnType<typeof createAdmin>>;
  let recepcion: Awaited<ReturnType<typeof createUsuario>>;

  beforeAll(async () => {
    admin     = await createAdmin({ email: 'register-admin@test.co' });
    recepcion = await createUsuario({ email: 'register-recepcion@test.co', rol: 'recepcion' });
  });

  it('admin puede crear nuevos usuarios', async () => {
    const res = await api()
      .post('/api/v1/auth/register')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ nombre: 'Nuevo Usuario', email: 'nuevo@test.co', password: 'Password1', rol: 'recepcion' });

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe('nuevo@test.co');
  });

  it('no-admin recibe 403', async () => {
    const res = await api()
      .post('/api/v1/auth/register')
      .set('Authorization', `Bearer ${recepcion.token}`)
      .send({ nombre: 'Hack', email: 'hack@test.co', password: 'Password1', rol: 'recepcion' });

    expect(res.status).toBe(403);
  });

  it('rechaza email duplicado', async () => {
    const res = await api()
      .post('/api/v1/auth/register')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ nombre: 'Dup', email: 'nuevo@test.co', password: 'Password1', rol: 'recepcion' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/registrado/i);
  });

  it('rechaza contraseña débil (< 8 chars)', async () => {
    const res = await api()
      .post('/api/v1/auth/register')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ nombre: 'Débil', email: 'debil@test.co', password: 'abc', rol: 'recepcion' });

    expect(res.status).toBe(400);
  });

  it('rechaza rol inválido', async () => {
    const res = await api()
      .post('/api/v1/auth/register')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ nombre: 'Hacker', email: 'hacker@test.co', password: 'Password1', rol: 'superadmin' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/rol/i);
  });
});

// ─── PUT /usuarios/:id + PATCH activo ─────────────────────────────────────────
describe('Gestión de usuarios (actualizar / toggle)', () => {
  let admin: Awaited<ReturnType<typeof createAdmin>>;
  let usuario: Awaited<ReturnType<typeof createUsuario>>;

  beforeAll(async () => {
    admin   = await createAdmin({ email: 'mgmt-admin@test.co' });
    usuario = await createUsuario({ email: 'mgmt-user@test.co' });
  });

  it('admin puede actualizar nombre y teléfono', async () => {
    const res = await api()
      .put(`/api/v1/auth/usuarios/${usuario.id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ nombre: 'Nombre Actualizado', telefono: '+573001234567' });

    expect(res.status).toBe(200);
    expect(res.body.data.nombre).toBe('Nombre Actualizado');
  });

  it('admin puede desactivar usuario', async () => {
    const res = await api()
      .patch(`/api/v1/auth/usuarios/${usuario.id}/activo`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ activo: false });

    expect(res.status).toBe(200);
    expect(res.body.data.activo).toBe(false);
  });

  it('no puede eliminar su propia cuenta', async () => {
    const res = await api()
      .delete(`/api/v1/auth/usuarios/${admin.id}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/propia/i);
  });
});
