import { Pool, PoolClient, types } from 'pg';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

types.setTypeParser(1184, (val: string) => val);
types.setTypeParser(1114, (val: string) => val);
types.setTypeParser(1082, (val: string) => val);

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 2000 });
pool.on('connect', client => { client.query("SET timezone = 'America/Bogota'").catch(() => undefined); });

function toPositional(sql: string): string { let n = 0; return sql.replace(/\?/g, () => `$${++n}`); }
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> { return (await pool.query(toPositional(sql), params)).rows as T[]; }
export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> { return (await query<T>(sql, params))[0] ?? null; }
export async function execute(sql: string, params: any[] = []): Promise<void> { await pool.query(toPositional(sql), params); }
export async function transaction<T>(fn: (conn: { execute: (sql: string, params?: any[]) => Promise<void> }) => Promise<T>): Promise<T> {
  const client: PoolClient = await pool.connect();
  try { await client.query('BEGIN'); const result = await fn({ execute: async (sql, params = []) => { await client.query(toPositional(sql), params); } }); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
export async function closePool(): Promise<void> { await pool.end(); }
export const uuidv4 = randomUUID;
