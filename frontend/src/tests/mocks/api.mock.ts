/**
 * Mock del cliente HTTP para tests. Reemplaza todas las llamadas a /api/*
 * con datos controlados por cada test.
 */
import { vi } from 'vitest';

export const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../../api/client', () => ({ api: mockApi }));
