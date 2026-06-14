import dotenv from 'dotenv';
import { initDatabase } from './init-pg';
import { closePool } from './pg.client';

dotenv.config();

async function run() {
  console.log('🚀 Iniciando migración a PostgreSQL...');
  await initDatabase();
  console.log('✅ Base de datos PostgreSQL lista.');
}

run()
  .catch(err => {
    console.error('❌ La migración falló:', err);
    process.exitCode = 1;
  })
  .finally(closePool);
