export type RolUsuario = 'admin' | 'barbero' | 'recepcion';

export interface UsuarioPayload {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface RegisterBody {
  nombre: string;
  email: string;
  telefono?: string;
  password: string;
  rol?: RolUsuario;
}
