/**
 * Determina el periodo académico semestral (ej. "2026-1") a partir de una
 * fecha de creación. Se centraliza aquí porque la misma fórmula (mes < 6
 * → primer semestre) estaba duplicada de forma idéntica en las 3 funciones
 * de mapeo de dominio que vivían dentro de StatisticsStateService.
 */
export function resolveAcademicPeriod(date: Date): string {
  const semester = date.getMonth() < 6 ? '1' : '2';
  return `${date.getFullYear()}-${semester}`;
}
