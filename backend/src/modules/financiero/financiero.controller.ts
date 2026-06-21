import { Request, Response, NextFunction } from 'express';
import { FinancieroService, CATEGORIAS_GASTO } from './financiero.service';

const hoy       = () => new Date().toISOString().split('T')[0];
const inicioMes = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

export class FinancieroController {

  // ── Resúmenes ───────────────────────────────────────────────────────────────
  static async resumenPeriodo(req: Request, res: Response, next: NextFunction) {
    try {
      const { fecha_inicio, fecha_fin, desde, hasta } =
        req.query as { fecha_inicio?: string; fecha_fin?: string; desde?: string; hasta?: string };
      const fi = fecha_inicio || desde || hoy();
      const ff = fecha_fin || hasta || hoy();
      const data = await FinancieroService.resumenPeriodo(fi, ff);
      res.json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  static async resumenMes(req: Request, res: Response, next: NextFunction) {
    try {
      const { mes } = req.query as { mes?: string };
      const base      = mes ? `${mes}-01` : inicioMes();
      const d         = new Date(base);
      const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const fi        = base;
      const ff        = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
      const data      = await FinancieroService.resumenPeriodo(fi, ff);
      res.json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  static async evolucionMensual(req: Request, res: Response, next: NextFunction) {
    try {
      const meses = Number((req.query as any).meses) || 6;
      const data  = await FinancieroService.resumenMensualMultiple(Math.min(meses, 24));
      res.json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  // ── Comisiones ──────────────────────────────────────────────────────────────
  static async listarComisiones(req: Request, res: Response, next: NextFunction) {
    try {
      const { estado, barbero_id } = req.query as { estado?: string; barbero_id?: string };
      const data = await FinancieroService.listarComisiones(estado, barbero_id);
      res.json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  static async pagarComisiones(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body as { ids: string[] };
      if (!Array.isArray(ids) || !ids.length) {
        return res.status(400).json({ status: 'error', message: 'ids debe ser un arreglo no vacío.' });
      }
      const data = await FinancieroService.pagarComisiones(ids);
      res.json({ status: 'success', data });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }

  static async resumenComisionesPendientes(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await FinancieroService.resumenComisionesPendientes();
      res.json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  // ── Gastos ──────────────────────────────────────────────────────────────────
  static async listarGastos(req: Request, res: Response, next: NextFunction) {
    try {
      const { fecha_inicio, fecha_fin, categoria } =
        req.query as { fecha_inicio?: string; fecha_fin?: string; categoria?: string };
      const data = await FinancieroService.listarGastos(fecha_inicio, fecha_fin, categoria);
      res.json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  static async crearGasto(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const data   = await FinancieroService.crearGasto(req.body, userId);
      res.status(201).json({ status: 'success', data });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }

  static async actualizarGasto(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await FinancieroService.actualizarGasto(req.params.id, req.body);
      res.json({ status: 'success', data });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }

  static async eliminarGasto(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await FinancieroService.eliminarGasto(req.params.id);
      res.json({ status: 'success', data });
    } catch (err: any) {
      res.status(404).json({ status: 'error', message: err.message });
    }
  }

  static async categoriasGasto(_req: Request, res: Response) {
    res.json({ status: 'success', data: CATEGORIAS_GASTO });
  }

  // ── Cierre de caja ──────────────────────────────────────────────────────────
  static async cierre(req: Request, res: Response, next: NextFunction) {
    try {
      const { tipo = 'diario', fecha } = req.query as { tipo?: string; fecha?: string };
      let fi: string, ff: string;

      if (tipo === 'mensual') {
        const base = fecha ? `${fecha}-01` : inicioMes();
        const d    = new Date(base + 'T12:00:00');
        fi = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        ff = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(ultimo).padStart(2, '0')}`;
      } else {
        fi = ff = fecha ?? hoy();
      }

      const data = await FinancieroService.cierreData(fi, ff);
      res.json({ status: 'success', data: { ...data, fecha_inicio: fi, fecha_fin: ff, tipo } });
    } catch (err) { next(err); }
  }
}
