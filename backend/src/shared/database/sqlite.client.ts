import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';

const DB_PATH = process.env.SQLITE_PATH || path.join(__dirname, '../../../../rustico.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const uuidv4 = randomUUID;

export { db, uuidv4 };
