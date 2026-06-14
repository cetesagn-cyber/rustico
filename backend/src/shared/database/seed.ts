import dotenv from 'dotenv';
import { initDatabase } from './init';
import { pool } from './mysql.client';

dotenv.config();

async function runSeed() {
  console.log('Cargando datos de prueba en MySQL...');
  await initDatabase();
  console.log('Seed verificado. Si la base ya tenia datos, no se duplico informacion.');
}

runSeed()
  .catch((err) => {
    console.error('Seed fallo:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
