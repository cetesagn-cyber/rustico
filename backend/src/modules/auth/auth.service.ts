import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, queryOne, execute, uuidv4 } from '../../shared/database/pg.client';
import { LoginBody, RegisterBody, UsuarioPayload } from './auth.types';

const SALT_ROUNDS = 10;
const PASSWORD_MIN_LENGTH = 8;
const ROLES_VALIDOS = new Set(['admin', 'barbero', 'recepcion']);

function normalizarEmail(email: string) {
  return email.trim().toLowerCase();
}

function validarPassword(password: string) {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`);
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    throw new Error('La contraseña debe incluir mayúscula, minúscula y número.');
  }
  if (['password', '12345678', 'rustico123'].includes(password.toLowerCase())) {
    throw new Error('La contraseña es demasiado fácil de adivinar.');
  }
}

export class AuthService {
  static async registrar(body: RegisterBody) {
    const { nombre, email, telefono, password, rol = 'recepcion' } = body;
    const emailNormalizado = normalizarEmail(email);
    validarPassword(password);
    if (!ROLES_VALIDOS.has(rol)) throw new Error('Rol inválido.');

    const existe = await queryOne('SELECT id FROM usuarios WHERE email = ?', [emailNormalizado]);
    if (existe) throw new Error('El correo ya está registrado.');

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const id = uuidv4();

    await execute(
      `INSERT INTO usuarios (id, nombre, email, telefono, password_hash, rol) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, nombre.trim(), emailNormalizado, telefono || null, hash, rol],
    );

    return queryOne('SELECT id, nombre, email, rol, created_at FROM usuarios WHERE id = ?', [id]);
  }

  static async login(body: LoginBody) {
    const { password } = body;
    const email = normalizarEmail(body.email);

    const usuario = await queryOne<any>(
      'SELECT id, nombre, email, password_hash, rol, activo FROM usuarios WHERE email = ?',
      [email],
    );

    if (!usuario) throw new Error('Credenciales inválidas.');
    if (!usuario.activo) throw new Error('Usuario inactivo. Contacta al administrador.');

    const coincide = await bcrypt.compare(password, usuario.password_hash);
    if (!coincide) throw new Error('Credenciales inválidas.');

    const payload: UsuarioPayload = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: (process.env.JWT_EXPIRY || '8h') as any,
    });

    return { token, usuario: payload };
  }

  static async perfil(id: string) {
    const usuario = await queryOne(
      'SELECT id, nombre, email, telefono, rol, activo, created_at FROM usuarios WHERE id = ?',
      [id],
    );
    if (!usuario) throw new Error('Usuario no encontrado.');
    return usuario;
  }

  static async listarUsuarios() {
    return query(
      'SELECT id, nombre, email, telefono, rol, activo, created_at FROM usuarios ORDER BY nombre ASC',
    );
  }

  static async toggleActivo(id: string, activo: boolean) {
    await execute('UPDATE usuarios SET activo = ? WHERE id = ?', [activo, id]);
    const usuario = await queryOne('SELECT id, nombre, activo FROM usuarios WHERE id = ?', [id]);
    if (!usuario) throw new Error('Usuario no encontrado.');
    return usuario;
  }

  static async actualizar(id: string, body: { nombre?: string; email?: string; telefono?: string; rol?: string }) {
    const u = await queryOne<any>('SELECT id FROM usuarios WHERE id = ?', [id]);
    if (!u) throw new Error('Usuario no encontrado.');

    const sets: string[] = [];
    const vals: any[]    = [];

    if (body.nombre)   { sets.push('nombre = ?');   vals.push(body.nombre.trim()); }
    if (body.email)    {
      const emailNormalizado = normalizarEmail(body.email);
      const dup = await queryOne('SELECT id FROM usuarios WHERE email = ? AND id != ?', [emailNormalizado, id]);
      if (dup) throw new Error('Ese correo ya está en uso.');
      sets.push('email = ?'); vals.push(emailNormalizado);
    }
    if (body.telefono !== undefined) { sets.push('telefono = ?'); vals.push(body.telefono || null); }
    if (body.rol)      {
      if (!ROLES_VALIDOS.has(body.rol)) throw new Error('Rol inválido.');
      sets.push('rol = ?'); vals.push(body.rol);
    }

    if (!sets.length) throw new Error('Sin campos para actualizar.');
    sets.push('updated_at = NOW()');
    await execute(`UPDATE usuarios SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
    return queryOne('SELECT id, nombre, email, telefono, rol, activo, created_at FROM usuarios WHERE id = ?', [id]);
  }

  static async cambiarPassword(id: string, nuevaPassword: string) {
    const u = await queryOne('SELECT id FROM usuarios WHERE id = ?', [id]);
    if (!u) throw new Error('Usuario no encontrado.');
    validarPassword(nuevaPassword);
    const hash = await bcrypt.hash(nuevaPassword, SALT_ROUNDS);
    await execute('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hash, id]);
    return { ok: true };
  }

  static async cambiarMiPassword(id: string, passwordActual: string, nuevaPassword: string) {
    const u = await queryOne<any>('SELECT id, password_hash FROM usuarios WHERE id = ?', [id]);
    if (!u || !await bcrypt.compare(passwordActual || '', u.password_hash)) {
      throw new Error('La contraseña actual no es correcta.');
    }
    validarPassword(nuevaPassword);
    const hash = await bcrypt.hash(nuevaPassword, SALT_ROUNDS);
    await execute('UPDATE usuarios SET password_hash = ?, updated_at = NOW() WHERE id = ?', [hash, id]);
    return { ok: true };
  }

  static async eliminar(id: string, adminId: string) {
    if (id === adminId) throw new Error('No puedes eliminar tu propia cuenta.');
    const admins = await query<any>('SELECT id FROM usuarios WHERE rol = ? AND activo = TRUE', ['admin']);
    if (admins.length <= 1 && admins[0]?.id === id) throw new Error('Debe quedar al menos un administrador activo.');
    const u = await queryOne('SELECT id FROM usuarios WHERE id = ?', [id]);
    if (!u) throw new Error('Usuario no encontrado.');
    await execute('DELETE FROM usuarios WHERE id = ?', [id]);
    return { eliminado: true };
  }
}
