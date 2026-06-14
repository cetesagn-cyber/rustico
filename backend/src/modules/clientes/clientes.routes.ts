import { Router } from 'express';
import { ClientesController } from './clientes.controller';
import { verificarToken } from '../auth/auth.middleware';

const router = Router();

router.use(verificarToken as any);

router.get('/', ClientesController.listar);
router.post('/', ClientesController.crear);
router.get('/resumen', ClientesController.resumen);
router.get('/:id', ClientesController.obtener);
router.put('/:id', ClientesController.actualizar);
router.get('/:id/historial', ClientesController.historial);

export default router;
