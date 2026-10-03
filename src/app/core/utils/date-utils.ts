/**
 * Suma una cantidad de días hábiles (Lunes-Viernes) a una fecha inicial.
 * Soporta objetos Date y cadenas de texto (ISO strings de localStorage).
 *
 * @param startDate Fecha base inicial o string ISO.
 * @param daysToAdd Cantidad de días hábiles a adicionar.
 * @param setToEndOfDay Si es verdadero, fija la hora de expiración a las 23:59:59.999.
 * @returns La nueva fecha calculada con los días hábiles sumados.
 */
export function addBusinessDays(startDate: Date | string, daysToAdd: number, setToEndOfDay: boolean = false): Date {
  if (!startDate || daysToAdd <= 0) {
    return new Date(startDate || new Date());
  }

  const date = new Date(startDate);
  let addedDays = 0;

  while (addedDays < daysToAdd) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();

    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      addedDays++;
    }
  }

  if (setToEndOfDay) {
    date.setHours(23, 59, 59, 999);
  }

  return date;
}

/**
 * Calcula cuántos días hábiles hay entre la fecha actual y una fecha objetivo.
 * Soporta objetos Date y cadenas de texto (ISO strings de localStorage).
 * Si la fecha límite ya expiró, devolverá un número entero negativo.
 *
 * @param targetDate Fecha límite de control.
 * @returns La cantidad de días hábiles restantes (número negativo si ya expiró).
 */
export function getRemainingBusinessDays(targetDate: Date | string): number {
  if (!targetDate) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const limit = new Date(targetDate);
  limit.setHours(0, 0, 0, 0);

  if (today.getTime() === limit.getTime()) return 0;

  const isPast = today > limit;
  let start = isPast ? new Date(limit) : new Date(today);
  const end = isPast ? new Date(today) : new Date(limit);

  let businessDays = 0;

  while (start < end) {
    start.setDate(start.getDate() + 1);
    const dayOfWeek = start.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++;
    }
  }

  return isPast ? -businessDays : businessDays;
}

/**
 * Formatea una fecha al estilo 'DD - MM - YYYY' para visualización en la UI.
 *
 * @param date Fecha a formatear (por defecto la fecha actual).
 * @returns Cadena de texto con la fecha formateada.
 */
export function formatDisplayDate(date: Date = new Date()): string {
  return date
    .toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .replaceAll('/', ' - ');
}

/**
 * Parsea una fecha transformándola a un objeto Date real.
 * Reconoce objetos Date, cadenas ISO, o el patrón de visualización 'DD - MM - YYYY'.
 *
 * @param value Valor de la fecha a parsear.
 * @returns Un objeto Date real. Retorna 'Invalid Date' si el valor es nulo o indefinido.
 */
export function parseDisplayDate(value: Date | string | undefined | null): Date {
  if (!value) return new Date(Number.NaN);
  if (value instanceof Date) return value;
  const displayFormatRegex = /^(\d{1,2})\s*-\s*(\d{1,2})\s*-\s*(\d{4})$/;
  const displayFormatMatch = displayFormatRegex.exec(value);

  if (displayFormatMatch) {
    const [, day, month, year] = displayFormatMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  return new Date(value);
}
