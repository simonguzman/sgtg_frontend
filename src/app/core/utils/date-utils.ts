/**
 * Suma una cantidad de días hábiles (Lunes-Viernes) a una fecha inicial.
 */
export function addBusinessDays(startDate: Date, daysToAdd: number): Date {
  const date = new Date(startDate);
  let addedDays = 0;

  while (addedDays < daysToAdd) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();

    // 0 = Domingo, 6 = Sábado. Solo contamos si es día de semana.
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      addedDays++;
    }
  }
  return date;
}

/**
 * Calcula cuántos días hábiles hay entre dos fechas.
 * Si la fecha límite ya pasó, devolverá un número negativo.
 */
export function getRemainingBusinessDays(targetDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalizamos horas para comparar solo días

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
