import { query, queryOne, execute, uuidv4 } from '../../shared/database/pg.client';

const CAMPOS_PERMITIDOS_PROD = new Set(['nombre', 'descripcion', 'precio_cop', 'categoria']);

export class ProductosService {
  static async listar(todos = false) {
    const sql = todos
      ? 'SELECT * FROM productos ORDER BY categoria, nombre ASC'
      : 'SELECT * FROM productos WHERE activo = TRUE ORDER BY categoria, nombre ASC';
    return query(sql);
  }

  static async crear(body: { nombre: string; descripcion?: string; precio_cop: number; categoria?: string }) {
    const { nombre, descripcion, precio_cop, categoria = 'cuidado' } = body;
    const id = uuidv4();
    await execute(
      `INSERT INTO productos (id, nombre, descripcion, precio_cop, categoria) VALUES (?, ?, ?, ?, ?)`,
      [id, nombre, descripcion || null, precio_cop, categoria],
    );
    return queryOne('SELECT * FROM productos WHERE id = ?', [id]);
  }

  static async actualizar(id: string, body: Partial<{ nombre: string; descripcion: string; precio_cop: number; categoria: string }>) {
    const entradas = Object.entries(body).filter(([k, v]) => CAMPOS_PERMITIDOS_PROD.has(k) && v !== undefined);
    if (!entradas.length) throw new Error('Sin campos para actualizar.');
    const campos  = entradas.map(([k]) => `${k} = ?`).join(', ');
    const valores = entradas.map(([, v]) => v);
    await execute(`UPDATE productos SET ${campos}, updated_at = NOW() WHERE id = ?`, [...valores, id]);
    const p = await queryOne('SELECT * FROM productos WHERE id = ?', [id]);
    if (!p) throw new Error('Producto no encontrado.');
    return p;
  }

  static async toggleActivo(id: string, activo: boolean) {
    await execute(`UPDATE productos SET activo = ?, updated_at = NOW() WHERE id = ?`, [activo, id]);
    const p = await queryOne('SELECT * FROM productos WHERE id = ?', [id]);
    if (!p) throw new Error('Producto no encontrado.');
    return p;
  }
}
