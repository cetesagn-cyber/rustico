import cron from 'node-cron';
import { query, execute } from '../database/pg.client';
import { WhatsAppService } from '../../modules/whatsapp/whatsapp.service';

const hoyStr = () => new Date().toISOString().slice(0, 10);

export function iniciarJobRecordatorios() {
  const wa = WhatsAppService.instance;

  // ── Recordatorios de cita (cada 5 min) ─────────────────────────────────────
  cron.schedule('*/5 * * * *', async () => {
    try {
      const ahora        = new Date();
      const ventanaInicio = new Date(ahora.getTime() + (30 * 60 - 120) * 1_000).toISOString();
      const ventanaFin    = new Date(ahora.getTime() + (30 * 60 + 120) * 1_000).toISOString();

      const pendientes = await query<any>(`
        SELECT a.id, a.inicio, a.precio_cop,
               c.nombre  AS cliente_nombre, c.telefono AS cliente_telefono,
               ts.nombre AS servicio_nombre,
               u.nombre  AS barbero_nombre,  u.telefono AS barbero_telefono,
               b.whatsapp_activo
        FROM agenda a
        JOIN tipo_servicios ts ON ts.id = a.servicio_id
        JOIN barberos b        ON b.id  = a.barbero_id
        JOIN usuarios u        ON u.id  = b.usuario_id
        LEFT JOIN clientes c   ON c.id  = a.cliente_id
        WHERE a.inicio BETWEEN ? AND ?
          AND a.estado IN ('confirmada','pendiente')
          AND a.recordatorio_enviado = 0
      `, [ventanaInicio, ventanaFin]);

      if (!pendientes.length) return;

      for (const cita of pendientes) {
        await execute('UPDATE agenda SET recordatorio_enviado = 1 WHERE id = ?', [cita.id]);

        if (!wa.conectado) continue;

        // Enviar al barbero
        if (cita.barbero_telefono && cita.whatsapp_activo) {
          await wa.enviarMensaje(cita.barbero_telefono, WhatsAppService.buildMensajeRecordatorio(cita))
            .catch(e => console.error('⚠️ WhatsApp recordatorio barbero:', e.message));
        }
        // Enviar al cliente
        if (cita.cliente_telefono) {
          await wa.enviarMensaje(cita.cliente_telefono, WhatsAppService.buildMensajeRecordatorio(cita))
            .catch(e => console.error('⚠️ WhatsApp recordatorio cliente:', e.message));
        }
      }

      if (pendientes.length > 0)
        console.log(`⏰ ${pendientes.length} recordatorio(s) enviados por WhatsApp`);

    } catch (err) {
      console.error('⚠️  Error en job recordatorios:', err);
    }
  });

  // ── Agenda diaria a las 7:00 am ────────────────────────────────────────────
  cron.schedule('0 7 * * *', async () => {
    try {
      if (!wa.conectado) {
        console.log('📅 Job agenda diaria: WhatsApp no conectado, omitiendo.');
        return;
      }
      const { enviados, errores } = await wa.enviarAgendaDia(hoyStr());
      console.log(`📅 Agendas diarias enviadas: ${enviados} barbero(s).`);
      if (errores.length) console.warn('⚠️  Errores:', errores.join(', '));
    } catch (err) {
      console.error('⚠️  Error en job agenda diaria:', err);
    }
  });

  console.log('⏰ Jobs activos — recordatorios (5 min) y agenda diaria (7:00 am)');
}
