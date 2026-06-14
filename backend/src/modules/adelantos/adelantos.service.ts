import { query, queryOne, execute, uuidv4 } from '../../shared/database/pg.client';

export interface ResumenBarbero {
  barbero_id: string;
  nombre: string;
  porcentaje_comision: number;
  color_agenda: string;
  ventas_dia: number;
  comision_dia: number;
  total_adelantos: number;
  disponible: number;
}

export interface Adelanto {
  id: string;
  barbero_id: string;
  barbero_nombre: string;
  monto_cop: number;
  fecha: string;
  notas: string | null;
  estado: 'activo' | 'anulado';
  created_at: string;
}

export class AdelantosService {

  static async resumenDia(fecha: string): Promise<ResumenBarbero[]> {
    const rows = await query<any>(`
      SELECT
        b.id              AS barbero_id,
        u.nombre,
        b.porcentaje_comision,
        b.color_agenda,
        COALESCE(SUM(CASE WHEN ag.estado = 'completada' THEN ag.precio_cop        ELSE 0 END), 0) AS ventas_dia,
        COALESCE(SUM(CASE WHEN ag.estado = 'completada' THEN ROUND(ag.precio_cop * b.porcentaje_comision / 100) ELSE 0 END), 0) AS comision_dia,
        COALESCE(ad.total_adelantos, 0) AS total_adelantos
      FROM barberos b
      JOIN  usuarios u  ON u.id = b.usuario_id
      LEFT JOIN agenda ag ON ag.barbero_id = b.id AND ag.inicio::date = ?
      LEFT JOIN (
        SELECT barbero_id, SUM(monto_cop) AS total_adelantos
        FROM   adelantos
        WHERE  fecha = ? AND estado = 'activo'
        GROUP  BY barbero_id
      ) ad ON ad.barbero_id = b.id
      WHERE b.activo = TRUE
      GROUP BY b.id, u.nombre, b.porcentaje_comision, b.color_agenda, ad.total_adelantos
      ORDER BY u.nombre ASC
    `, [fecha, fecha]);

    return rows.map(r => ({
      barbero_id:          r.barbero_id,
      nombre:              r.nombre,
      porcentaje_comision: Number(r.porcentaje_comision),
      color_agenda:        r.color_agenda,
      ventas_dia:          Number(r.ventas_dia),
      comision_dia:        Number(r.comision_dia),
      total_adelantos:     Number(r.total_adelantos),
      disponible:          Number(r.comision_dia) - Number(r.total_adelantos),
    }));
  }

  static async listarPorFecha(fecha: string): Promise<Adelanto[]> {
    return query<Adelanto>(`
      SELECT a.id, a.barbero_id, u.nombre AS barbero_nombre,
             a.monto_cop, a.fecha, a.notas, a.estado, a.created_at
      FROM   adelantos a
      JOIN   barberos b ON b.id = a.barbero_id
      JOIN   usuarios u ON u.id = b.usuario_id
      WHERE  a.fecha = ? AND a.estado = 'activo'
      ORDER  BY a.created_at DESC
    `, [fecha]);
  }

  static async crear(body: {
    barbero_id: string; monto_cop: number; fecha: string;
    notas?: string; creado_por?: string;
  }): Promise<Adelanto | null> {
    const { barbero_id, monto_cop, fecha, notas, creado_por } = body;
    if (!barbero_id || !monto_cop || monto_cop <= 0) throw new Error('Datos inválidos.');
    const id = uuidv4();
    await execute(
      `INSERT INTO adelantos (id, barbero_id, monto_cop, fecha, notas, creado_por) VALUES (?,?,?,?,?,?)`,
      [id, barbero_id, monto_cop, fecha, notas || null, creado_por || null],
    );
    return queryOne<Adelanto>(`
      SELECT a.id, a.barbero_id, u.nombre AS barbero_nombre,
             a.monto_cop, a.fecha, a.notas, a.estado, a.created_at
      FROM   adelantos a
      JOIN   barberos b ON b.id = a.barbero_id
      JOIN   usuarios u ON u.id = b.usuario_id
      WHERE  a.id = ?
    `, [id]);
  }

  static async anular(id: string): Promise<void> {
    const a = await queryOne('SELECT id FROM adelantos WHERE id = ?', [id]);
    if (!a) throw new Error('Adelanto no encontrado.');
    await execute(`UPDATE adelantos SET estado = 'anulado' WHERE id = ?`, [id]);
  }
}
