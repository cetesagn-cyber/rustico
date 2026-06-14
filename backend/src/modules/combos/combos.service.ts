import { query, queryOne, execute, transaction, uuidv4 } from '../../shared/database/pg.client';

interface ItemInput { tipo: 'servicio' | 'producto'; item_id: string; cantidad: number; }

const ITEMS_SQL = `
  SELECT ci.id, ci.combo_id, ci.tipo, ci.item_id, ci.cantidad,
    COALESCE(ts.nombre, p.nombre)         AS nombre,
    COALESCE(ts.precio_cop, p.precio_cop) AS precio_unitario
  FROM combo_items ci
  LEFT JOIN tipo_servicios ts ON ci.tipo = 'servicio' AND ts.id = ci.item_id
  LEFT JOIN productos       p  ON ci.tipo = 'producto' AND  p.id = ci.item_id
  WHERE ci.combo_id = ?
`;

async function adjuntarItems(combos: any[]): Promise<any[]> {
  return Promise.all(combos.map(async c => ({ ...c, items: await query(ITEMS_SQL, [c.id]) })));
}

export class CombosService {
  static async listar(todos = false) {
    const sql = todos
      ? 'SELECT * FROM combos ORDER BY nombre ASC'
      : 'SELECT * FROM combos WHERE activo = TRUE ORDER BY nombre ASC';
    return adjuntarItems(await query(sql));
  }

  static async obtener(id: string) {
    const combo = await queryOne<any>('SELECT * FROM combos WHERE id = ?', [id]);
    if (!combo) throw new Error('Combo no encontrado.');
    return (await adjuntarItems([combo]))[0];
  }

  static async crear(body: { nombre: string; descripcion?: string; precio_cop: number; items: ItemInput[] }) {
    const { nombre, descripcion, precio_cop, items = [] } = body;
    const id = uuidv4();

    await transaction(async (conn) => {
      await conn.execute(
        `INSERT INTO combos (id, nombre, descripcion, precio_cop) VALUES (?, ?, ?, ?)`,
        [id, nombre, descripcion || null, precio_cop],
      );
      for (const item of items) {
        await conn.execute(
          `INSERT INTO combo_items (id, combo_id, tipo, item_id, cantidad) VALUES (?, ?, ?, ?, ?)`,
          [uuidv4(), id, item.tipo, item.item_id, item.cantidad],
        );
      }
    });

    return this.obtener(id);
  }

  static async actualizar(id: string, body: { nombre?: string; descripcion?: string; precio_cop?: number; items?: ItemInput[] }) {
    const { nombre, descripcion, precio_cop, items } = body;

    await transaction(async (conn) => {
      const campos: string[] = [];
      const vals: any[]  = [];
      if (nombre      !== undefined) { campos.push('nombre = ?');      vals.push(nombre); }
      if (descripcion !== undefined) { campos.push('descripcion = ?'); vals.push(descripcion || null); }
      if (precio_cop  !== undefined) { campos.push('precio_cop = ?');  vals.push(precio_cop); }
      if (campos.length) {
        campos.push('updated_at = NOW()');
        await conn.execute(`UPDATE combos SET ${campos.join(', ')} WHERE id = ?`, [...vals, id]);
      }
      if (items !== undefined) {
        await conn.execute('DELETE FROM combo_items WHERE combo_id = ?', [id]);
        for (const item of items) {
          await conn.execute(
            `INSERT INTO combo_items (id, combo_id, tipo, item_id, cantidad) VALUES (?, ?, ?, ?, ?)`,
            [uuidv4(), id, item.tipo, item.item_id, item.cantidad],
          );
        }
      }
    });

    return this.obtener(id);
  }

  static async toggleActivo(id: string, activo: boolean) {
    await execute(`UPDATE combos SET activo = ?, updated_at = NOW() WHERE id = ?`, [activo, id]);
    return this.obtener(id);
  }

  static async eliminar(id: string) {
    await execute('UPDATE combos SET activo = FALSE WHERE id = ?', [id]);
  }
}
