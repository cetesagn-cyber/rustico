import { Pool, PoolClient, types } from 'pg';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL no está configurado.');
}

// Devuelve TIMESTAMPTZ y TIMESTAMP como strings en lugar de Date objects.
// La sesión usa timezone='America/Bogota', así el string llega como "YYYY-MM-DD HH:MM:SS-05"
// y el front-end lo normaliza correctamente a hora local.
types.setTypeParser(1184, (val: string) => val); // TIMESTAMPTZ
types.setTypeParser(1114, (val: string) => val); // TIMESTAMP
types.setTypeParser(1082, (val: string) => val); // DATE → "YYYY-MM-DD"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', (client) => {
  client.query("SET timezone = 'America/Bogota'", (err) => {
    if (err) console.error('⚠️  No se pudo fijar timezone:', err.message);
  });
});

pool.on('error', (err) => {
  console.error('💥 Error inesperado en pool de base de datos:', err);
});

// Convierte placeholders ? a $1, $2, ... (compatibilidad con estilo MySQL)
function toPositional(sql: string): string {
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const res = await pool.query(toPositional(sql), params);
  return res.rows as T[];
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(sql: string, params: any[] = []): Promise<void> {
  await pool.query(toPositional(sql), params);
}

export async function transaction<T>(
  fn: (conn: { execute: (sql: string, params?: any[]) => Promise<void> }) => Promise<T>,
): Promise<T> {
  const client: PoolClient = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn({
      execute: async (sql: string, params: any[] = []) => {
        await client.query(toPositional(sql), params);
      },
    });
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}

export { uuidv4 };
