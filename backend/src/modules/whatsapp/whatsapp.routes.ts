import { Router } from 'express';
import { WhatsAppController } from './whatsapp.controller';
import { verificarToken, requerirRol } from '../auth/auth.middleware';

const router = Router();
router.use(verificarToken as any);

const admin = requerirRol('admin') as any;

router.get('/estado',                 admin, WhatsAppController.estado);
router.get('/barberos',               admin, WhatsAppController.barberos);
router.post('/conectar',          admin,      WhatsAppController.conectar);
router.post('/desconectar',       admin,      WhatsAppController.desconectar);
router.post('/agenda-dia',        admin,      WhatsAppController.enviarAgendaDia);
router.post('/mensaje-prueba',    admin,      WhatsAppController.mensajePrueba);
router.patch('/barberos/:id',     admin,      WhatsAppController.toggleBarbero);
router.patch('/barberos/:id/tel', admin,      WhatsAppController.actualizarTelefono);

export default router;
