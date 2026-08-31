// "2026-08-13" (sin hora) debe cubrir el día completo en un filtro de rango.
// Si ya viene con hora (ISO completo), se respeta tal cual.
export function startOfDay(dateStr: string): Date {
  return dateStr.includes('T') ? new Date(dateStr) : new Date(`${dateStr}T00:00:00.000`);
}

export function endOfDay(dateStr: string): Date {
  return dateStr.includes('T') ? new Date(dateStr) : new Date(`${dateStr}T23:59:59.999`);
}
