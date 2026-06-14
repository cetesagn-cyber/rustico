import { query, queryOne, execute, transaction, uuidv4 } from '../../shared/database/pg.client';

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface CrearGastoBody {
  concepto:   string;
  monto_cop:  number;
  categoria:  string;
  fecha:      string;
  notas?:     string;
}

export const CATEGORIAS_GASTO = [
  'operativo', 'insumos', 'arriendo', 'nomina',
  'marketing', 'mantenimiento', 'servicios', 'otros',
] as const;

// ─── Service ─────────────────────────────────────────────────────────────────
export class FinancieroService {

  // ── Resumen de período ──────────────────────────────────────────────────────
  static async resumenPeriodo(fechaInicio: string, fechaFin: string) {
    const ini = `${fechaInicio} 00:00:00`;
    const fin = `${fechaFin} 23:59:59`;

    const totales = await queryOne<any>(`
      SELECT
        COUNT(*)                                                                                        AS total_citas,
        SUM(CASE WHEN estado != 'cancelada' THEN 1 ELSE 0 END)                                         AS citas_activas,
        SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END)                                         AS completadas,
        SUM(CASE WHEN estado = 'no_show'    THEN 1 ELSE 0 END)                                         AS no_shows,
        SUM(CASE WHEN estado = 'cancelada'  THEN 1 ELSE 0 END)                                         AS canceladas,
        SUM(CASE WHEN estado IN ('pendiente','confirmada') THEN 1 ELSE 0 END)                          AS pendientes,
        COALESCE(SUM(CASE WHEN estado = 'completada' THEN precio_cop ELSE 0 END), 0)                   AS ingresos_brutos,
        COALESCE(SUM(CASE WHEN estado = 'completada' AND metodo_pago = 'efectivo'  THEN precio_cop ELSE 0 END), 0) AS ingresos_efectivo,
        COALESCE(SUM(CASE WHEN estado = 'completada' AND metodo_pago = 'datafono' THEN precio_cop ELSE 0 END), 0) AS ingresos_datafono,
        COALESCE(SUM(CASE WHEN estado = 'completada' AND metodo_pago = 'mixto'    THEN precio_cop ELSE 0 END), 0) AS ingresos_mixto
      FROM agenda
      WHERE inicio >= ? AND inicio <= ?
    `, [ini, fin]);

    const porBarbero = await query<any>(`
      SELECT
        b.id                  AS barbero_id,
        u.nombre              AS barbero_nombre,
        b.porcentaje_comision,
        b.color_agenda,
        COUNT(*)              AS total_citas,
        SUM(CASE WHEN a.estado = 'completada' THEN 1 ELSE 0 END) AS completadas,
        COALESCE(SUM(CASE WHEN a.estado = 'completada' THEN a.precio_cop ELSE 0 END), 0)
          AS ingresos_brutos,
        COALESCE(SUM(CASE WHEN a.estado = 'completada'
          THEN ROUND(a.precio_cop * b.porcentaje_comision / 100.0)::INTEGER
          ELSE 0 END), 0) AS comision_monto,
        COALESCE(SUM(CASE WHEN a.estado = 'completada'
          THEN ROUND(a.precio_cop * (1.0 - b.porcentaje_comision / 100.0))::INTEGER
          ELSE 0 END), 0) AS neto_barberia
      FROM agenda a
      JOIN barberos b  ON a.barbero_id  = b.id
      JOIN usuarios u  ON b.usuario_id  = u.id
      WHERE a.inicio >= ? AND a.inicio <= ?
      GROUP BY b.id, u.nombre, b.porcentaje_comision, b.color_agenda
      ORDER BY ingresos_brutos DESC
    `, [ini, fin]);

    const comisiones_total = porBarbero.reduce((s: number, r: any) => s + Number(r.comision_monto), 0);
    const neto_barberia    = Number(totales?.ingresos_brutos ?? 0) - comisiones_total;

    const porServicio = await query<any>(`
      SELECT
        ts.nombre,
        ts.categoria,
        COUNT(*) AS total,
        SUM(CASE WHEN a.estado = 'completada' THEN 1 ELSE 0 END) AS completadas,
        COALESCE(SUM(CASE WHEN a.estado = 'completada' THEN a.precio_cop ELSE 0 END), 0) AS ingresos
      FROM agenda a
      JOIN tipo_servicios ts ON a.servicio_id = ts.id
      WHERE a.inicio >= ? AND a.inicio <= ?
      GROUP BY ts.id, ts.nombre, ts.categoria
      ORDER BY ingresos DESC
    `, [ini, fin]);

    const evolucion = await query<any>(`
      SELECT
        DATE(inicio)                                                             AS fecha,
        SUM(CASE WHEN estado = 'completada' THEN precio_cop ELSE 0 END)         AS ingresos,
        SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END)                  AS citas
      FROM agenda
      WHERE inicio >= ? AND inicio <= ?
      GROUP BY DATE(inicio)
      ORDER BY fecha ASC
    `, [ini, fin]);

    // Gastos del período
    const gastosResumen = await queryOne<any>(`
      SELECT
        COALESCE(SUM(monto_cop), 0)  AS total_gastos,
        COUNT(*)                      AS num_gastos
      FROM gastos
      WHERE fecha >= ? AND fecha <= ?
    `, [fechaInicio, fechaFin]);

    const total_gastos   = Number(gastosResumen?.total_gastos ?? 0);
    const rentabilidad   = neto_barberia - total_gastos;
    const margen_pct     = neto_barberia > 0
      ? Math.round(rentabilidad / neto_barberia * 100)
      : 0;

    // Gastos por categoría
    const gastosPorCategoria = await query<any>(`
      SELECT categoria, COALESCE(SUM(monto_cop), 0) AS total, COUNT(*) AS cantidad
      FROM gastos
      WHERE fecha >= ? AND fecha <= ?
      GROUP BY categoria
      ORDER BY total DESC
    `, [fechaInicio, fechaFin]);

    return {
      ...totales,
      comisiones_total,
      neto_barberia,
      total_gastos,
      rentabilidad,
      margen_pct,
      porBarbero,
      porServicio,
      evolucion,
      gastosPorCategoria,
    };
  }

  // ── Resumen mensual (helper) ────────────────────────────────────────────────
  static async resumenMensualMultiple(meses: number = 6) {
    const desdeMultiple = (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - meses);
      return d.toISOString().split('T')[0];
    })();

    const filas = await query<any>(`
      SELECT
        TO_CHAR(inicio, 'YYYY-MM')                                                   AS mes,
        COALESCE(SUM(CASE WHEN estado = 'completada' THEN precio_cop ELSE 0 END), 0) AS ingresos,
        SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END)                       AS completadas
      FROM agenda
      WHERE inicio >= ?
      GROUP BY TO_CHAR(inicio, 'YYYY-MM')
      ORDER BY mes ASC
    `, [desdeMultiple]);

    const gastosMes = await query<any>(`
      SELECT
        TO_CHAR(fecha, 'YYYY-MM') AS mes,
        SUM(monto_cop)             AS gastos
      FROM gastos
      WHERE fecha >= ?
      GROUP BY TO_CHAR(fecha, 'YYYY-MM')
    `, [desdeMultiple]);

    const gastosMap: Record<string, number> = {};
    for (const g of gastosMes) gastosMap[g.mes] = Number(g.gastos);

    return filas.map((f: any) => ({
      mes:          f.mes,
      ingresos:     Number(f.ingresos),
      completadas:  Number(f.completadas),
      gastos:       gastosMap[f.mes] ?? 0,
      rentabilidad: Number(f.ingresos) - (gastosMap[f.mes] ?? 0),
    }));
  }

  // ── Comisiones ──────────────────────────────────────────────────────────────
  static async listarComisiones(estado?: string, barberoId?: string) {
    const params: any[] = [];
    let where = 'WHERE 1=1';
    if (estado)    { where += ' AND c.estado = ?';     params.push(estado); }
    if (barberoId) { where += ' AND c.barbero_id = ?'; params.push(barberoId); }

    return query(`
      SELECT
        c.id, c.monto_cop, c.porcentaje, c.estado, c.periodo, c.created_at,
        c.cita_id,
        u.nombre      AS barbero_nombre,
        b.color_agenda,
        a.inicio      AS cita_inicio,
        a.precio_cop  AS cita_precio,
        ts.nombre     AS servicio_nombre
      FROM comisiones c
      JOIN barberos        b  ON c.barbero_id = b.id
      JOIN usuarios        u  ON b.usuario_id = u.id
      JOIN agenda          a  ON c.cita_id    = a.id
      JOIN tipo_servicios  ts ON a.servicio_id = ts.id
      ${where}
      ORDER BY a.inicio DESC
      LIMIT 500
    `, params);
  }

  static async pagarComisiones(ids: string[]) {
    if (!ids.length) throw new Error('Sin IDs de comisiones.');
    await transaction(async (conn) => {
      for (const id of ids) {
        await conn.execute("UPDATE comisiones SET estado = 'pagada' WHERE id = ?", [id]);
      }
    });
    return { actualizadas: ids.length };
  }

  static async resumenComisionesPendientes() {
    return query(`
      SELECT
        u.nombre        AS barbero_nombre,
        b.color_agenda,
        COUNT(*)        AS cantidad,
        SUM(c.monto_cop) AS total_pendiente
      FROM comisiones c
      JOIN barberos b ON c.barbero_id = b.id
      JOIN usuarios u ON b.usuario_id = u.id
      WHERE c.estado = 'pendiente'
      GROUP BY b.id, u.nombre, b.color_agenda
      ORDER BY total_pendiente DESC
    `);
  }

  static async crearComision(
    citaId: string, barberoId: string,
    montoCop: number, porcentaje: number, periodo: string,
  ) {
    const id = uuidv4();
    await execute(
      `INSERT INTO comisiones (id, barbero_id, cita_id, monto_cop, porcentaje, estado, periodo)
       VALUES (?, ?, ?, ?, ?, 'pendiente', ?)
       ON CONFLICT (cita_id) DO NOTHING`,
      [id, barberoId, citaId, montoCop, porcentaje, periodo],
    );
  }

  // ── Gastos ──────────────────────────────────────────────────────────────────
  static async listarGastos(fechaInicio?: string, fechaFin?: string, categoria?: string) {
    const params: any[] = [];
    let where = 'WHERE 1=1';
    if (fechaInicio) { where += ' AND g.fecha >= ?';      params.push(fechaInicio); }
    if (fechaFin)    { where += ' AND g.fecha <= ?';      params.push(fechaFin); }
    if (categoria)   { where += ' AND g.categoria = ?';   params.push(categoria); }

    return query(`
      SELECT
        g.id, g.concepto, g.monto_cop, g.categoria, g.fecha, g.notas, g.created_at,
        u.nombre AS creado_por_nombre
      FROM gastos g
      LEFT JOIN usuarios u ON g.creado_por = u.id
      ${where}
      ORDER BY g.fecha DESC, g.created_at DESC
      LIMIT 500
    `, params);
  }

  static async crearGasto(body: CrearGastoBody, userId: string) {
    const { concepto, monto_cop, categoria, fecha, notas } = body;
    if (!concepto?.trim())             throw new Error('Concepto requerido.');
    if (!monto_cop || monto_cop <= 0)  throw new Error('Monto debe ser positivo.');
    if (!fecha)                        throw new Error('Fecha requerida.');

    const id = uuidv4();
    await execute(
      `INSERT INTO gastos (id, concepto, monto_cop, categoria, fecha, notas, creado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, concepto.trim(), monto_cop, categoria || 'operativo', fecha, notas?.trim() || null, userId],
    );
    return queryOne('SELECT * FROM gastos WHERE id = ?', [id]);
  }

  static async actualizarGasto(id: string, body: Partial<CrearGastoBody>) {
    const gasto = await queryOne<any>('SELECT id FROM gastos WHERE id = ?', [id]);
    if (!gasto) throw new Error('Gasto no encontrado.');

    const sets: string[] = [];
    const params: any[]  = [];

    if (body.concepto  !== undefined) { sets.push('concepto = ?');  params.push(body.concepto.trim()); }
    if (body.monto_cop !== undefined) { sets.push('monto_cop = ?'); params.push(body.monto_cop); }
    if (body.categoria !== undefined) { sets.push('categoria = ?'); params.push(body.categoria); }
    if (body.fecha     !== undefined) { sets.push('fecha = ?');     params.push(body.fecha); }
    if (body.notas     !== undefined) { sets.push('notas = ?');     params.push(body.notas?.trim() || null); }

    if (!sets.length) throw new Error('Sin campos para actualizar.');
    sets.push('updated_at = NOW()');

    await execute(`UPDATE gastos SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
    return queryOne('SELECT * FROM gastos WHERE id = ?', [id]);
  }

  static async eliminarGasto(id: string) {
    const gasto = await queryOne<any>('SELECT id FROM gastos WHERE id = ?', [id]);
    if (!gasto) throw new Error('Gasto no encontrado.');
    await execute('DELETE FROM gastos WHERE id = ?', [id]);
    return { eliminado: true };
  }

  // ── Cierre de caja ──────────────────────────────────────────────────────────
  static async cierreData(fechaInicio: string, fechaFin: string) {
    const resumen = await this.resumenPeriodo(fechaInicio, fechaFin);

    // Adelantos del período
    const adelantosRow = await queryOne<any>(`
      SELECT COALESCE(SUM(monto_cop),0) AS total, COUNT(*) AS cantidad
      FROM adelantos
      WHERE fecha >= ? AND fecha <= ? AND estado = 'activo'
    `, [fechaInicio, fechaFin]);

    const adelantosPorBarbero = await query<any>(`
      SELECT b.id AS barbero_id, u.nombre,
             COALESCE(SUM(a.monto_cop),0) AS total_adelantos
      FROM   barberos b
      JOIN   usuarios u ON u.id = b.usuario_id
      LEFT JOIN adelantos a ON a.barbero_id = b.id
             AND a.fecha >= ? AND a.fecha <= ? AND a.estado = 'activo'
      WHERE  b.activo = 1
      GROUP  BY b.id, u.nombre
      HAVING COALESCE(SUM(a.monto_cop), 0) > 0
      ORDER  BY u.nombre
    `, [fechaInicio, fechaFin]);

    // Detalle de gastos del período
    const gastosDetalle = await query<any>(`
      SELECT g.concepto, g.monto_cop, g.categoria, g.fecha
      FROM   gastos g
      WHERE  g.fecha >= ? AND g.fecha <= ?
      ORDER  BY g.fecha, g.categoria
    `, [fechaInicio, fechaFin]);

    const total_adelantos = Number(adelantosRow?.total ?? 0);
    const efectivo_caja   = Number(resumen.ingresos_brutos) - Number(resumen.comisiones_total) - total_adelantos;
    const balance_final   = efectivo_caja - Number(resumen.total_gastos);

    return {
      ...resumen,
      total_adelantos,
      num_adelantos:       Number(adelantosRow?.cantidad ?? 0),
      adelantosPorBarbero,
      gastosDetalle,
      efectivo_caja,
      balance_final,
    };
  }
}
