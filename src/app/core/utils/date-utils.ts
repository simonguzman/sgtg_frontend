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
