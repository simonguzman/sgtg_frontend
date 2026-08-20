/**
 * Suma una cantidad de días hábiles (Lunes-Viernes) a una fecha inicial.
 * Soporta objetos Date y cadenas de texto (ISO strings de localStorage).
 * * @param startDate Fecha base inicial o string ISO.
 * @param daysToAdd Cantidad de días hábiles a adicionar.
 * @param setToEndOfDay Si es verdadero, fija la hora de expiración a las 23:59:59.999.
 */
export function addBusinessDays(startDate: Date | string, daysToAdd: number, setToEndOfDay: boolean = false): Date {
  // Cláusula de salvaguarda defensiva contra parámetros nulos o negativos
  if (!startDate || daysToAdd <= 0) {
    return new Date(startDate || new Date());
  }

  // El constructor de JavaScript asimila de forma nativa tanto instancias de Date como strings
  const date = new Date(startDate);
  let addedDays = 0;

  while (addedDays < daysToAdd) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();

    // 0 = Domingo, 6 = Sábado. Solo incrementamos en días laborables.
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      addedDays++;
    }
  }

  // Permite llevar el vencimiento al último segundo del día para un criterio justo
  if (setToEndOfDay) {
    date.setHours(23, 59, 59, 999);
  }

  return date;
}

/**
 * Calcula cuántos días hábiles hay entre la fecha actual y una fecha objetivo.
 * Soporta objetos Date y cadenas de texto (ISO strings de localStorage).
 * Si la fecha límite ya expiró, devolverá un número entero negativo.
 * * @param targetDate Fecha límite de control.
 */
export function getRemainingBusinessDays(targetDate: Date | string): number {
  if (!targetDate) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalización para ignorar diferencias horarias del día en curso

  const limit = new Date(targetDate);
  limit.setHours(0, 0, 0, 0); // Normalización de la fecha límite para comparar solo días calendario

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
 * Formatea una fecha al estilo 'DD - MM - YYYY' usado para mostrar fechas
 * de carga/registro en toda la aplicación. Se centraliza en core/utils
 * (no en un módulo de feature) porque es una utilidad de formato de UI
 * genérica — antes existía esta misma lógica exacta duplicada como
 * método privado en LoadedProposalsFacadeService, además de
 * formatThesisDate() en thesis-work/helpers/thesis-date.helper.ts.
 */
export function formatDisplayDate(date: Date = new Date()): string {
  return date
    .toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .replaceAll('/', ' - ');
}

/**
 * Parsea una fecha que puede venir en cualquiera de las formas que
 * `uploadDate` toma en este proyecto: un objeto Date real, un ISO string
 * (usado p. ej. en UploadAdvanceFacadeService), o el formato de
 * visualización 'DD - MM - YYYY' que produce formatDisplayDate().
 *
 * `new Date('27 - 07 - 2026')` no es parseo estándar de ECMAScript — el
 * resultado varía según el motor JS y no hay garantía de que siga
 * funcionando en el futuro. Este parser reconoce explícitamente el
 * patrón "DD - MM - YYYY" en vez de delegarlo al parser genérico.
 */
export function parseDisplayDate(value: Date | string | undefined | null): Date {
  if (!value) return new Date(NaN);
  if (value instanceof Date) return value;

  const displayFormatMatch = value.match(/^(\d{1,2})\s*-\s*(\d{1,2})\s*-\s*(\d{4})$/);
  if (displayFormatMatch) {
    const [, day, month, year] = displayFormatMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  // ISO u otros formatos estándar que new Date() sí parsea de forma fiable
  return new Date(value);
}
