/**
 * setupFiles — corre ANTES de que cualquier módulo sea importado por los tests.
 * Fija las variables de entorno que pg.client.ts necesita al crear el pool.
 */
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

// Garantías mínimas para que los módulos no fallen al importarse
process.env.NODE_ENV     = 'test';
process.env.JWT_SECRET   = process.env.JWT_SECRET   ?? 'test-secret-for-jwt-signing-minimum-32-chars-rustico-qa';
process.env.JWT_EXPIRY   = process.env.JWT_EXPIRY   ?? '1h';
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:password@localhost:5432/rustico_test';
