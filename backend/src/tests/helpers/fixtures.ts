/**
 * Factorías de datos de test.
 * Crea usuarios, barberos, servicios, clientes, etc. en la BD de test.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { execute, uuidv4 } from '../../shared/database/pg.client';

const HASH = bcrypt.hashSync('Password1', 10);
const JWT_SECRET = process.env.JWT_SECRET!;

// ─── Tokens ────────────────────────────────────────────────────────────────────
export function makeToken(payload: { id: string; nombre: string; email: string; rol: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

// ─── Usuarios ──────────────────────────────────────────────────────────────────
export async function createAdmin(overrides: Partial<{ nombre: string; email: string }> = {}) {
  const id     = uuidv4();
  const nombre = overrides.nombre ?? 'Admin Test';
  const email  = overrides.email  ?? `admin-${id.slice(0, 6)}@test.co`;
  await execute(
    `INSERT INTO usuarios (id, nombre, email, telefono, password_hash, rol)
     VALUES (?, ?, ?, ?, ?, 'admin')`,
    [id, nombre, email, null, HASH],
  );
  return { id, nombre, email, rol: 'admin' as const, token: makeToken({ id, nombre, email, rol: 'admin' }) };
}

export async function createUsuario(overrides: Partial<{ nombre: string; email: string; rol: string }> = {}) {
  const id     = uuidv4();
  const nombre = overrides.nombre ?? 'Usuario Test';
  const email  = overrides.email  ?? `user-${id.slice(0, 6)}@test.co`;
  const rol    = overrides.rol    ?? 'recepcion';
  await execute(
    `INSERT INTO usuarios (id, nombre, email, telefono, password_hash, rol)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, nombre, email, null, HASH, rol],
  );
  return { id, nombre, email, rol, token: makeToken({ id, nombre, email, rol }) };
}

// ─── Barberos ──────────────────────────────────────────────────────────────────
export async function createBarbero(overrides: Partial<{
  nombre: string; email: string; color: string; porcentaje: number;
}> = {}) {
  const usuarioId = uuidv4();
  const barberoId = uuidv4();
  const nombre    = overrides.nombre ?? 'Barbero Test';
  const email     = overrides.email  ?? `barbero-${usuarioId.slice(0, 6)}@test.co`;

  await execute(
    `INSERT INTO usuarios (id, nombre, email, telefono, password_hash, rol)
     VALUES (?, ?, ?, ?, ?, 'barbero')`,
    [usuarioId, nombre, email, '+573001112200', HASH],
  );
  await execute(
    `INSERT INTO barberos (id, usuario_id, especialidad, porcentaje_comision, color_agenda)
     VALUES (?, ?, ?, ?, ?)`,
    [barberoId, usuarioId, 'Corte clásico', overrides.porcentaje ?? 40, overrides.color ?? '#2A5E44'],
  );
  return {
    barberoId, usuarioId, nombre, email,
    token: makeToken({ id: usuarioId, nombre, email, rol: 'barbero' }),
  };
}

// ─── Servicios ─────────────────────────────────────────────────────────────────
export async function createServicio(overrides: Partial<{
  nombre: string; duracion_min: number; precio_cop: number; categoria: string;
}> = {}) {
  const id = uuidv4();
  await execute(
    `INSERT INTO tipo_servicios (id, nombre, descripcion, duracion_min, precio_cop, categoria)
     VALUES (?, ?, null, ?, ?, ?)`,
    [
      id,
      overrides.nombre      ?? 'Corte Test',
      overrides.duracion_min ?? 30,
      overrides.precio_cop   ?? 55000,
      overrides.categoria    ?? 'corte',
    ],
  );
  return { id, nombre: overrides.nombre ?? 'Corte Test', duracion_min: overrides.duracion_min ?? 30, precio_cop: overrides.precio_cop ?? 55000 };
}

// ─── Clientes ──────────────────────────────────────────────────────────────────
export async function createCliente(overrides: Partial<{ nombre: string; telefono: string; email: string }> = {}) {
  const id     = uuidv4();
  const nombre = overrides.nombre   ?? 'Cliente Test';
  const tel    = overrides.telefono ?? `+5730${Math.floor(Math.random() * 1e9).toString().padStart(9, '0')}`;
  await execute(
    `INSERT INTO clientes (id, nombre, telefono, email) VALUES (?, ?, ?, ?)`,
    [id, nombre, tel, overrides.email ?? null],
  );
  return { id, nombre, telefono: tel };
}

// ─── Citas ─────────────────────────────────────────────────────────────────────
export async function createCita(opts: {
  barberoId: string; servicioId: string; createdBy: string;
  clienteId?: string; inicio?: Date; estado?: string; precio?: number;
  metodoPago?: string;
}) {
  const id    = uuidv4();
  const token = uuidv4().replace(/-/g, '').slice(0, 16);
  const inicio = opts.inicio ?? (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d;
  })();
  const fin = new Date(inicio.getTime() + 30 * 60_000);

  await execute(
    `INSERT INTO agenda
      (id, cliente_id, barbero_id, servicio_id, inicio, fin, estado, precio_cop,
       metodo_pago, notas, token_confirmacion, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, null, ?, ?)`,
    [
      id,
      opts.clienteId ?? null,
      opts.barberoId,
      opts.servicioId,
      inicio.toISOString(),
      fin.toISOString(),
      opts.estado    ?? 'confirmada',
      opts.precio    ?? 55000,
      opts.metodoPago ?? 'efectivo',
      token,
      opts.createdBy,
    ],
  );
  return { id, inicio, fin, token };
}
