import { query, queryOne } from '../../shared/database/pg.client';

// ─── helpers ──────────────────────────────────────────────────────────────────
function desdeStr(meses: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - meses + 1);
  d.setDate(1);
  return d.toISOString().split('T')[0];
}

function mesActual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function mesAnterior(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Service ──────────────────────────────────────────────────────────────────
export class EstadisticasService {

  // ── Tendencia mensual ───────────────────────────────────────────────────────
  static async evolucion(meses: number) {
    const desde = desdeStr(meses);

    const porMes = await query<any>(`
      SELECT
        TO_CHAR(inicio, 'YYYY-MM')                                                AS mes,
        COUNT(*)                                                                   AS total_citas,
        SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END)                    AS completadas,
        SUM(CASE WHEN estado = 'no_show'    THEN 1 ELSE 0 END)                    AS no_shows,
        SUM(CASE WHEN estado = 'cancelada'  THEN 1 ELSE 0 END)                    AS canceladas,
        COALESCE(SUM(CASE WHEN estado = 'completada' THEN precio_cop ELSE 0 END), 0)  AS ingresos,
        COALESCE(AVG(CASE WHEN estado = 'completada'
          THEN CAST(precio_cop AS NUMERIC) ELSE NULL END), 0)                     AS ticket_promedio,
        COUNT(DISTINCT cliente_id)                                                 AS clientes_unicos
      FROM agenda
      WHERE inicio::date >= ?
      GROUP BY TO_CHAR(inicio, 'YYYY-MM')
      ORDER BY mes ASC
    `, [desde]);

    return { porMes, meses };
  }

  // ── KPIs ejecutivos ─────────────────────────────────────────────────────────
  static async kpis() {
    const mesCurr = mesActual();
    const mesAnt  = mesAnterior();

    const [curr, ant] = await Promise.all([
      queryOne<any>(`
        SELECT
          COALESCE(SUM(CASE WHEN estado = 'completada' THEN precio_cop ELSE 0 END), 0) AS ingresos,
          SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END)                        AS completadas,
          COUNT(*)                                                                        AS total_citas,
          COALESCE(AVG(CASE WHEN estado = 'completada'
            THEN CAST(precio_cop AS NUMERIC) ELSE NULL END), 0)                         AS ticket_promedio,
          SUM(CASE WHEN estado = 'no_show'   THEN 1 ELSE 0 END)                         AS no_shows,
          SUM(CASE WHEN estado = 'cancelada' THEN 1 ELSE 0 END)                         AS canceladas
        FROM agenda WHERE TO_CHAR(inicio, 'YYYY-MM') = ?
      `, [mesCurr]),
      queryOne<any>(`
        SELECT
          COALESCE(SUM(CASE WHEN estado = 'completada' THEN precio_cop ELSE 0 END), 0) AS ingresos,
          SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END)                        AS completadas,
          COUNT(*)                                                                        AS total_citas,
          COALESCE(AVG(CASE WHEN estado = 'completada'
            THEN CAST(precio_cop AS NUMERIC) ELSE NULL END), 0)                         AS ticket_promedio
        FROM agenda WHERE TO_CHAR(inicio, 'YYYY-MM') = ?
      `, [mesAnt]),
    ]);

    const delta = (a: number, b: number) =>
      b > 0 ? Math.round((a - b) / b * 100) : a > 0 ? 100 : 0;

    const dias30 = await queryOne<any>(`
      SELECT ROUND(COUNT(*) / 30.0, 1) AS prom_dia
      FROM agenda
      WHERE inicio::date >= CURRENT_DATE - INTERVAL '30 days'
        AND estado NOT IN ('cancelada')
    `);

    const mejorDia = await queryOne<any>(`
      SELECT EXTRACT(DOW FROM inicio) AS dia, COUNT(*) AS total
      FROM agenda
      WHERE inicio::date >= CURRENT_DATE - INTERVAL '3 months'
        AND estado NOT IN ('cancelada')
      GROUP BY EXTRACT(DOW FROM inicio)
      ORDER BY total DESC LIMIT 1
    `);

    const mejorHora = await queryOne<any>(`
      SELECT EXTRACT(HOUR FROM inicio) AS hora, COUNT(*) AS total
      FROM agenda
      WHERE inicio::date >= CURRENT_DATE - INTERVAL '3 months'
        AND estado NOT IN ('cancelada')
      GROUP BY EXTRACT(HOUR FROM inicio)
      ORDER BY total DESC LIMIT 1
    `);

    const servicioEstrella = await queryOne<any>(`
      SELECT ts.nombre, COUNT(*) AS total
      FROM agenda a JOIN tipo_servicios ts ON a.servicio_id = ts.id
      WHERE a.inicio::date >= CURRENT_DATE - INTERVAL '3 months'
        AND a.estado = 'completada'
      GROUP BY ts.id, ts.nombre ORDER BY total DESC LIMIT 1
    `);

    const comisionesPend = await queryOne<any>(`
      SELECT COUNT(*) AS cantidad, COALESCE(SUM(monto_cop), 0) AS monto
      FROM comisiones WHERE estado = 'pendiente'
    `);

    const totalClientes = await queryOne<any>(`
      SELECT COUNT(*) AS total FROM clientes`);

    const retencion = await queryOne<any>(`
      SELECT
        COUNT(DISTINCT CASE
          WHEN c.created_at >= CURRENT_DATE - INTERVAL '1 month'
          THEN c.id END) AS clientes_nuevos,
        COUNT(DISTINCT CASE
          WHEN c.created_at < CURRENT_DATE - INTERVAL '1 month'
            AND a2.cliente_id IS NOT NULL
          THEN c.id END) AS clientes_retornando
      FROM clientes c
      LEFT JOIN agenda a2 ON a2.cliente_id = c.id
        AND a2.inicio::date >= CURRENT_DATE - INTERVAL '1 month'
        AND a2.estado = 'completada'
    `);

    const DIAS_ES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

    return {
      mesCurr: { mes: mesCurr, ...curr },
      mesAnt:  { mes: mesAnt,  ...ant },
      deltas: {
        ingresos:        delta(Number(curr?.ingresos ?? 0),       Number(ant?.ingresos ?? 0)),
        completadas:     delta(Number(curr?.completadas ?? 0),    Number(ant?.completadas ?? 0)),
        ticket_promedio: delta(Number(curr?.ticket_promedio ?? 0),Number(ant?.ticket_promedio ?? 0)),
      },
      prom_citas_dia:    Number(dias30?.prom_dia ?? 0),
      mejor_dia:         mejorDia  ? { dia: DIAS_ES[Number(mejorDia.dia)], total: Number(mejorDia.total) } : null,
      mejor_hora:        mejorHora ? { hora: Number(mejorHora.hora), total: Number(mejorHora.total) } : null,
      servicio_estrella: servicioEstrella ?? null,
      comisiones_pendientes: { cantidad: Number(comisionesPend?.cantidad ?? 0), monto: Number(comisionesPend?.monto ?? 0) },
      total_clientes:    Number(totalClientes?.total ?? 0),
      clientes_nuevos:   Number(retencion?.clientes_nuevos ?? 0),
      clientes_retornando: Number(retencion?.clientes_retornando ?? 0),
    };
  }

  // ── Operaciones (equipo + distribución temporal) ────────────────────────────
  static async operaciones(meses: number) {
    const desde = desdeStr(meses);

    const rendimientoBarberos = await query<any>(`
      SELECT
        b.id                  AS barbero_id,
        u.nombre              AS barbero_nombre,
        b.color_agenda,
        b.porcentaje_comision,
        COUNT(*)              AS total_citas,
        SUM(CASE WHEN a.estado = 'completada' THEN 1 ELSE 0 END)  AS completadas,
        SUM(CASE WHEN a.estado = 'no_show'    THEN 1 ELSE 0 END)  AS no_shows,
        SUM(CASE WHEN a.estado = 'cancelada'  THEN 1 ELSE 0 END)  AS canceladas,
        COALESCE(SUM(CASE WHEN a.estado = 'completada' THEN a.precio_cop ELSE 0 END), 0) AS ingresos,
        COALESCE(AVG(CASE WHEN a.estado = 'completada'
          THEN CAST(a.precio_cop AS NUMERIC) ELSE NULL END), 0)   AS ticket_promedio,
        COUNT(DISTINCT a.cliente_id)                               AS clientes_atendidos,
        CASE WHEN COUNT(*) > 0
          THEN ROUND(100.0 * SUM(CASE WHEN a.estado = 'completada' THEN 1 ELSE 0 END) / COUNT(*), 1)
          ELSE 0 END                                               AS tasa_completacion,
        CASE WHEN COUNT(*) > 0
          THEN ROUND(100.0 * SUM(CASE WHEN a.estado = 'no_show' THEN 1 ELSE 0 END) / COUNT(*), 1)
          ELSE 0 END                                               AS tasa_no_show,
        CASE WHEN COUNT(*) > 0
          THEN ROUND(100.0 * SUM(CASE WHEN a.estado = 'cancelada' THEN 1 ELSE 0 END) / COUNT(*), 1)
          ELSE 0 END                                               AS tasa_cancelacion
      FROM agenda a
      JOIN barberos b ON a.barbero_id = b.id
      JOIN usuarios u ON b.usuario_id = u.id
      WHERE a.inicio::date >= ?
      GROUP BY b.id, u.nombre, b.color_agenda, b.porcentaje_comision
      ORDER BY ingresos DESC
    `, [desde]);

    const evolucionBarberos = await query<any>(`
      SELECT
        TO_CHAR(a.inicio, 'YYYY-MM') AS mes,
        u.nombre                      AS barbero_nombre,
        b.color_agenda,
        COALESCE(SUM(CASE WHEN a.estado = 'completada' THEN a.precio_cop ELSE 0 END), 0) AS ingresos,
        SUM(CASE WHEN a.estado = 'completada' THEN 1 ELSE 0 END) AS completadas
      FROM agenda a
      JOIN barberos b ON a.barbero_id = b.id
      JOIN usuarios u ON b.usuario_id = u.id
      WHERE a.inicio::date >= ?
      GROUP BY TO_CHAR(a.inicio, 'YYYY-MM'), b.id, u.nombre, b.color_agenda
      ORDER BY mes ASC, ingresos DESC
    `, [desde]);

    const horasPico = await query<any>(`
      SELECT
        EXTRACT(HOUR FROM inicio) AS hora,
        COUNT(*)     AS total,
        SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) AS completadas
      FROM agenda
      WHERE estado NOT IN ('cancelada') AND inicio::date >= ?
      GROUP BY EXTRACT(HOUR FROM inicio)
      ORDER BY hora ASC
    `, [desde]);

    const diasSemana = await query<any>(`
      SELECT
        EXTRACT(DOW FROM inicio)            AS dia,
        COUNT(*)                            AS total,
        SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) AS completadas,
        COALESCE(SUM(CASE WHEN estado = 'completada' THEN precio_cop ELSE 0 END), 0) AS ingresos
      FROM agenda
      WHERE estado NOT IN ('cancelada') AND inicio::date >= ?
      GROUP BY EXTRACT(DOW FROM inicio)
      ORDER BY dia ASC
    `, [desde]);

    const topServicios = await query<any>(`
      SELECT
        ts.nombre,
        ts.categoria,
        COUNT(*)  AS total_citas,
        SUM(CASE WHEN a.estado = 'completada' THEN 1 ELSE 0 END) AS completadas,
        COALESCE(SUM(CASE WHEN a.estado = 'completada' THEN a.precio_cop ELSE 0 END), 0) AS ingresos,
        COALESCE(AVG(CASE WHEN a.estado = 'completada'
          THEN CAST(a.precio_cop AS NUMERIC) ELSE NULL END), 0)  AS precio_promedio,
        CASE WHEN COUNT(*) > 0
          THEN ROUND(100.0 * SUM(CASE WHEN a.estado = 'completada' THEN 1 ELSE 0 END) / COUNT(*), 1)
          ELSE 0 END AS tasa_completacion
      FROM agenda a
      JOIN tipo_servicios ts ON a.servicio_id = ts.id
      WHERE a.inicio::date >= ?
      GROUP BY ts.id, ts.nombre, ts.categoria
      ORDER BY ingresos DESC
    `, [desde]);

    return { rendimientoBarberos, evolucionBarberos, horasPico, diasSemana, topServicios };
  }

  // ── Análisis de clientes ────────────────────────────────────────────────────
  static async clientes(meses: number) {
    const desde = desdeStr(meses);

    const segmentosClientes = await query<any>(`
      SELECT segmento, COUNT(*) AS total
      FROM clientes
      GROUP BY segmento
      ORDER BY total DESC
    `);

    const topClientes = await query<any>(`
      SELECT
        c.id, c.nombre, c.segmento, c.total_visitas,
        COUNT(a.id)                                                                  AS citas_periodo,
        COALESCE(SUM(CASE WHEN a.estado = 'completada' THEN a.precio_cop ELSE 0 END), 0) AS gasto_periodo,
        COALESCE(AVG(CASE WHEN a.estado = 'completada'
          THEN CAST(a.precio_cop AS NUMERIC) ELSE NULL END), 0)                     AS ticket_promedio,
        MAX(a.inicio::date)                                                          AS ultima_visita,
        u.nombre                                                                     AS barbero_favorito
      FROM clientes c
      JOIN agenda a      ON a.cliente_id  = c.id AND a.inicio::date >= ?
      LEFT JOIN barberos b  ON b.id = c.barbero_preferido
      LEFT JOIN usuarios u  ON u.id = b.usuario_id
      WHERE a.estado = 'completada'
      GROUP BY c.id, c.nombre, c.segmento, c.total_visitas, u.nombre
      ORDER BY gasto_periodo DESC
      LIMIT 10
    `, [desde]);

    const retencionMensual = await query<any>(`
      SELECT
        TO_CHAR(a.inicio, 'YYYY-MM')    AS mes,
        COUNT(DISTINCT a.cliente_id)     AS clientes_activos,
        COUNT(DISTINCT CASE
          WHEN c.created_at >= DATE_TRUNC('month', a.inicio)
          THEN a.cliente_id END)         AS nuevos,
        COUNT(DISTINCT CASE
          WHEN c.created_at <  DATE_TRUNC('month', a.inicio)
          THEN a.cliente_id END)         AS retornando
      FROM agenda a
      JOIN clientes c ON a.cliente_id = c.id
      WHERE a.estado = 'completada' AND a.inicio::date >= ?
      GROUP BY TO_CHAR(a.inicio, 'YYYY-MM')
      ORDER BY mes ASC
    `, [desde]);

    const frecuencia = await queryOne<any>(`
      SELECT ROUND(AVG(dias_entre), 0) AS dias_promedio
      FROM (
        SELECT cliente_id,
          EXTRACT(DAY FROM (MAX(inicio::date) - MIN(inicio::date)))
            / NULLIF(COUNT(*) - 1, 0) AS dias_entre
        FROM agenda
        WHERE estado = 'completada' AND inicio::date >= ?
        GROUP BY cliente_id
        HAVING COUNT(*) >= 2
      ) sub
    `, [desde]);

    const enRiesgo = await queryOne<any>(`
      SELECT COUNT(*) AS total
      FROM clientes
      WHERE segmento IN ('frecuente','vip')
        AND (ultimo_servicio IS NULL OR ultimo_servicio < CURRENT_DATE - INTERVAL '60 days')
    `);

    const nuevosPorMes = await query<any>(`
      SELECT TO_CHAR(created_at, 'YYYY-MM') AS mes, COUNT(*) AS nuevos
      FROM clientes
      WHERE created_at >= ?
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY mes ASC
    `, [desde]);

    return {
      segmentosClientes,
      topClientes,
      retencionMensual,
      frecuencia_promedio_dias: Number(frecuencia?.dias_promedio ?? 0),
      clientes_en_riesgo: Number(enRiesgo?.total ?? 0),
      nuevosPorMes,
    };
  }

  // ── Insights automáticos ────────────────────────────────────────────────────
  static async insights(meses: number) {
    const desde = desdeStr(meses);
    const resultados: { tipo: 'info' | 'warn' | 'success' | 'alert'; texto: string }[] = [];

    const topNoShow = await queryOne<any>(`
      SELECT u.nombre,
        ROUND(100.0 * SUM(CASE WHEN a.estado = 'no_show' THEN 1 ELSE 0 END) / COUNT(*), 1) AS tasa
      FROM agenda a JOIN barberos b ON a.barbero_id = b.id JOIN usuarios u ON b.usuario_id = u.id
      WHERE a.inicio::date >= ? GROUP BY b.id, u.nombre HAVING COUNT(*) >= 5 ORDER BY tasa DESC LIMIT 1
    `, [desde]);
    if (topNoShow && Number(topNoShow.tasa) > 12) {
      resultados.push({ tipo: 'warn', texto: `${topNoShow.nombre} tiene ${topNoShow.tasa}% de no-shows — considera reforzar recordatorios.` });
    }

    const mejorDia = await queryOne<any>(`
      SELECT EXTRACT(DOW FROM inicio) AS dia, COUNT(*) AS total
      FROM agenda WHERE estado NOT IN ('cancelada') AND inicio::date >= ?
      GROUP BY EXTRACT(DOW FROM inicio) ORDER BY total DESC LIMIT 1
    `, [desde]);
    const DIAS_ES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    if (mejorDia) {
      resultados.push({ tipo: 'info', texto: `El ${DIAS_ES[Number(mejorDia.dia)]} es tu día más demandado con ${mejorDia.total} citas.` });
    }

    const mejorHora = await queryOne<any>(`
      SELECT EXTRACT(HOUR FROM inicio) AS hora, COUNT(*) AS total
      FROM agenda WHERE estado NOT IN ('cancelada') AND inicio::date >= ?
      GROUP BY EXTRACT(HOUR FROM inicio) ORDER BY total DESC LIMIT 1
    `, [desde]);
    if (mejorHora) {
      resultados.push({ tipo: 'info', texto: `La franja de ${mejorHora.hora}:00–${Number(mejorHora.hora)+1}:00 concentra más citas. Asegura disponibilidad.` });
    }

    const topServicio = await queryOne<any>(`
      SELECT ts.nombre, COALESCE(SUM(a.precio_cop),0) AS ingresos, COUNT(*) AS total
      FROM agenda a JOIN tipo_servicios ts ON a.servicio_id = ts.id
      WHERE a.estado = 'completada' AND a.inicio::date >= ?
      GROUP BY ts.id, ts.nombre ORDER BY ingresos DESC LIMIT 1
    `, [desde]);
    if (topServicio) {
      resultados.push({ tipo: 'success', texto: `"${topServicio.nombre}" lidera en ingresos con ${topServicio.total} citas completadas.` });
    }

    const [curr2, ant2] = await Promise.all([
      queryOne<any>(`SELECT COALESCE(SUM(precio_cop),0) AS ing FROM agenda WHERE estado='completada' AND TO_CHAR(inicio,'YYYY-MM') = ?`, [mesActual()]),
      queryOne<any>(`SELECT COALESCE(SUM(precio_cop),0) AS ing FROM agenda WHERE estado='completada' AND TO_CHAR(inicio,'YYYY-MM') = ?`, [mesAnterior()]),
    ]);
    if (curr2 && ant2 && Number(ant2.ing) > 0) {
      const growth = Math.round((Number(curr2.ing) - Number(ant2.ing)) / Number(ant2.ing) * 100);
      if (growth > 10) {
        resultados.push({ tipo: 'success', texto: `Ingresos este mes crecieron +${growth}% vs el mes anterior. ¡Buen ritmo!` });
      } else if (growth < -10) {
        resultados.push({ tipo: 'alert', texto: `Ingresos este mes cayeron ${growth}% vs el mes anterior. Revisa disponibilidad y cancelaciones.` });
      }
    }

    const riesgo = await queryOne<any>(`
      SELECT COUNT(*) AS total FROM clientes
      WHERE segmento IN ('frecuente','vip')
        AND (ultimo_servicio IS NULL OR ultimo_servicio < CURRENT_DATE - INTERVAL '60 days')
    `);
    if (Number(riesgo?.total ?? 0) > 0) {
      resultados.push({ tipo: 'warn', texto: `${riesgo.total} cliente${riesgo.total > 1 ? 's' : ''} VIP/frecuente${riesgo.total > 1 ? 's' : ''} sin visita en 60+ días. Considera contactarlos.` });
    }

    const comPend = await queryOne<any>(`SELECT COUNT(*) AS n FROM comisiones WHERE estado='pendiente'`);
    if (Number(comPend?.n ?? 0) > 0) {
      resultados.push({ tipo: 'alert', texto: `Hay ${comPend.n} comisiones pendientes de pago a barberos.` });
    }

    return resultados;
  }
}
