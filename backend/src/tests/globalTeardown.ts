/**
 * globalTeardown — corre UNA VEZ después de todos los suites.
 * Limpia la base de datos de test vaciando todas las tablas.
 */
import path from 'path';
import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

const DB_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:password@localhost:5432/rustico_test';

const TABLES = [
  'adelantos', 'comisiones', 'agenda',
  'combo_items', 'combos', 'productos',
  'gastos', 'clientes', 'tipo_servicios',
  'barberos', 'usuarios',
];

export default async function globalTeardown() {
  const client = new Client({ connectionString: DB_URL });
  try {
    await client.connect();
    for (const t of TABLES) {
      await client.query(`TRUNCATE TABLE "${t}" RESTART IDENTITY CASCADE`).catch(() => {});
    }
    console.log('\n🧹  Base de datos de test limpiada — teardown completo');
  } finally {
    await client.end().catch(() => {});
  }
}
