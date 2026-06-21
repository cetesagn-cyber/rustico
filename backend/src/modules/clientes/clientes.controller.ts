import { Request, Response, NextFunction } from 'express';
import { ClientesService } from './clientes.service';

export class ClientesController {
  static async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = '1', limite = '20', q = '', segmento = '', contacto = '' } = req.query as Record<string, string>;
      const data = await ClientesService.listar(parseInt(page), parseInt(limite), q, segmento, contacto);
      res.json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  static async resumen(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ClientesService.resumen();
      res.json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  static async obtener(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ClientesService.obtener(req.params.id);
      res.json({ status: 'success', data });
    } catch (err: any) {
      res.status(404).json({ status: 'error', message: err.message });
    }
  }

  static async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ClientesService.crear(req.body);
      res.status(201).json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  static async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ClientesService.actualizar(req.params.id, req.body);
      res.json({ status: 'success', data });
    } catch (err: any) {
      const status = err.message === 'Cliente no encontrado.' ? 404 : 400;
      res.status(status).json({ status: 'error', message: err.message });
    }
  }

  static async historial(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ClientesService.historial(req.params.id);
      res.json({ status: 'success', data });
    } catch (err) { next(err); }
  }
}
