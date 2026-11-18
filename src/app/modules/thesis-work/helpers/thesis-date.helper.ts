import { formatDisplayDate } from '../../../core/utils/date-utils';

/** Formatea una fecha como «DD - MM - AAAA», el formato de los documentos del módulo. */
export function formatThesisDate(date: Date = new Date()): string {
  return formatDisplayDate(date);
}

/** Convierte el valor en fecha; si no es una fecha válida, devuelve la fecha actual. */
export function ensureDate(date: Date | string | undefined | null): Date {
  if (date instanceof Date && !Number.isNaN(date.getTime())) return date;
  if (typeof date === 'string' && date.trim()) {
    const parsed = new Date(date);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}
