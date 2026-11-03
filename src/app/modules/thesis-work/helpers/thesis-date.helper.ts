import { formatDisplayDate } from '../../../core/utils/date-utils';

/**
 * Formatea una fecha al estilo DD - MM - YYYY usado en todos los documentos del módulo.
 * Centralizado porque el mismo bloque de 3 líneas se repite en cada sub-servicio.
 */
export function formatThesisDate(date: Date = new Date()): string {
  return formatDisplayDate(date);
}

export function ensureDate(date: Date | string | undefined | null): Date {
  if (date instanceof Date && !Number.isNaN(date.getTime())) return date;
  if (typeof date === 'string' && date.trim()) {
    const parsed = new Date(date);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}
