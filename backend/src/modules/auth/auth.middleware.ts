import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { queryOne } from '../../shared/database/pg.client';
import { RolUsuario, UsuarioPayload } from './auth.types';

export interface AuthRequest extends Request {
  user?: UsuarioPayload;
}

export async function verificarToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ status: 'error', message: 'Token no proporcionado.' });
    return;
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as UsuarioPayload;
    const usuario = await queryOne<UsuarioPayload & { activo: number }>(
      'SELECT id, nombre, email, rol, activo FROM usuarios WHERE id = ?',
      [decoded.id],
    );

    if (!usuario || !usuario.activo) {
      res.status(401).json({ status: 'error', message: 'Sesión inválida o usuario inactivo.' });
      return;
    }

    req.user = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
    };
    next();
  } catch {
    res.status(401).json({ status: 'error', message: 'Token inválido o expirado.' });
  }
}

export function requerirRol(...roles: RolUsuario[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'No autenticado.' });
    }
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ status: 'error', message: 'Sin permiso para esta acción.' });
    }
    next();
  };
}
