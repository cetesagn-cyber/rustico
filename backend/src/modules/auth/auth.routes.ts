import { Router } from 'express';
import { AuthController } from './auth.controller';
import { verificarToken, requerirRol } from './auth.middleware';

const router = Router();

router.post('/login', AuthController.login);
router.get('/me', verificarToken as any, AuthController.me as any);
router.post('/password', verificarToken as any, AuthController.cambiarMiPassword as any);

const auth  = verificarToken as any;
const admin = requerirRol('admin') as any;

router.post  ('/register',                   auth, admin, AuthController.register);
router.get   ('/usuarios',                   auth, admin, AuthController.listarUsuarios);
router.put   ('/usuarios/:id',               auth, admin, AuthController.actualizar as any);
router.patch ('/usuarios/:id/activo',        auth, admin, AuthController.toggleActivo);
router.post  ('/usuarios/:id/password',      auth, admin, AuthController.cambiarPassword);
router.delete('/usuarios/:id',               auth, admin, AuthController.eliminar as any);

export default router;
