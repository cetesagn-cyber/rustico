import { Router } from 'express';
import { CombosController } from './combos.controller';
import { verificarToken, requerirRol } from '../auth/auth.middleware';

const router = Router();
router.use(verificarToken as any);

router.get('/',               CombosController.listar);
router.post('/',              requerirRol('admin') as any, CombosController.crear);
router.put('/:id',            requerirRol('admin') as any, CombosController.actualizar);
router.patch('/:id/activo',   requerirRol('admin') as any, CombosController.toggleActivo);
router.delete('/:id',         requerirRol('admin') as any, CombosController.eliminar);

export default router;
