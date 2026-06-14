import { Router } from 'express';
import { ServiciosController } from './servicios.controller';
import { verificarToken, requerirRol } from '../auth/auth.middleware';

const router = Router();

router.use(verificarToken as any);

router.get('/', ServiciosController.listar);
router.post('/', requerirRol('admin') as any, ServiciosController.crear);
router.put('/:id', requerirRol('admin') as any, ServiciosController.actualizar);
router.patch('/:id/activo', requerirRol('admin') as any, ServiciosController.toggleActivo);
router.delete('/:id', requerirRol('admin') as any, ServiciosController.eliminar);

export default router;
