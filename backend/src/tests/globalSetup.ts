/**
 * globalSetup — corre UNA VEZ antes de todos los suites, en proceso separado.
 * Crea la base de datos de test y aplica las migraciones.
 */
import path from 'path';
import dotenv from 'dotenv';
import { Client } from 'pg';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

const DB_URL  = process.env.DATABASE_URL ?? 'postgresql://postgres:password@localhost:5432/rustico_test';
const MIGRATIONS_DIR = path.resolve(__dirname, '../../../database/migrations');

// Extrae el nombre de la base de datos del connection string
function extractDbName(url: string): { adminUrl: string; dbName: string } {
  const u = new URL(url);
  const dbName = u.pathname.replace(/^\//, '');
  u.pathname = '/postgres';
  return { adminUrl: u.toString(), dbName };
}

export default async function globalSetup() {
  const { adminUrl, dbName } = extractDbName(DB_URL);

  // 1. Conectar a postgres para crear la DB de test si no existe
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();

  const exists = await admin.query(
    `SELECT 1 FROM pg_database WHERE datname = $1`, [dbName],
  );
  if (!exists.rows.length) {
    await admin.query(`CREATE DATABASE "${dbName}"`);
    console.log(`\n✅  Base de datos de test creada: ${dbName}`);
  }
  await admin.end();

  // 2. Conectar a la DB de test y aplicar migraciones
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  await client.query("SET timezone = 'America/Bogota'");

  const migrations = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of migrations) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    try {
      await client.query(sql);
    } catch (err: any) {
      // 42P07 = tabla ya existe, 42710 = tipo ya existe — ignorar
      if (!['42P07', '42710'].includes(err.code)) throw err;
    }
  }

  await client.end();
  console.log(`✅  Migraciones aplicadas en ${dbName} — suite QA listo\n`);
}
