import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { AuthRequest } from './auth.middleware';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const usuario = await AuthService.registrar(req.body);
      res.status(201).json({ status: 'success', data: usuario });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ status: 'error', message: 'Correo y contraseña son requeridos.' });
    }
    try {
      const data = await AuthService.login({ email, password });
      res.status(200).json({ status: 'success', data });
    } catch (err: any) {
      // Sin PII en logs — solo la razón del fallo para auditoría interna
      console.warn(`[auth] login fallido — ${err.message}`);
      res.status(401).json({ status: 'error', message: err.message });
    }
  }

  static async me(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const usuario = await AuthService.perfil(req.user!.id);
      res.status(200).json({ status: 'success', data: usuario });
    } catch (err: any) {
      res.status(404).json({ status: 'error', message: err.message });
    }
  }

  static async listarUsuarios(req: Request, res: Response, next: NextFunction) {
    try {
      const usuarios = await AuthService.listarUsuarios();
      res.status(200).json({ status: 'success', data: usuarios });
    } catch (err) {
      next(err);
    }
  }

  static async toggleActivo(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.toggleActivo(req.params.id, req.body.activo);
      res.status(200).json({ status: 'success', data: result });
    } catch (err: any) {
      res.status(404).json({ status: 'error', message: err.message });
    }
  }

  static async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AuthService.actualizar(req.params.id, req.body);
      res.json({ status: 'success', data });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }

  static async cambiarPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AuthService.cambiarPassword(req.params.id, req.body.password);
      res.json({ status: 'success', data });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }

  static async cambiarMiPassword(req: AuthRequest, res: Response) {
    try {
      const data = await AuthService.cambiarMiPassword(req.user!.id, req.body.actual, req.body.password);
      res.json({ status: 'success', data });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }

  static async eliminar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await AuthService.eliminar(req.params.id, req.user!.id);
      res.json({ status: 'success', data });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }
}
