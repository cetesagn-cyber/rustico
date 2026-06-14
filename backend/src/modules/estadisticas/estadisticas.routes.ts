import { Router } from 'express';
import { EstadisticasController } from './estadisticas.controller';
import { verificarToken, requerirRol } from '../auth/auth.middleware';

const router = Router();
router.use(verificarToken as any);
router.use(requerirRol('admin') as any);

router.get('/evolucion',   EstadisticasController.evolucion);
router.get('/operaciones', EstadisticasController.operaciones);
router.get('/kpis',        EstadisticasController.kpis);
router.get('/clientes',    EstadisticasController.clientes);
router.get('/insights',    EstadisticasController.insights);

export default router;
