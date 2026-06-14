import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRouter        from './modules/auth/auth.routes';
import agendaRouter      from './modules/agenda/agenda.routes';
import clientesRouter    from './modules/clientes/clientes.routes';
import barberosRouter    from './modules/barberos/barberos.routes';
import serviciosRouter   from './modules/servicios/servicios.routes';
import productosRouter   from './modules/productos/productos.routes';
import combosRouter      from './modules/combos/combos.routes';
import financieroRouter  from './modules/financiero/financiero.routes';
import estadisticasRouter from './modules/estadisticas/estadisticas.routes';
import adelantosRouter    from './modules/adelantos/adelantos.routes';
import whatsappRouter    from './modules/whatsapp/whatsapp.routes';
import { errorHandler }  from './shared/middlewares/error.handler';
import { initDatabase }  from './shared/database/init-pg';
import { iniciarJobRecordatorios } from './shared/jobs/recordatorios.job';
import { AgendaService } from './modules/agenda/agenda.service';

dotenv.config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET no configurado o demasiado corto (mínimo 32 chars). Revisa el archivo .env');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3002;
const frontendOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-site' },
}));

app.use(cors({
  origin: frontendOrigins.length > 0
    ? frontendOrigins
    : (process.env.NODE_ENV === 'development' ? true : false),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Demasiadas solicitudes. Intenta en unos minutos.' },
}));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Demasiados intentos de acceso. Intenta en 15 minutos.' },
  skipSuccessfulRequests: true,
});

app.use(express.json({ limit: '50kb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/api/v1/auth/login', loginLimiter);
app.use('/api/v1/auth',        authRouter);
app.use('/api/v1/agenda',      agendaRouter);
app.use('/api/v1/clientes',    clientesRouter);
app.use('/api/v1/barberos',    barberosRouter);
app.use('/api/v1/servicios',   serviciosRouter);
app.use('/api/v1/productos',   productosRouter);
app.use('/api/v1/combos',      combosRouter);
app.use('/api/v1/financiero',  financieroRouter);
app.use('/api/v1/estadisticas', estadisticasRouter);
app.use('/api/v1/adelantos',   adelantosRouter);
app.use('/api/v1/whatsapp',    whatsappRouter);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'success',
    message: '💈 Rústico BarberAdmin API — operando',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  });
});

app.use(errorHandler as any);

async function arrancar() {
  try {
    await initDatabase();
    // await AgendaService.generarTokensHuerfanos(); // Comentado para SQLite
    iniciarJobRecordatorios();

    if (process.env.NODE_ENV !== 'test') {
      app.listen(PORT, () => {
        console.log('💈 ═══════════════════════════════════════════════ 💈');
        console.log(`🚀 Rústico BarberAdmin API · ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔗 http://localhost:${PORT}`);
        console.log('💈 ═══════════════════════════════════════════════ 💈');
      });
    }
  } catch (err) {
    console.error('❌ Error al iniciar el servidor:', err);
    process.exit(1);
  }
}

arrancar();

export default app;
