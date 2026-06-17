/**
 * Login — pruebas de componente
 * Verifica: render inicial, submit exitoso, manejo de error, botón deshabilitado.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { mockApi } from './mocks/api.mock';
import { useAuthStore } from '../store/auth.store';
import Login from '../pages/Login';

const USUARIO_MOCK = { id: '1', nombre: 'Admin', email: 'admin@rustico.co', rol: 'admin' as const };
const TOKEN_MOCK   = 'tok.test.123';

// useNavigate mock
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderLogin() {
  return render(<Login />, { wrapper: MemoryRouter });
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  localStorage.clear();
  useAuthStore.setState({ usuario: null, token: null, cargando: false });
});

describe('Login — render', () => {
  it('muestra campo de email y contraseña', () => {
    renderLogin();
    expect(screen.getByLabelText(/correo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ingresar/i })).toBeInTheDocument();
  });

  it('pre-rellena el email por defecto', () => {
    renderLogin();
    const emailInput = screen.getByLabelText(/correo/i) as HTMLInputElement;
    expect(emailInput.value).toBe('admin@rustico.co');
  });
});

describe('Login — submit exitoso', () => {
  it('llama a login y navega a / tras éxito', async () => {
    mockApi.post.mockResolvedValueOnce({ token: TOKEN_MOCK, usuario: USUARIO_MOCK });

    renderLogin();
    const passwordInput = screen.getByLabelText(/contraseña/i);

    await userEvent.clear(passwordInput);
    await userEvent.type(passwordInput, 'Password1');
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
        email: 'admin@rustico.co',
        password: 'Password1',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});

describe('Login — errores', () => {
  it('muestra mensaje de error cuando las credenciales fallan', async () => {
    mockApi.post.mockRejectedValueOnce(new Error('Credenciales incorrectas'));

    renderLogin();
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));

    await waitFor(() => {
      expect(screen.getByText(/credenciales incorrectas/i)).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('muestra "Ingresando…" mientras carga', async () => {
    let resolveLogin!: (v: any) => void;
    mockApi.post.mockReturnValueOnce(
      new Promise(res => { resolveLogin = res; }),
    );

    renderLogin();
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'Password1');
    fireEvent.click(screen.getByRole('button', { name: /ingresar/i }));

    // Durante la carga
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ingresando/i })).toBeDisabled();
    });

    // Limpiar
    resolveLogin({ token: TOKEN_MOCK, usuario: USUARIO_MOCK });
  });
});
