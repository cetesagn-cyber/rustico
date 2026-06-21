import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

export const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'rustico',
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
  timezone: '+00:00',
});

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(sql: string, params: any[] = []): Promise<mysql.ResultSetHeader> {
  const [result] = await pool.execute(sql, params);
  return result as mysql.ResultSetHeader;
}

export async function transaction<T>(fn: (conn: { execute: (sql: string, params?: any[]) => Promise<void> }) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const result = await fn({
      execute: async (sql: string, params: any[] = []) => {
        await conn.execute(sql, params);
      },
    });
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}

export const uuidv4 = randomUUID;
