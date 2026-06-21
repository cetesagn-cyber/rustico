import { Router } from 'express';
import { AgendaController } from './agenda.controller';
import { verificarToken, requerirRol } from '../auth/auth.middleware';

const router = Router();

// Rutas públicas — sin autenticación (confirmación desde WhatsApp)
router.get('/confirmar/:token',   AgendaController.obtenerPorToken);
router.patch('/confirmar/:token', AgendaController.confirmarPorToken);

// Rutas protegidas
router.use(verificarToken as any);

const adminOrRecepcion = requerirRol('admin', 'recepcion') as any;

router.get('/mis-citas',                 AgendaController.misCitas as any);
router.get('/',                          adminOrRecepcion, AgendaController.listarPorFecha);
router.get('/resumen',                   adminOrRecepcion, AgendaController.resumenDia);
router.get('/recordatorios-pendientes',  adminOrRecepcion, AgendaController.recordatoriosPendientes);
router.post('/',                         adminOrRecepcion, AgendaController.crear as any);
router.get('/barbero/:id',               adminOrRecepcion, AgendaController.listarPorBarbero);
router.get('/:id',                       adminOrRecepcion, AgendaController.obtener);
router.patch('/:id/estado',              adminOrRecepcion, AgendaController.actualizarEstado);
router.patch('/:id/recordatorio-enviado', adminOrRecepcion, AgendaController.marcarRecordatorioEnviado);

export default router;
