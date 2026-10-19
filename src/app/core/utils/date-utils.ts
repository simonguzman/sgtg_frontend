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
