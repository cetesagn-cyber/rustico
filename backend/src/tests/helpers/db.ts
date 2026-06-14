/**
 * Helpers de base de datos para tests.
 * Usa el mismo pool de pg.client para estar en la misma conexión que la app.
 */
import { execute, query } from '../../shared/database/pg.client';

const TABLES = [
  'adelantos', 'comisiones', 'agenda',
  'combo_items', 'combos', 'productos',
  'gastos', 'clientes', 'tipo_servicios',
  'barberos', 'usuarios',
];

export const db = {
  /** Vacía todas las tablas en orden FK-safe */
  async truncateAll() {
    for (const t of TABLES) {
      await execute(`TRUNCATE TABLE "${t}" RESTART IDENTITY CASCADE`);
    }
  },

  /** Vacía tablas específicas */
  async truncate(...tables: string[]) {
    for (const t of tables) {
      await execute(`TRUNCATE TABLE "${t}" RESTART IDENTITY CASCADE`);
    }
  },

  async rows<T = any>(sql: string, params?: any[]): Promise<T[]> {
    return query<T>(sql, params);
  },

  async row<T = any>(sql: string, params?: any[]): Promise<T | undefined> {
    const rows = await query<T>(sql, params);
    return rows[0];
  },
};
