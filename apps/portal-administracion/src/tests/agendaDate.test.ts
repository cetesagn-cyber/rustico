/**
 * agendaDate utils — pruebas unitarias puras (sin DOM)
 * Verifica que los helpers de fecha y hora funcionen correctamente
 * con strings TIMESTAMPTZ de PostgreSQL (formato Bogotá).
 */
import { describe, it, expect } from 'vitest';
import {
  agendaTimeParts,
  diffAgendaMinutes,
  formatAgendaFecha,
  formatAgendaHora,
} from '../utils/agendaDate';

const BOGOTA_09H = '2026-06-14 09:00:00-05';
const BOGOTA_09H30 = '2026-06-14 09:30:00-05';
const BOGOTA_11H45 = '2026-06-14 11:45:00-05';

describe('agendaTimeParts()', () => {
  it('extrae hora y minutos de un timestamp Bogotá', () => {
    const { hour, minute } = agendaTimeParts(BOGOTA_09H);
    expect(hour).toBe(9);
    expect(minute).toBe(0);
  });

  it('extrae hora y minutos con offset explícito', () => {
    const { hour, minute } = agendaTimeParts(BOGOTA_11H45);
    expect(hour).toBe(11);
    expect(minute).toBe(45);
  });
});

describe('diffAgendaMinutes()', () => {
  it('calcula diferencia de 30 minutos correctamente', () => {
    expect(diffAgendaMinutes(BOGOTA_09H, BOGOTA_09H30)).toBe(30);
  });

  it('calcula diferencia de 165 minutos (09:00 → 11:45)', () => {
    expect(diffAgendaMinutes(BOGOTA_09H, BOGOTA_11H45)).toBe(165);
  });

  it('devuelve 0 para timestamps iguales', () => {
    expect(diffAgendaMinutes(BOGOTA_09H, BOGOTA_09H)).toBe(0);
  });
});

describe('formatAgendaHora()', () => {
  it('formatea hora como HH:MM (09:00)', () => {
    const resultado = formatAgendaHora(BOGOTA_09H);
    expect(resultado).toBe('09:00');
  });

  it('formatea hora 11:45', () => {
    expect(formatAgendaHora(BOGOTA_11H45)).toBe('11:45');
  });
});

describe('formatAgendaFecha()', () => {
  it('devuelve una fecha legible en español', () => {
    const resultado = formatAgendaFecha(BOGOTA_09H);
    // La función no incluye año (por diseño — año implícito en agenda)
    expect(resultado).toMatch(/junio/i);
    expect(resultado).toMatch(/14|domingo/i);
  });
});
