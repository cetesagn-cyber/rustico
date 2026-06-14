import { Router } from 'express';
import { FinancieroController } from './financiero.controller';
import { verificarToken, requerirRol } from '../auth/auth.middleware';

const router = Router();
router.use(verificarToken as any);
router.use(requerirRol('admin') as any);

// ── Resúmenes ─────────────────────────────────────────────────────────────────
router.get('/resumen',              FinancieroController.resumenPeriodo);
router.get('/resumen/mes',          FinancieroController.resumenMes);
router.get('/evolucion/mensual',    FinancieroController.evolucionMensual);
router.get('/cierre',               FinancieroController.cierre);

// ── Comisiones ────────────────────────────────────────────────────────────────
router.get('/comisiones',            FinancieroController.listarComisiones);
router.get('/comisiones/pendientes', FinancieroController.resumenComisionesPendientes);
router.patch('/comisiones/pagar',    FinancieroController.pagarComisiones);

// ── Gastos ────────────────────────────────────────────────────────────────────
router.get('/gastos/categorias',            FinancieroController.categoriasGasto);
router.get('/gastos',                       FinancieroController.listarGastos);
router.post('/gastos',     FinancieroController.crearGasto);
router.patch('/gastos/:id', FinancieroController.actualizarGasto);
router.delete('/gastos/:id', FinancieroController.eliminarGasto);

export default router;
