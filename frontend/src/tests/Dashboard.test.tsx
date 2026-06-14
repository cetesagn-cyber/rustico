/**
 * Dashboard — pruebas de componente
 * Verifica: estado de carga, renderizado de KPIs, lista de citas del día.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mockApi } from './mocks/api.mock';
import { useAuthStore } from '../store/auth.store';
import Dashboard from '../pages/Dashboard';

const RESUMEN_MOCK = {
  total_citas: '5',
  completadas: '3',
  pendientes: '2',
  no_shows: '0',
  ingresos_cop: '275000',
};

const CITAS_MOCK = [
  {
    id: 'c1',
    inicio: '2026-06-14T09:00:00-05:00',
    fin:    '2026-06-14T09:30:00-05:00',
    estado: 'completada',
    precio_cop: 55000,
    cliente_nombre: 'Carlos García',
    servicio_nombre: 'Corte clásico',
    barbero_nombre: 'Jhon',
    barbero_color: '#3A7BD5',
  },
  {
    id: 'c2',
    inicio: '2026-06-14T10:00:00-05:00',
    fin:    '2026-06-14T10:45:00-05:00',
    estado: 'confirmada',
    precio_cop: 70000,
    cliente_nombre: 'Luis Martínez',
    servicio_nombre: 'Corte + barba',
    barbero_nombre: 'Pedro',
    barbero_color: '#E74C3C',
  },
];

function renderDashboard() {
  return render(<Dashboard />, { wrapper: MemoryRouter });
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({
    usuario: { id: '1', nombre: 'Admin', email: 'admin@rustico.co', rol: 'admin' },
    token: 'tok.test',
    cargando: false,
  });
});

describe('Dashboard — carga', () => {
  it('muestra indicador de carga mientras espera la API', () => {
    // Promesas que nunca resuelven → estado de carga permanente
    mockApi.get.mockReturnValue(new Promise(() => {}));
    renderDashboard();
    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });
});

describe('Dashboard — con datos', () => {
  beforeEach(() => {
    mockApi.get
      .mockResolvedValueOnce(RESUMEN_MOCK) // /agenda/resumen
      .mockResolvedValueOnce(CITAS_MOCK);  // /agenda?fecha=...
  });

  it('muestra los KPIs correctamente', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument(); // Citas hoy
      expect(screen.getByText('3')).toBeInTheDocument(); // Completadas
      expect(screen.getByText('2')).toBeInTheDocument(); // Pendientes
    });
  });

  it('muestra los ingresos formateados', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText(/275\.000/)).toBeInTheDocument();
    });
  });

  it('lista las citas del día con cliente y servicio', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Carlos García')).toBeInTheDocument();
      expect(screen.getByText(/corte clásico/i)).toBeInTheDocument();
      expect(screen.getByText('Luis Martínez')).toBeInTheDocument();
      expect(screen.getByText(/corte \+ barba/i)).toBeInTheDocument();
    });
  });

  it('muestra el badge de estado de la cita', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('completada')).toBeInTheDocument();
      expect(screen.getByText('confirmada')).toBeInTheDocument();
    });
  });
});

describe('Dashboard — sin citas', () => {
  it('muestra mensaje cuando no hay citas hoy', async () => {
    mockApi.get
      .mockResolvedValueOnce({ ...RESUMEN_MOCK, total_citas: '0' })
      .mockResolvedValueOnce([]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/sin citas agendadas/i)).toBeInTheDocument();
    });
  });
});
