import { Request, Response, NextFunction } from 'express';
import { WhatsAppService } from './whatsapp.service';
import { execute, query } from '../../shared/database/pg.client';

const hoy = () => new Date().toISOString().slice(0, 10);
const wa  = () => WhatsAppService.instance;

export class WhatsAppController {

  // GET /api/v1/whatsapp/estado
  static estado(_req: Request, res: Response) {
    const svc = wa();
    res.json({ status: 'success', data: {
      estado:  svc.estado,
      qr:      svc.qr,
      info:    svc.info,
    }});
  }

  // POST /api/v1/whatsapp/conectar
  static async conectar(_req: Request, res: Response, next: NextFunction) {
    try {
      await wa().inicializar();
      res.json({ status: 'success', data: { mensaje: 'Iniciando conexión…' } });
    } catch (err) { next(err); }
  }

  // POST /api/v1/whatsapp/desconectar
  static async desconectar(_req: Request, res: Response, next: NextFunction) {
    try {
      await wa().desconectar();
      res.json({ status: 'success', data: { mensaje: 'WhatsApp desconectado.' } });
    } catch (err) { next(err); }
  }

  // POST /api/v1/whatsapp/agenda-dia
  static async enviarAgendaDia(req: Request, res: Response, next: NextFunction) {
    try {
      const fecha = (req.body.fecha as string) || hoy();
      const result = await wa().enviarAgendaDia(fecha);
      res.json({ status: 'success', data: result });
    } catch (err) { next(err); }
  }

  // POST /api/v1/whatsapp/mensaje-prueba
  static async mensajePrueba(req: Request, res: Response, next: NextFunction) {
    try {
      const { telefono, mensaje } = req.body as { telefono: string; mensaje?: string };
      if (!telefono) { res.status(400).json({ status: 'error', message: 'Teléfono requerido.' }); return; }
      const text = mensaje || '🧪 Mensaje de prueba desde Rústico BarberAdmin ✂️';
      await wa().enviarMensaje(telefono, text);
      res.json({ status: 'success', data: { mensaje: 'Enviado correctamente.' } });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }

  // GET /api/v1/whatsapp/barberos
  static async barberos(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await WhatsAppService.barberosTelefono();
      res.json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  // PATCH /api/v1/whatsapp/barberos/:id
  static async toggleBarbero(req: Request, res: Response, next: NextFunction) {
    try {
      const { whatsapp_activo } = req.body as { whatsapp_activo: boolean };
      await execute('UPDATE barberos SET whatsapp_activo = ? WHERE id = ?', [whatsapp_activo ? 1 : 0, req.params.id]);
      res.json({ status: 'success', data: { actualizado: true } });
    } catch (err) { next(err); }
  }

  // PATCH /api/v1/whatsapp/barberos/:id/telefono
  static async actualizarTelefono(req: Request, res: Response, next: NextFunction) {
    try {
      const { telefono } = req.body as { telefono: string };
      await execute(`
        UPDATE usuarios u
        JOIN   barberos b ON u.id = b.usuario_id
        SET    u.telefono = ?
        WHERE  b.id = ?
      `, [telefono || null, req.params.id]);
      res.json({ status: 'success', data: { actualizado: true } });
    } catch (err) { next(err); }
  }
}
