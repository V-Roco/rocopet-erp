// Paleta validada (dataviz skill): primeros 3 slots categóricos, pasan
// contraste CVD/normal-vision en all-pairs. Un solo tono para series únicas.
export const CHART_COLORS = {
  series1: '#2a78d6', // blue
  series2: '#eb6834', // orange
  series3: '#1baf7a', // aqua
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  textSecondary: '#52514e',
  textMuted: '#898781',
};

export function formatCLP(value: number): string {
  return `$${value.toLocaleString('es-CL')}`;
}

export function formatDateLabel(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
}
