
export function resolveAcademicPeriod(date: Date): string {
  const semester = date.getMonth() < 6 ? '1' : '2';
  return `${date.getFullYear()}-${semester}`;
}
