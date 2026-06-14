import { Request, Response, NextFunction } from 'express';
import { EstadisticasService } from './estadisticas.service';

function parseMeses(req: Request, def = 6): number {
  return Math.min(Math.max(parseInt((req.query.meses as string) || String(def), 10), 1), 24);
}

export class EstadisticasController {
  static async evolucion(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await EstadisticasService.evolucion(parseMeses(req, 6));
      res.json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  static async operaciones(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await EstadisticasService.operaciones(parseMeses(req, 3));
      res.json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  static async kpis(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await EstadisticasService.kpis();
      res.json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  static async clientes(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await EstadisticasService.clientes(parseMeses(req, 3));
      res.json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  static async insights(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await EstadisticasService.insights(parseMeses(req, 3));
      res.json({ status: 'success', data });
    } catch (err) { next(err); }
  }
}
