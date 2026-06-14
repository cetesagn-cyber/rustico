import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  details?: unknown;
}

export function errorHandler(err: AppError, req: Request, res: Response, _next: NextFunction) {
  const status = err.statusCode || 500;
  const dev = process.env.NODE_ENV === 'development';

  console.error(`💥 [${req.method}] ${req.url} → ${status}: ${err.message}`);
  if (dev) console.error(err.stack);

  const body: Record<string, unknown> = {
    status: 'error',
    // En producción, nunca exponer mensajes internos de errores 500
    message: status < 500 ? (err.message || 'Error en la solicitud.') : 'Error interno del servidor.',
  };
  if (dev && status >= 500) body.stack = err.stack;
  if (err.details && status < 500) body.details = err.details;

  res.status(status).json(body);
}
