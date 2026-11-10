/** Un solo formateador: toLocaleDateString crea uno nuevo en cada llamada, y las tablas formatean muchas fechas. */
const FORMATO_FECHA = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

/**
 * Formatea una fecha al estilo 'DD - MM - YYYY' para visualización en la UI.
 *
 * @param date Fecha a formatear (por defecto la fecha actual).
 * @returns Cadena de texto con la fecha formateada.
 */
export function formatDisplayDate(date: Date = new Date()): string {
  return FORMATO_FECHA.format(date).replaceAll('/', ' - ');
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

/** Fecha local como 'YYYY-MM-DD' (la que espera el backend en un LocalDate), sin pasar por UTC. */
export function fechaLocalIso(date: Date): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${dos(date.getMonth() + 1)}-${dos(date.getDate())}`;
}

/**
 * Suma meses como `LocalDate.plusMonths` del backend: si el día no existe en el
 * mes de llegada, queda en el último día de ese mes (31-ene + 1 mes = 28-feb).
 */
export function sumarMeses(date: Date, meses: number): Date {
  const destino = new Date(date.getFullYear(), date.getMonth() + meses, 1);
  const ultimoDia = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate();
  return new Date(destino.getFullYear(), destino.getMonth(), Math.min(date.getDate(), ultimoDia));
}

/** 'YYYY-MM-DD' del backend como fecha local (sin el corrimiento de zona de `new Date('YYYY-MM-DD')`). */
export function desdeFechaIso(valor: string | null | undefined): Date | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor ?? '');
  return partes ? new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])) : null;
}
