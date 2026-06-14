import { Request, Response, NextFunction } from 'express';
import { BarberosService } from './barberos.service';

export class BarberosController {
  static async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const incluirInactivos = req.query.todos === '1';
      const data = await BarberosService.listar(incluirInactivos);
      res.json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  static async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const { nombre, email, password } = req.body;
      if (!nombre || !email || !password)
        return res.status(400).json({ status: 'error', message: 'Nombre, email y contraseña son requeridos.' });
      const data = await BarberosService.crear(req.body);
      res.status(201).json({ status: 'success', data });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }

  static async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await BarberosService.actualizar(req.params.id, req.body);
      res.json({ status: 'success', data });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }

  static async toggleActivo(req: Request, res: Response, next: NextFunction) {
    try {
      const activo = req.body.activo as boolean;
      if (typeof activo !== 'boolean')
        return res.status(400).json({ status: 'error', message: 'Campo activo (boolean) requerido.' });
      const data = await BarberosService.toggleActivo(req.params.id, activo);
      res.json({ status: 'success', data });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }

  static async obtener(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await BarberosService.obtener(req.params.id);
      res.json({ status: 'success', data });
    } catch (err: any) {
      res.status(404).json({ status: 'error', message: err.message });
    }
  }

  static async disponibilidad(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { fecha } = req.query as { fecha: string };
      if (!fecha) return res.status(400).json({ status: 'error', message: 'Parámetro fecha requerido.' });
      const slots = await BarberosService.disponibilidad(id, fecha);
      res.json({ status: 'success', data: slots });
    } catch (err) { next(err); }
  }

  static async estadisticas(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await BarberosService.estadisticas(req.params.id);
      res.json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  static async eliminar(req: Request, res: Response, next: NextFunction) {
    try {
      await BarberosService.eliminar(req.params.id);
      res.json({ status: 'success' });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }
}
