/**
 * ProtectedRoute — pruebas de componente
 * Verifica: redirige a /login sin token, permite acceso con token,
 *           bloquea por rol cuando el usuario no tiene el rol requerido.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import ProtectedRoute from '../components/ProtectedRoute';

// Importamos mock para que api.client no falle en el store
import './mocks/api.mock';

const Admin    = () => <div>Página admin</div>;
const Barbero  = () => <div>Página barbero</div>;
const LoginPage = () => <div>Página login</div>;

type Rol = 'admin' | 'barbero' | 'recepcion';

function renderWithRoute(initialPath: string, roles?: Rol[]) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={
          <ProtectedRoute roles={roles}>
            <Admin />
          </ProtectedRoute>
        } />
        <Route path="/barbero" element={
          <ProtectedRoute roles={['barbero']}>
            <Barbero />
          </ProtectedRoute>
        } />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  useAuthStore.setState({ usuario: null, token: null, cargando: false });
});

describe('ProtectedRoute — sin autenticación', () => {
  it('redirige a /login si no hay usuario', () => {
    renderWithRoute('/admin');
    expect(screen.getByText(/página login/i)).toBeInTheDocument();
  });
});

describe('ProtectedRoute — autenticado', () => {
  beforeEach(() => {
    useAuthStore.setState({
      usuario: { id: '1', nombre: 'Admin', email: 'a@r.co', rol: 'admin' },
      token: 'tok',
      cargando: false,
    });
  });

  it('renderiza la página si el usuario tiene token', () => {
    renderWithRoute('/admin');
    expect(screen.getByText(/página admin/i)).toBeInTheDocument();
  });

  it('permite acceso si el usuario tiene el rol requerido', () => {
    renderWithRoute('/admin', ['admin']);
    expect(screen.getByText(/página admin/i)).toBeInTheDocument();
  });

  it('bloquea el acceso si el usuario no tiene el rol requerido', () => {
    // Admin intentando entrar a ruta de solo barbero
    renderWithRoute('/barbero');
    // Debe redirigir al login o mostrar acceso denegado
    expect(screen.queryByText(/página barbero/i)).not.toBeInTheDocument();
  });
});

describe('ProtectedRoute — rol barbero', () => {
  beforeEach(() => {
    useAuthStore.setState({
      usuario: { id: '2', nombre: 'Jhon', email: 'jhon@r.co', rol: 'barbero' },
      token: 'tok.barbero',
      cargando: false,
    });
  });

  it('permite acceso a ruta de barbero', () => {
    renderWithRoute('/barbero');
    expect(screen.getByText(/página barbero/i)).toBeInTheDocument();
  });

  it('bloquea acceso a ruta exclusiva de admin', () => {
    renderWithRoute('/admin', ['admin']);
    expect(screen.queryByText(/página admin/i)).not.toBeInTheDocument();
  });
});
