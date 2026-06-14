import { Request, Response, NextFunction } from 'express';
import { ServiciosService } from './servicios.service';

export class ServiciosController {
  static async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const todos = req.query.todos === '1';
      res.json({ status: 'success', data: await ServiciosService.listar(todos) });
    } catch (err) { next(err); }
  }

  static async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ServiciosService.crear(req.body);
      res.status(201).json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  static async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ServiciosService.actualizar(req.params.id, req.body);
      res.json({ status: 'success', data });
    } catch (err: any) {
      res.status(404).json({ status: 'error', message: err.message });
    }
  }

  static async toggleActivo(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ServiciosService.toggleActivo(req.params.id, req.body.activo);
      res.json({ status: 'success', data });
    } catch (err: any) {
      res.status(404).json({ status: 'error', message: err.message });
    }
  }

  static async eliminar(req: Request, res: Response, next: NextFunction) {
    try {
      await ServiciosService.eliminar(req.params.id);
      res.status(204).send();
    } catch (err) { next(err); }
  }
}
