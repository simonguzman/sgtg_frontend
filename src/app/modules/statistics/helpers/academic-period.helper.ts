
/** Periodo académico de una fecha: «año-1» de enero a junio y «año-2» de julio a diciembre. */
export function resolveAcademicPeriod(date: Date): string {
  const semester = date.getMonth() < 6 ? '1' : '2';
  return `${date.getFullYear()}-${semester}`;
}
