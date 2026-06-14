import { Router } from 'express';
import { AdelantosController } from './adelantos.controller';
import { verificarToken, requerirRol } from '../auth/auth.middleware';

const router = Router();
router.use(verificarToken as any);
router.use(requerirRol('admin', 'recepcion') as any);

router.get('/resumen', AdelantosController.resumen);
router.get('/',        AdelantosController.listar);
router.post('/',       AdelantosController.crear);
router.delete('/:id',  AdelantosController.anular);

export default router;
