function escapeCsvField(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  // Si trae el separador, comilla o salto de línea, hay que citarlo y escapar las comillas internas.
  if (/[";\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  // Excel con configuración regional en español usa la coma como separador decimal,
  // así que espera punto y coma como separador de columnas (si no, todo cae en la columna A).
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvField).join(';'));
  // BOM al inicio para que Excel abra los acentos (UTF-8) sin corromperlos.
  return '﻿' + lines.join('\r\n');
}

export function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
