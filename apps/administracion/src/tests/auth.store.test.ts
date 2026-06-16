/**
 * Auth Store — pruebas unitarias del store Zustand
 * Verifica: login exitoso, login fallido, logout, cargarPerfil.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockApi } from './mocks/api.mock';
import { useAuthStore } from '../store/auth.store';

const USUARIO_MOCK = { id: '1', nombre: 'Admin QA', email: 'admin@rustico.co', rol: 'admin' as const };
const TOKEN_MOCK   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  localStorage.clear();
  // Resetear el store a estado inicial
  useAuthStore.setState({ usuario: null, token: null, cargando: false });
});

describe('login()', () => {
  it('guarda token y usuario en el store tras login exitoso', async () => {
    mockApi.post.mockResolvedValueOnce({ token: TOKEN_MOCK, usuario: USUARIO_MOCK });

    await useAuthStore.getState().login('admin@rustico.co', 'Password1');

    const { usuario, token } = useAuthStore.getState();
    expect(token).toBe(TOKEN_MOCK);
    expect(usuario).toMatchObject({ email: 'admin@rustico.co', rol: 'admin' });
    expect(sessionStorage.getItem('rustico_token')).toBe(TOKEN_MOCK);
  });

  it('guarda token en sessionStorage (no localStorage)', async () => {
    mockApi.post.mockResolvedValueOnce({ token: TOKEN_MOCK, usuario: USUARIO_MOCK });

    await useAuthStore.getState().login('admin@rustico.co', 'Password1');

    expect(sessionStorage.getItem('rustico_token')).toBe(TOKEN_MOCK);
    expect(localStorage.getItem('rustico_token')).toBeNull();
  });

  it('lanza error y deja store limpio si las credenciales son incorrectas', async () => {
    mockApi.post.mockRejectedValueOnce(new Error('Credenciales incorrectas'));

    await expect(
      useAuthStore.getState().login('admin@rustico.co', 'wrong'),
    ).rejects.toThrow('Credenciales incorrectas');

    const { usuario, token, cargando } = useAuthStore.getState();
    expect(usuario).toBeNull();
    expect(token).toBeNull();
    expect(cargando).toBe(false);
  });
});

describe('logout()', () => {
  it('limpia token y usuario del store y storage', async () => {
    sessionStorage.setItem('rustico_token', TOKEN_MOCK);
    useAuthStore.setState({ token: TOKEN_MOCK, usuario: USUARIO_MOCK });

    useAuthStore.getState().logout();

    const { usuario, token } = useAuthStore.getState();
    expect(usuario).toBeNull();
    expect(token).toBeNull();
    expect(sessionStorage.getItem('rustico_token')).toBeNull();
    expect(localStorage.getItem('rustico_token')).toBeNull();
  });
});

describe('cargarPerfil()', () => {
  it('restaura usuario desde token almacenado', async () => {
    sessionStorage.setItem('rustico_token', TOKEN_MOCK);
    mockApi.get.mockResolvedValueOnce(USUARIO_MOCK);

    await useAuthStore.getState().cargarPerfil();

    const { usuario } = useAuthStore.getState();
    expect(usuario).toMatchObject({ nombre: 'Admin QA' });
  });

  it('no hace nada si no hay token en storage', async () => {
    await useAuthStore.getState().cargarPerfil();

    expect(mockApi.get).not.toHaveBeenCalled();
    expect(useAuthStore.getState().usuario).toBeNull();
  });

  it('limpia store si el token está expirado (401)', async () => {
    sessionStorage.setItem('rustico_token', TOKEN_MOCK);
    mockApi.get.mockRejectedValueOnce(new Error('Unauthorized'));

    await useAuthStore.getState().cargarPerfil();

    expect(useAuthStore.getState().usuario).toBeNull();
    expect(sessionStorage.getItem('rustico_token')).toBeNull();
  });
});
