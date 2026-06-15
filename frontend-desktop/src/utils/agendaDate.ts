function normalizeAgendaDate(value: string) {
  return String(value)
    .replace(' ', 'T')
    .replace(/\.\d{3}Z$/, '')
    .replace(/Z$/, '')
    .slice(0, 19);
}

export function agendaTimeParts(value: string) {
  const normalized = normalizeAgendaDate(value);
  const match = normalized.match(/T(\d{2}):(\d{2})/);
  if (match) return { hour: Number(match[1]), minute: Number(match[2]) };

  const date = new Date(value);
  return { hour: date.getHours(), minute: date.getMinutes() };
}

export function formatAgendaHora(value: string) {
  const { hour, minute } = agendaTimeParts(value);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function diffAgendaMinutes(start: string, end: string) {
  const startMs = new Date(normalizeAgendaDate(start)).getTime();
  const endMs = new Date(normalizeAgendaDate(end)).getTime();
  return Math.max(0, Math.round((endMs - startMs) / 60_000));
}

export function formatAgendaFecha(value: string) {
  const datePart = normalizeAgendaDate(value).slice(0, 10);
  return new Date(`${datePart}T12:00:00`).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
