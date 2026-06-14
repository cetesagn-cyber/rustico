import { Request, Response, NextFunction } from 'express';
import { AdelantosService } from './adelantos.service';

const hoy = () => new Date().toISOString().slice(0, 10);

export class AdelantosController {

  static async resumen(req: Request, res: Response, next: NextFunction) {
    try {
      const fecha = (req.query.fecha as string) || hoy();
      const data  = await AdelantosService.resumenDia(fecha);
      res.json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  static async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const fecha = (req.query.fecha as string) || hoy();
      const data  = await AdelantosService.listarPorFecha(fecha);
      res.json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  static async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const usuario = (req as any).usuario;
      const data = await AdelantosService.crear({ ...req.body, creado_por: usuario?.id });
      res.status(201).json({ status: 'success', data });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }

  static async anular(req: Request, res: Response, next: NextFunction) {
    try {
      await AdelantosService.anular(req.params.id);
      res.status(204).send();
    } catch (err: any) {
      res.status(404).json({ status: 'error', message: err.message });
    }
  }
}
