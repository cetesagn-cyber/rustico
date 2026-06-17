import { create } from 'zustand';
import { api } from '../api/client';

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'barbero' | 'recepcion';
}

interface AuthState {
  usuario: Usuario | null;
  token: string | null;
  cargando: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  cargarPerfil: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  usuario: null,
  token: sessionStorage.getItem('rustico_token') || localStorage.getItem('rustico_token'),
  cargando: false,

  login: async (email, password) => {
    set({ cargando: true });
    try {
      const data = await api.post<{ token: string; usuario: Usuario }>('/auth/login', { email, password });
      sessionStorage.setItem('rustico_token', data.token);
      localStorage.removeItem('rustico_token');
      set({ token: data.token, usuario: data.usuario, cargando: false });
    } catch (err) {
      set({ cargando: false });
      throw err;
    }
  },

  logout: () => {
    sessionStorage.removeItem('rustico_token');
    localStorage.removeItem('rustico_token');
    set({ token: null, usuario: null });
  },

  cargarPerfil: async () => {
    const token = sessionStorage.getItem('rustico_token') || localStorage.getItem('rustico_token');
    if (!token) return;
    sessionStorage.setItem('rustico_token', token);
    localStorage.removeItem('rustico_token');
    try {
      const usuario = await api.get<Usuario>('/auth/me');
      set({ token, usuario });
    } catch {
      sessionStorage.removeItem('rustico_token');
      localStorage.removeItem('rustico_token');
      set({ token: null, usuario: null });
    }
  },
}));
