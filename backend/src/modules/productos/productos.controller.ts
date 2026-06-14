import { Request, Response, NextFunction } from 'express';
import { ProductosService } from './productos.service';

export class ProductosController {
  static async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const todos = req.query.todos === '1';
      const data = await ProductosService.listar(todos);
      res.json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  static async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ProductosService.crear(req.body);
      res.status(201).json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  static async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ProductosService.actualizar(req.params.id, req.body);
      res.json({ status: 'success', data });
    } catch (err: any) {
      res.status(404).json({ status: 'error', message: err.message });
    }
  }

  static async toggleActivo(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ProductosService.toggleActivo(req.params.id, req.body.activo);
      res.json({ status: 'success', data });
    } catch (err: any) {
      res.status(404).json({ status: 'error', message: err.message });
    }
  }
}
