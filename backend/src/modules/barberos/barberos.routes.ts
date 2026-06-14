import { Router } from 'express';
import { BarberosController } from './barberos.controller';
import { verificarToken, requerirRol } from '../auth/auth.middleware';

const router = Router();

router.use(verificarToken as any);
const admin = requerirRol('admin') as any;

router.get('/',                        BarberosController.listar);
router.post('/',                       admin, BarberosController.crear);
router.get('/:id',                     BarberosController.obtener);
router.put('/:id',                     admin, BarberosController.actualizar);
router.patch('/:id/activo',            admin, BarberosController.toggleActivo);
router.delete('/:id',                  admin, BarberosController.eliminar);
router.get('/:id/disponibilidad',      BarberosController.disponibilidad);
router.get('/:id/estadisticas',        BarberosController.estadisticas);

export default router;
