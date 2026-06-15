import { Request, Response, NextFunction } from 'express';
import { AgendaService } from './agenda.service';
import { AuthRequest } from '../auth/auth.middleware';

const hoy = () => new Date().toISOString().split('T')[0];

export class AgendaController {
  static async listarPorFecha(req: Request, res: Response, next: NextFunction) {
    try {
      const { fecha = hoy() } = req.query as { fecha?: string };
      const data = await AgendaService.listarPorFecha(fecha);
      res.json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  static async listarPorBarbero(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { fecha = hoy() } = req.query as { fecha?: string };
      const data = await AgendaService.listarPorBarbero(id, fecha);
      res.json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  static async obtener(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AgendaService.obtener(req.params.id);
      res.json({ status: 'success', data });
    } catch (err: any) {
      res.status(404).json({ status: 'error', message: err.message });
    }
  }

  static async crear(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await AgendaService.crear(req.body, req.user!.id);
      res.status(201).json({ status: 'success', data });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }

  static async actualizarEstado(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { estado } = req.body;
      if (!estado) return res.status(400).json({ status: 'error', message: 'Campo estado requerido.' });
      const data = await AgendaService.actualizarEstado(id, estado);
      res.json({ status: 'success', data });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }

  static async resumenDia(req: Request, res: Response, next: NextFunction) {
    try {
      const { fecha = hoy() } = req.query as { fecha?: string };
      const data = await AgendaService.resumenDia(fecha);
      res.json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  static async obtenerPorToken(req: Request, res: Response) {
    try {
      const data = await AgendaService.obtenerPorToken(req.params.token);
      res.json({ status: 'success', data });
    } catch (err: any) {
      res.status(404).json({ status: 'error', message: err.message });
    }
  }

  static async confirmarPorToken(req: Request, res: Response) {
    try {
      const data = await AgendaService.confirmarPorToken(req.params.token);
      res.json({ status: 'success', data });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }

  // Usado por la app móvil — devuelve solo las citas del barbero autenticado
  static async misCitas(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const hoyStr = new Date().toISOString().split('T')[0];
      const { fecha = hoyStr } = req.query as { fecha?: string };
      const data = await AgendaService.misCitas(req.user!.id, fecha);
      res.json({ status: 'success', data });
    } catch (err: any) {
      res.status(404).json({ status: 'error', message: err.message });
    }
  }

  static async recordatoriosPendientes(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AgendaService.recordatoriosPendientes();
      res.json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  static async marcarRecordatorioEnviado(req: Request, res: Response, next: NextFunction) {
    try {
      await AgendaService.marcarRecordatorioEnviado(req.params.id);
      res.json({ status: 'success' });
    } catch (err) { next(err); }
  }
}
