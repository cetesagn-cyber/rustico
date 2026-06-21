import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const inputPath = process.argv.slice(2).find(arg => !arg.startsWith('--'));
const dryRun = process.argv.includes('--dry-run');

if (!inputPath) {
  console.error('Uso: node scripts/import-clientes-xlsx.mjs <archivo.xlsx> [--dry-run]');
  process.exit(1);
}

const workbookPath = path.resolve(process.cwd(), inputPath);

function createZipReader(filePath) {
  const buf = fs.readFileSync(filePath);
  const u16 = offset => buf.readUInt16LE(offset);
  const u32 = offset => buf.readUInt32LE(offset);

  function findEOCD() {
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i -= 1) {
      if (u32(i) === 0x06054b50) return i;
    }
    throw new Error('No se encontro el indice ZIP del XLSX.');
  }

  const eocd = findEOCD();
  const count = u16(eocd + 10);
  let offset = u32(eocd + 16);
  const entries = new Map();

  for (let i = 0; i < count; i += 1) {
    if (u32(offset) !== 0x02014b50) throw new Error('XLSX invalido: central directory corrupto.');
    const method = u16(offset + 10);
    const compSize = u32(offset + 20);
    const nameLen = u16(offset + 28);
    const extraLen = u16(offset + 30);
    const commentLen = u16(offset + 32);
    const localOffset = u32(offset + 42);
    const name = buf.slice(offset + 46, offset + 46 + nameLen).toString('utf8');
    entries.set(name, { method, compSize, localOffset });
    offset += 46 + nameLen + extraLen + commentLen;
  }

  function readText(name) {
    const entry = entries.get(name);
    if (!entry) return '';
    const local = entry.localOffset;
    if (u32(local) !== 0x04034b50) throw new Error(`XLSX invalido: entrada ${name} corrupta.`);
    const nameLen = u16(local + 26);
    const extraLen = u16(local + 28);
    const start = local + 30 + nameLen + extraLen;
    const data = buf.slice(start, start + entry.compSize);
    const out = entry.method === 0 ? data : zlib.inflateRawSync(data);
    return out.toString('utf8');
  }

  return { readText };
}

function decodeXml(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function attr(source, name) {
  const match = source.match(new RegExp(`${name}="([^"]*)"`));
  return match ? match[1] : '';
}

function columnNumber(ref) {
  const letters = (ref.match(/[A-Z]+/) || [''])[0];
  let n = 0;
  for (const letter of letters) n = n * 26 + letter.charCodeAt(0) - 64;
  return n;
}

function readWorkbookRows(filePath) {
  const zip = createZipReader(filePath);
  const sharedXml = zip.readText('xl/sharedStrings.xml');
  const shared = [];

  for (const match of sharedXml.matchAll(/<si[\s\S]*?<\/si>/g)) {
    const text = [...match[0].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
      .map(part => decodeXml(part[1]))
      .join('');
    shared.push(text);
  }

  const workbookXml = zip.readText('xl/workbook.xml');
  const relsXml = zip.readText('xl/_rels/workbook.xml.rels');
  const rels = new Map(
    [...relsXml.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)]
      .map(match => [match[1], match[2]]),
  );
  const firstSheet = [...workbookXml.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)][0];
  if (!firstSheet) throw new Error('El XLSX no tiene hojas.');

  const target = rels.get(firstSheet[2]);
  const sheetXml = zip.readText(`xl/${target.replace(/^\/|^xl\//g, '')}`);
  const rows = [];

  for (const rowMatch of sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1];
      const body = cellMatch[2];
      const index = columnNumber(attr(attrs, 'r')) - 1;
      const type = attr(attrs, 't');
      const valueMatch = body.match(/<v>([\s\S]*?)<\/v>/);
      const inlineMatch = body.match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>[\s\S]*?<\/is>/);
      let value = '';
      if (type === 's' && valueMatch) value = shared[Number(valueMatch[1])] ?? '';
      else if (type === 'inlineStr' && inlineMatch) value = decodeXml(inlineMatch[1]);
      else if (valueMatch) value = decodeXml(valueMatch[1]);
      row[index] = value;
    }
    if (row.some(value => String(value ?? '').trim())) rows.push(row.map(value => value ?? ''));
  }

  return rows;
}

function cleanText(value) {
  const text = String(value ?? '').trim();
  return text || null;
}

function cleanEmail(value) {
  const text = cleanText(value);
  if (!text) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? text.toLowerCase() : null;
}

function cleanPhone(value) {
  const text = cleanText(value);
  if (!text) return null;
  const digits = text.replace(/[^\d+]/g, '');
  return digits.length >= 7 ? digits.slice(0, 50) : null;
}

function excelSerialToDate(value) {
  const text = cleanText(value);
  if (!text || !/^\d+(\.\d+)?$/.test(text)) return null;
  const serial = Number(text);
  if (serial < 25000 || serial > 70000) return null;
  const utc = Math.round((serial - 25569) * 86400 * 1000);
  return new Date(utc).toISOString().slice(0, 10);
}

function normalizeStatus(value) {
  const text = String(value ?? '').toLowerCase();
  if (text.includes('vip')) return 'vip';
  if (text.includes('incluido') || text.includes('frecuente')) return 'frecuente';
  return 'nuevo';
}

function buildNotes(row) {
  const parts = [
    ['Barbero Excel', cleanText(row[4])],
    ['Estado Excel', cleanText(row[5])],
    ['Cumpleanos', excelSerialToDate(row[2]) || cleanText(row[2])],
    ['Primer contacto', excelSerialToDate(row[6]) || cleanText(row[6])],
    ['Fecha', excelSerialToDate(row[7]) || cleanText(row[7])],
    ['Recomendado por', cleanText(row[8])],
    ['Comentarios', cleanText(row[9])],
    ['Mes', cleanText(row[10])],
  ].filter(([, value]) => value);

  const extra = row.slice(11)
    .map((value, index) => [index + 12, cleanText(value)])
    .filter(([, value]) => value)
    .map(([index, value]) => `Col ${index}: ${value}`);

  return [...parts.map(([key, value]) => `${key}: ${value}`), ...extra].join(' | ') || null;
}

function mapRows(rows) {
  return rows.slice(1).map((row, index) => {
    const nombre = cleanText(row[0]);
    const email = cleanEmail(row[1]);
    const telefono = cleanPhone(row[3]);
    if (!nombre || (!telefono && !email)) return { skipped: true, reason: 'sin nombre o contacto', index: index + 2 };

    return {
      nombre,
      email,
      telefono,
      notas_privadas: buildNotes(row),
      segmento: normalizeStatus(row[5]),
      skipped: false,
      index: index + 2,
    };
  });
}

async function main() {
  const rows = readWorkbookRows(workbookPath);
  const mapped = mapRows(rows);
  const valid = mapped.filter(row => !row.skipped);
  const skipped = mapped.filter(row => row.skipped);

  console.log(`Archivo: ${workbookPath}`);
  console.log(`Filas Excel: ${Math.max(rows.length - 1, 0)}`);
  console.log(`Validos para CRM: ${valid.length}`);
  console.log(`Omitidos: ${skipped.length}`);
  console.log('Muestra:', valid.slice(0, 5));

  if (dryRun) return;

  const connection = new Client({ connectionString: process.env.DATABASE_URL });
  await connection.connect();
  const run = (sql, params = []) => {
    let n = 0;
    return connection.query(sql.replace(/\?/g, () => `$${++n}`), params);
  };

  let created = 0;
  for (let start = 0; start < valid.length; start += 100) {
    const batch = valid.slice(start, start + 100);
    const params = [];
    const values = batch.map((client, row) => {
      const base = row * 6;
      params.push(crypto.randomUUID(), client.nombre, client.telefono, client.email, client.notas_privadas, client.segmento);
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
    }).join(', ');
    const result = await connection.query(
      `INSERT INTO clientes (id, nombre, telefono, email, notas_privadas, segmento)
       VALUES ${values} ON CONFLICT DO NOTHING`,
      params,
    );
    created += result.rowCount || 0;
  }

  await connection.end();
  console.log(`Importacion completada. Creados: ${created}.`);
}

main().catch(error => {
  console.error('Importacion fallida:', error);
  process.exitCode = 1;
});
