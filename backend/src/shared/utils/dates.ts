export function formatFechaBogota(date: Date): string {
  return date.toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatHoraBogota(date: Date): string {
  return date.toLocaleTimeString('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatCOP(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(valor);
}

export function inicioDia(fechaStr: string): string {
  return `${fechaStr}T00:00:00-05:00`;
}

export function finDia(fechaStr: string): string {
  return `${fechaStr}T23:59:59-05:00`;
}
