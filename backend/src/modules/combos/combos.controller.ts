import { Request, Response, NextFunction } from 'express';
import { CombosService } from './combos.service';

export class CombosController {
  static async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const todos = req.query.todos === '1';
      const data = await CombosService.listar(todos);
      res.json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  static async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await CombosService.crear(req.body);
      res.status(201).json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  static async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await CombosService.actualizar(req.params.id, req.body);
      res.json({ status: 'success', data });
    } catch (err: any) {
      res.status(404).json({ status: 'error', message: err.message });
    }
  }

  static async toggleActivo(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await CombosService.toggleActivo(req.params.id, req.body.activo);
      res.json({ status: 'success', data });
    } catch (err: any) {
      res.status(404).json({ status: 'error', message: err.message });
    }
  }

  static async eliminar(req: Request, res: Response, next: NextFunction) {
    try {
      await CombosService.eliminar(req.params.id);
      res.status(204).send();
    } catch (err) { next(err); }
  }
}
