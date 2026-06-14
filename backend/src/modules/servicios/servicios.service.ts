import { query, queryOne, execute, uuidv4 } from '../../shared/database/pg.client';

const CAMPOS_PERMITIDOS_SVC = new Set(['nombre', 'descripcion', 'duracion_min', 'precio_cop', 'categoria']);

export class ServiciosService {
  static async listar(todos = false) {
    const sql = todos
      ? 'SELECT * FROM tipo_servicios ORDER BY categoria, nombre ASC'
      : 'SELECT * FROM tipo_servicios WHERE activo = TRUE ORDER BY categoria, nombre ASC';
    return query(sql);
  }

  static async crear(body: { nombre: string; descripcion?: string; duracion_min: number; precio_cop: number; categoria?: string }) {
    const { nombre, descripcion, duracion_min, precio_cop, categoria = 'corte' } = body;
    const id = uuidv4();
    await execute(
      `INSERT INTO tipo_servicios (id, nombre, descripcion, duracion_min, precio_cop, categoria) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, nombre, descripcion || null, duracion_min, precio_cop, categoria],
    );
    return queryOne('SELECT * FROM tipo_servicios WHERE id = ?', [id]);
  }

  static async actualizar(id: string, body: Partial<{ nombre: string; descripcion: string; duracion_min: number; precio_cop: number; activo: boolean }>) {
    const entradas = Object.entries(body).filter(([k, v]) => CAMPOS_PERMITIDOS_SVC.has(k) && v !== undefined);
    if (!entradas.length) throw new Error('Sin campos para actualizar.');

    const campos  = entradas.map(([k]) => `${k} = ?`).join(', ');
    const valores = entradas.map(([, v]) => v);

    await execute(`UPDATE tipo_servicios SET ${campos} WHERE id = ?`, [...valores, id]);
    const servicio = await queryOne('SELECT * FROM tipo_servicios WHERE id = ?', [id]);
    if (!servicio) throw new Error('Servicio no encontrado.');
    return servicio;
  }

  static async toggleActivo(id: string, activo: boolean) {
    await execute(`UPDATE tipo_servicios SET activo = ?, updated_at = NOW() WHERE id = ?`, [activo, id]);
    const s = await queryOne('SELECT * FROM tipo_servicios WHERE id = ?', [id]);
    if (!s) throw new Error('Servicio no encontrado.');
    return s;
  }

  static async eliminar(id: string) {
    await execute('UPDATE tipo_servicios SET activo = FALSE WHERE id = ?', [id]);
  }
}
