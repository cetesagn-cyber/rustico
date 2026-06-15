import { Router } from 'express';
import { ClientesController } from './clientes.controller';
import { verificarToken, requerirRol } from '../auth/auth.middleware';

const router = Router();

router.use(verificarToken as any);

const adminOrRecepcion = requerirRol('admin', 'recepcion') as any;

// Lectura: cualquier usuario autenticado (barberos pueden buscar clientes)
router.get('/',             ClientesController.listar);
router.get('/resumen',      ClientesController.resumen);
router.get('/:id',          ClientesController.obtener);
router.get('/:id/historial', ClientesController.historial);

// Escritura: solo admin y recepción
router.post('/',    adminOrRecepcion, ClientesController.crear);
router.put('/:id',  adminOrRecepcion, ClientesController.actualizar);

export default router;
