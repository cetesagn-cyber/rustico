import bcrypt from 'bcryptjs';
import { query, queryOne, execute, transaction, uuidv4 } from '../../shared/database/pg.client';

function normalizarEmail(email: string) {
  return email.trim().toLowerCase();
}

function validarPassword(password: string) {
  if (!password || password.length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres.');
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    throw new Error('La contraseña debe incluir mayúscula, minúscula y número.');
  }
}

const BARBERO_SELECT = `
  SELECT b.id, b.especialidad, b.porcentaje_comision, b.color_agenda,
         b.horario_inicio, b.horario_fin, b.dias_laborales, b.activo,
         u.nombre, u.email, u.telefono, u.id as usuario_id
  FROM barberos b
  JOIN usuarios u ON b.usuario_id = u.id
`;

export class BarberosService {
  static async listar(incluirInactivos = false) {
    const where = incluirInactivos ? '' : 'WHERE b.activo = TRUE';
    return query(`${BARBERO_SELECT} ${where} ORDER BY b.activo DESC, u.nombre ASC`);
  }

  static async crear(data: {
    nombre: string; email: string; telefono?: string; password: string;
    especialidad?: string; porcentaje_comision?: number; color_agenda?: string;
    horario_inicio?: string; horario_fin?: string;
  }) {
    const email = normalizarEmail(data.email);
    validarPassword(data.password);

    const emailExiste = await queryOne('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (emailExiste) throw new Error('Ya existe un usuario con ese correo.');

    const hash      = bcrypt.hashSync(data.password, 10);
    const usuarioId = uuidv4();
    const barberoId = uuidv4();

    await transaction(async (conn) => {
      await conn.execute(
        `INSERT INTO usuarios (id, nombre, email, telefono, password_hash, rol) VALUES (?, ?, ?, ?, ?, 'barbero')`,
        [usuarioId, data.nombre.trim(), email, data.telefono || null, hash],
      );
      await conn.execute(
        `INSERT INTO barberos (id, usuario_id, especialidad, porcentaje_comision, color_agenda, horario_inicio, horario_fin)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          barberoId, usuarioId,
          data.especialidad || null,
          data.porcentaje_comision ?? 40,
          data.color_agenda || '#2A5E44',
          data.horario_inicio || '08:00',
          data.horario_fin   || '20:00',
        ],
      );
    });

    return this.obtener(barberoId);
  }

  static async actualizar(id: string, data: {
    nombre?: string; email?: string; telefono?: string;
    especialidad?: string; porcentaje_comision?: number; color_agenda?: string;
    horario_inicio?: string; horario_fin?: string; password?: string;
  }) {
    const barbero = await queryOne<any>('SELECT usuario_id FROM barberos WHERE id = ?', [id]);
    if (!barbero) throw new Error('Barbero no encontrado.');

    await transaction(async (conn) => {
      if (data.nombre || data.email || data.telefono !== undefined || data.password) {
        const email = data.email ? normalizarEmail(data.email) : null;
        if (email) {
          const dup = await queryOne(
            'SELECT id FROM usuarios WHERE email = ? AND id != ?',
            [email, barbero.usuario_id],
          );
          if (dup) throw new Error('Ya existe un usuario con ese correo.');
        }
        if (data.password) validarPassword(data.password);
        const hash = data.password ? bcrypt.hashSync(data.password, 10) : null;
        await conn.execute(
          `UPDATE usuarios SET
            nombre        = COALESCE(?, nombre),
            email         = COALESCE(?, email),
            telefono      = COALESCE(?, telefono),
            password_hash = COALESCE(?, password_hash),
            updated_at    = NOW()
          WHERE id = ?`,
          [data.nombre?.trim() || null, email, data.telefono ?? null, hash, barbero.usuario_id],
        );
      }

      await conn.execute(
        `UPDATE barberos SET
          especialidad        = COALESCE(?, especialidad),
          porcentaje_comision = COALESCE(?, porcentaje_comision),
          color_agenda        = COALESCE(?, color_agenda),
          horario_inicio      = COALESCE(?, horario_inicio),
          horario_fin         = COALESCE(?, horario_fin)
        WHERE id = ?`,
        [
          data.especialidad        ?? null,
          data.porcentaje_comision ?? null,
          data.color_agenda        ?? null,
          data.horario_inicio      ?? null,
          data.horario_fin         ?? null,
          id,
        ],
      );
    });

    return this.obtener(id);
  }

  static async toggleActivo(id: string, activo: boolean) {
    await execute(`UPDATE barberos SET activo = ? WHERE id = ?`, [activo, id]);
    await execute(
      `UPDATE usuarios SET activo = ? WHERE id = (SELECT usuario_id FROM barberos WHERE id = ?)`,
      [activo, id],
    );
    return this.obtener(id);
  }

  static async eliminar(id: string) {
    const barbero = await queryOne<any>('SELECT usuario_id FROM barberos WHERE id = ?', [id]);
    if (!barbero) throw new Error('Barbero no encontrado.');

    const citasActivas = await queryOne<any>(
      `SELECT COUNT(*) as n FROM agenda WHERE barbero_id = ? AND estado IN ('pendiente','confirmada')`,
      [id],
    );
    if (citasActivas.n > 0)
      throw new Error(`Tiene ${citasActivas.n} cita(s) pendiente(s) o confirmada(s). Cancélalas o deshabílitalo primero.`);

    await transaction(async (conn) => {
      await conn.execute(`DELETE FROM comisiones WHERE barbero_id = ?`, [id]);
      await conn.execute(`DELETE FROM barberos   WHERE id = ?`,         [id]);
      await conn.execute(`DELETE FROM usuarios   WHERE id = ?`,         [barbero.usuario_id]);
    });
  }

  static async obtener(id: string) {
    const barbero = await queryOne<any>(`${BARBERO_SELECT} WHERE b.id = ?`, [id]);
    if (!barbero) throw new Error('Barbero no encontrado.');
    return barbero;
  }

  static async disponibilidad(barberoId: string, fechaStr: string): Promise<string[]> {
    const barbero = await queryOne<any>(
      'SELECT horario_inicio, horario_fin, dias_laborales FROM barberos WHERE id = ?',
      [barberoId],
    );
    if (!barbero) throw new Error('Barbero no encontrado.');

    const { horario_inicio, horario_fin, dias_laborales } = barbero;
    let diasLaborales: number[];
    if (Array.isArray(dias_laborales)) {
      diasLaborales = dias_laborales;
    } else {
      try { diasLaborales = JSON.parse(dias_laborales); }
      catch { diasLaborales = [1,2,3,4,5,6]; }
    }

    const fecha     = new Date(fechaStr + 'T00:00:00');
    const diaSemana = fecha.getDay() === 0 ? 7 : fecha.getDay();
    if (!diasLaborales.includes(diaSemana)) return [];

    const citas = (await query<any>(
      `SELECT inicio, fin FROM agenda
       WHERE barbero_id = ? AND inicio::date = ? AND estado NOT IN ('cancelada')`,
      [barberoId, fechaStr],
    )).map(c => ({
      inicio: new Date(c.inicio),
      fin:    new Date(c.fin),
    }));

    const slots: string[] = [];
    const [hI, mI] = (horario_inicio as string).split(':').map(Number);
    const [hF, mF] = (horario_fin   as string).split(':').map(Number);

    const slotActual = new Date(`${fechaStr}T00:00:00`);
    slotActual.setHours(hI, mI, 0, 0);
    const limite = new Date(`${fechaStr}T00:00:00`);
    limite.setHours(hF, mF, 0, 0);
    const ahora    = new Date();
    const INTERVALO = 30;

    while (slotActual < limite) {
      const slotFin = new Date(slotActual.getTime() + INTERVALO * 60_000);
      const ocupado = citas.some(c => slotActual < c.fin && slotFin > c.inicio);
      if (!ocupado && slotActual > ahora) {
        slots.push(`${String(slotActual.getHours()).padStart(2,'0')}:${String(slotActual.getMinutes()).padStart(2,'0')}`);
      }
      slotActual.setMinutes(slotActual.getMinutes() + INTERVALO);
    }

    return slots;
  }

  static async estadisticas(barberoId: string) {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    return queryOne(`
      SELECT
        COUNT(*)                                                                AS total_citas,
        SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END)                 AS completadas,
        SUM(CASE WHEN estado = 'no_show'    THEN 1 ELSE 0 END)                 AS no_shows,
        COALESCE(SUM(CASE WHEN estado = 'completada' THEN precio_cop ELSE 0 END), 0)                    AS ingresos_cop,
        COALESCE(AVG(CASE WHEN estado = 'completada' THEN CAST(precio_cop AS DECIMAL) ELSE NULL END), 0) AS ticket_promedio
      FROM agenda
      WHERE barbero_id = ? AND inicio >= ?
    `, [barberoId, inicioMes.toISOString()]);
  }
}
