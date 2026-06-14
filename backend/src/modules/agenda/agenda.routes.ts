import { Router } from 'express';
import { AgendaController } from './agenda.controller';
import { verificarToken } from '../auth/auth.middleware';

const router = Router();

// Rutas públicas — sin autenticación (confirmación desde WhatsApp)
router.get('/confirmar/:token',   AgendaController.obtenerPorToken);
router.patch('/confirmar/:token', AgendaController.confirmarPorToken);

// Rutas protegidas
router.use(verificarToken as any);

router.get('/',                          AgendaController.listarPorFecha);
router.get('/resumen',                   AgendaController.resumenDia);
router.get('/recordatorios-pendientes',  AgendaController.recordatoriosPendientes);
router.post('/',                         AgendaController.crear as any);
router.get('/barbero/:id',               AgendaController.listarPorBarbero);
router.get('/:id',                       AgendaController.obtener);
router.patch('/:id/estado',              AgendaController.actualizarEstado);
router.patch('/:id/recordatorio-enviado', AgendaController.marcarRecordatorioEnviado);

export default router;
