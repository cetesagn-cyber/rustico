import { query, queryOne, execute, uuidv4 } from '../../shared/database/pg.client';

const CAMPOS_PERMITIDOS_CLIENTE = new Set(['nombre', 'telefono', 'email', 'notas_privadas', 'segmento']);

export class ClientesService {
  static async listar(page = 1, limite = 20, busqueda = '', segmento = '', contacto = '') {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safeLimit = Number.isFinite(limite) && limite > 0 ? Math.min(Math.floor(limite), 100) : 20;
    const offset = (safePage - 1) * safeLimit;
    const filtro = busqueda ? `%${busqueda}%` : '%';
    const filtroSegmento = segmento ? segmento : '%';
    const filtrosContacto: Record<string, string> = {
      con_telefono: "telefono IS NOT NULL AND telefono <> ''",
      sin_telefono: "(telefono IS NULL OR telefono = '')",
      con_email: "email IS NOT NULL AND email <> ''",
      sin_email: "(email IS NULL OR email = '')",
      importados_excel: "notas_privadas LIKE '%Barbero Excel:%'",
    };
    const contactoSql = filtrosContacto[contacto] ? ` AND ${filtrosContacto[contacto]}` : '';

    const clientes = await query(
      `SELECT id, nombre, telefono, email, notas_privadas, segmento, total_visitas,
              ticket_promedio, ultimo_servicio, created_at
       FROM clientes
       WHERE (nombre ILIKE ? OR telefono ILIKE ? OR email ILIKE ?)
         AND segmento LIKE ?
         ${contactoSql}
       ORDER BY nombre ASC
       LIMIT ${safeLimit} OFFSET ${offset}`,
      [filtro, filtro, filtro, filtroSegmento],
    );

    const totalRow = await queryOne<any>(
      `SELECT COUNT(*) as total
       FROM clientes
       WHERE (nombre ILIKE ? OR telefono ILIKE ? OR email ILIKE ?)
         AND segmento LIKE ?
         ${contactoSql}`,
      [filtro, filtro, filtro, filtroSegmento],
    );
    const total = Number(totalRow?.total ?? 0);

    return { clientes, total, pagina: safePage, totalPaginas: Math.ceil(total / safeLimit) };
  }

  static async resumen() {
    const total = await queryOne<any>('SELECT COUNT(*) as total FROM clientes');
    const porSegmento = await query(
      `SELECT segmento, COUNT(*) as total
       FROM clientes
       GROUP BY segmento
       ORDER BY total DESC`,
    );
    const conTelefono = await queryOne<any>(
      `SELECT COUNT(*) as total FROM clientes WHERE telefono IS NOT NULL AND telefono <> ''`,
    );
    const conEmail = await queryOne<any>(
      `SELECT COUNT(*) as total FROM clientes WHERE email IS NOT NULL AND email <> ''`,
    );
    const importados = await queryOne<any>(
      `SELECT COUNT(*) as total FROM clientes WHERE notas_privadas LIKE '%Barbero Excel:%'`,
    );

    return {
      total: Number(total?.total ?? 0),
      conTelefono: Number(conTelefono?.total ?? 0),
      conEmail: Number(conEmail?.total ?? 0),
      importadosExcel: Number(importados?.total ?? 0),
      porSegmento,
    };
  }

  static async obtener(id: string) {
    const cliente = await queryOne('SELECT * FROM clientes WHERE id = ?', [id]);
    if (!cliente) throw new Error('Cliente no encontrado.');
    return cliente;
  }

  static async crear(body: { nombre: string; telefono?: string; email?: string; notas_privadas?: string }) {
    const { nombre, telefono, email, notas_privadas } = body;
    const id = uuidv4();
    await execute(
      `INSERT INTO clientes (id, nombre, telefono, email, notas_privadas) VALUES (?, ?, ?, ?, ?)`,
      [id, nombre, telefono || null, email || null, notas_privadas || null],
    );
    return queryOne('SELECT * FROM clientes WHERE id = ?', [id]);
  }

  static async actualizar(id: string, body: Partial<{ nombre: string; telefono: string; email: string; notas_privadas: string; segmento: string }>) {
    const entradas = Object.entries(body).filter(([k, v]) => CAMPOS_PERMITIDOS_CLIENTE.has(k) && v !== undefined);
    if (!entradas.length) throw new Error('Sin campos para actualizar.');

    const campos  = entradas.map(([k]) => `${k} = ?`).join(', ');
    const valores = entradas.map(([, v]) => v);

    await execute(`UPDATE clientes SET ${campos} WHERE id = ?`, [...valores, id]);
    const cliente = await queryOne('SELECT * FROM clientes WHERE id = ?', [id]);
    if (!cliente) throw new Error('Cliente no encontrado.');
    return cliente;
  }

  static async historial(id: string) {
    return query(
      `SELECT a.id, a.inicio, a.fin, a.estado, a.precio_cop, a.notas,
              ts.nombre as servicio, ts.duracion_min,
              u.nombre as barbero
       FROM agenda a
       JOIN tipo_servicios ts ON a.servicio_id = ts.id
       JOIN barberos b        ON a.barbero_id  = b.id
       JOIN usuarios u        ON b.usuario_id  = u.id
       WHERE a.cliente_id = ?
       ORDER BY a.inicio DESC
       LIMIT 50`,
      [id],
    );
  }

  static async actualizarSegmento(id: string) {
    const row = await queryOne<any>(
      `SELECT COUNT(*) as visitas, MAX(inicio::date) as ultimo
       FROM agenda
       WHERE cliente_id = ? AND estado = 'completada'`,
      [id],
    );

    const n           = Number(row?.visitas ?? 0);
    const diasSinVisita = row?.ultimo
      ? Math.floor((Date.now() - new Date(row.ultimo).getTime()) / 86_400_000)
      : 999;

    let segmento = 'nuevo';
    if      (n === 0)                                     segmento = 'nuevo';
    else if (n >= 10 && diasSinVisita <= 60)              segmento = 'vip';
    else if (n >= 3  && diasSinVisita <= 45)              segmento = 'frecuente';
    else if (diasSinVisita > 90)                          segmento = 'inactivo';
    else if (diasSinVisita > 45)                          segmento = 'en_riesgo';

    await execute(
      'UPDATE clientes SET total_visitas = ?, ultimo_servicio = ?, segmento = ? WHERE id = ?',
      [n, row?.ultimo ?? null, segmento, id],
    );
  }
}
