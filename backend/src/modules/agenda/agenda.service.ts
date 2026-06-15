import { query, queryOne, execute, uuidv4 } from '../../shared/database/pg.client';
import { ClientesService } from '../clientes/clientes.service';
import { FinancieroService } from '../financiero/financiero.service';
import { CrearCitaBody, EstadoCita } from './agenda.types';
import { inicioDia, finDia } from '../../shared/utils/dates';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

const CITA_SELECT = `
  a.id, a.inicio, a.fin, a.estado, a.precio_cop, a.notas, a.metodo_pago,
  a.cliente_id, a.barbero_id, a.servicio_id,
  a.token_confirmacion, a.recordatorio_enviado,
  c.nombre  as cliente_nombre,  c.telefono  as cliente_telefono,
  ts.nombre as servicio_nombre, ts.duracion_min,
  u.nombre  as barbero_nombre,
  b.color_agenda as barbero_color
`;

const CITA_JOINS = `
  FROM agenda a
  LEFT JOIN clientes c     ON a.cliente_id  = c.id
  JOIN tipo_servicios ts   ON a.servicio_id = ts.id
  JOIN barberos b          ON a.barbero_id  = b.id
  JOIN usuarios u          ON b.usuario_id  = u.id
`;

export class AgendaService {
  static async listarPorFecha(fechaStr: string) {
    return query(`
      SELECT ${CITA_SELECT}
      ${CITA_JOINS}
      WHERE a.inicio >= ? AND a.inicio <= ?
        AND a.estado != 'cancelada'
      ORDER BY a.inicio ASC
    `, [inicioDia(fechaStr), finDia(fechaStr)]);
  }

  static async listarPorBarbero(barberoId: string, fechaStr: string) {
    return query(`
      SELECT ${CITA_SELECT}
      ${CITA_JOINS}
      WHERE a.barbero_id = ? AND a.inicio >= ? AND a.inicio <= ?
      ORDER BY a.inicio ASC
    `, [barberoId, inicioDia(fechaStr), finDia(fechaStr)]);
  }

  static async obtener(id: string) {
    const cita = await queryOne(`
      SELECT ${CITA_SELECT}
      ${CITA_JOINS}
      WHERE a.id = ?
    `, [id]);
    if (!cita) throw new Error('Cita no encontrada.');
    return cita;
  }

  static async crear(body: CrearCitaBody, createdBy: string) {
    const { cliente_id, barbero_id, servicio_id, inicio, notas, precio_cop, metodo_pago = 'efectivo' } = body;

    const servicio = await queryOne<any>(
      'SELECT precio_cop, duracion_min FROM tipo_servicios WHERE id = ? AND activo = TRUE',
      [servicio_id],
    );
    if (!servicio) throw new Error('Servicio no encontrado.');

    const precioFinal = precio_cop ?? servicio.precio_cop;
    const inicioDate = new Date(inicio);
    const finDate = new Date(inicioDate.getTime() + servicio.duracion_min * 60_000);
    const inicioISO = inicioDate.toISOString();
    const finISO    = finDate.toISOString();

    const solapamiento = await queryOne(`
      SELECT id FROM agenda
      WHERE barbero_id = ?
        AND estado NOT IN ('cancelada')
        AND (inicio < ? AND fin > ?)
    `, [barbero_id, finISO, inicioISO]);

    if (solapamiento) throw new Error('El barbero ya tiene una cita en ese horario.');

    const id    = uuidv4();
    const token = uuidv4().replace(/-/g, ''); // 32 chars hex — mayor entropía (2^128)

    await execute(`
      INSERT INTO agenda (id, cliente_id, barbero_id, servicio_id, inicio, fin, estado, precio_cop, metodo_pago, notas, token_confirmacion, created_by)
      VALUES (?, ?, ?, ?, ?, ?, 'confirmada', ?, ?, ?, ?, ?)
    `, [id, cliente_id || null, barbero_id, servicio_id, inicioISO, finISO, precioFinal, metodo_pago, notas || null, token, createdBy]);

    const citaCreada = await queryOne<any>(`SELECT ${CITA_SELECT} ${CITA_JOINS} WHERE a.id = ?`, [id]);

    // Notificar al barbero por WhatsApp (sin bloquear la respuesta)
    setImmediate(async () => {
      try {
        const wa = WhatsAppService.instance;
        if (!wa.conectado || !citaCreada) return;
        const barberInfo = await queryOne<any>(`
          SELECT u.telefono, b.whatsapp_activo
          FROM   barberos b JOIN usuarios u ON u.id = b.usuario_id
          WHERE  b.id = ?
        `, [barbero_id]);
        if (barberInfo?.whatsapp_activo && barberInfo?.telefono) {
          await wa.enviarMensaje(barberInfo.telefono, WhatsAppService.buildMensajeNuevaCita(citaCreada));
        }
      } catch { /* no bloquear */ }
    });

    return citaCreada;
  }

  static async obtenerPorToken(token: string) {
    const cita = await queryOne(`
      SELECT ${CITA_SELECT} ${CITA_JOINS} WHERE a.token_confirmacion = ?
    `, [token]);
    if (!cita) throw new Error('Enlace no válido o expirado.');
    return cita;
  }

  static async confirmarPorToken(token: string) {
    const cita = await queryOne<any>(
      'SELECT id, estado FROM agenda WHERE token_confirmacion = ?',
      [token],
    );
    if (!cita) throw new Error('Enlace no válido o expirado.');
    if (cita.estado === 'cancelada') throw new Error('Esta cita fue cancelada.');
    if (cita.estado !== 'confirmada') {
      await execute(`UPDATE agenda SET estado = 'confirmada', updated_at = NOW() WHERE id = ?`, [cita.id]);
    }
    return queryOne(`SELECT ${CITA_SELECT} ${CITA_JOINS} WHERE a.id = ?`, [cita.id]);
  }

  static async recordatoriosPendientes() {
    return query(`
      SELECT ${CITA_SELECT} ${CITA_JOINS}
      WHERE a.recordatorio_enviado = 1
        AND a.estado IN ('confirmada', 'pendiente')
      ORDER BY a.inicio ASC
    `);
  }

  static async marcarRecordatorioEnviado(id: string) {
    await execute(`UPDATE agenda SET recordatorio_enviado = 2, updated_at = NOW() WHERE id = ?`, [id]);
  }

  static async generarTokensHuerfanos() {
    const sinToken = await query<any>(`SELECT id FROM agenda WHERE token_confirmacion IS NULL`);
    for (const row of sinToken) {
      const token = uuidv4().replace(/-/g, '').slice(0, 16);
      try {
        await execute(`UPDATE agenda SET token_confirmacion = ? WHERE id = ?`, [token, row.id]);
      } catch {}
    }
    return sinToken.length;
  }

  // Endpoint exclusivo para la app móvil: resuelve el barbero desde el usuario autenticado
  static async misCitas(usuarioId: string, fechaStr: string) {
    const barbero = await queryOne<{ id: string }>(
      'SELECT id FROM barberos WHERE usuario_id = ?',
      [usuarioId],
    );
    if (!barbero) throw new Error('No se encontró perfil de barbero para este usuario.');
    return query(`
      SELECT ${CITA_SELECT}
      ${CITA_JOINS}
      WHERE a.barbero_id = ? AND a.inicio >= ? AND a.inicio <= ?
      ORDER BY a.inicio ASC
    `, [barbero.id, inicioDia(fechaStr), finDia(fechaStr)]);
  }

  static async actualizarEstado(id: string, estado: EstadoCita) {
    await execute('UPDATE agenda SET estado = ? WHERE id = ?', [estado, id]);
    const cita = await queryOne<any>('SELECT * FROM agenda WHERE id = ?', [id]);
    if (!cita) throw new Error('Cita no encontrada.');

    if (estado === 'completada') {
      if (cita.cliente_id) await ClientesService.actualizarSegmento(cita.cliente_id);

      const barbero = await queryOne<any>(
        'SELECT porcentaje_comision FROM barberos WHERE id = ?',
        [cita.barbero_id],
      );

      if (barbero) {
        const monto   = Math.round(cita.precio_cop * barbero.porcentaje_comision / 100);
        const inicio  = typeof cita.inicio === 'string' ? cita.inicio : (cita.inicio as Date).toISOString();
        const periodo = inicio.slice(0, 7);
        await FinancieroService.crearComision(cita.id, cita.barbero_id, monto, barbero.porcentaje_comision, periodo);
      }
    }

    return cita;
  }

  static async resumenDia(fechaStr: string) {
    return queryOne(`
      SELECT
        SUM(CASE WHEN estado != 'cancelada' THEN 1 ELSE 0 END)               AS total_citas,
        SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END)                AS completadas,
        SUM(CASE WHEN estado IN ('pendiente','confirmada') THEN 1 ELSE 0 END) AS pendientes,
        SUM(CASE WHEN estado = 'no_show' THEN 1 ELSE 0 END)                  AS no_shows,
        COALESCE(SUM(CASE WHEN estado = 'completada' THEN precio_cop ELSE 0 END), 0) AS ingresos_cop
      FROM agenda
      WHERE inicio >= ? AND inicio <= ?
    `, [inicioDia(fechaStr), finDia(fechaStr)]);
  }
}
