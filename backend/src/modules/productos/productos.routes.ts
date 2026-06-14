import { Router } from 'express';
import { ProductosController } from './productos.controller';
import { verificarToken, requerirRol } from '../auth/auth.middleware';

const router = Router();
router.use(verificarToken as any);

router.get('/',                ProductosController.listar);
router.post('/',               requerirRol('admin') as any, ProductosController.crear);
router.put('/:id',             requerirRol('admin') as any, ProductosController.actualizar);
router.patch('/:id/activo',    requerirRol('admin') as any, ProductosController.toggleActivo);

export default router;
