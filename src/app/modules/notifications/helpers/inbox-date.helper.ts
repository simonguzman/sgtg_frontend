/**
 * Formatea una fecha al estilo 'dd/MM/yyyy HH:mm' que usaba Angular DatePipe
 * en el componente original. Se reemplaza por una función pura porque
 * DatePipe NO tiene providedIn: 'root' — inyectarlo en un servicio de raíz
 * (como el mapper de abajo) fallaría con NullInjectorError a menos que se
 * registre globalmente en app.config.ts. Esta función evita esa fragilidad
 * y es trivial de testear de forma aislada, sin necesitar TestBed.
 */
export function formatInboxDate(date: Date | string): string {
  const parsed = date instanceof Date ? date : new Date(date);
  if (isNaN(parsed.getTime())) return '';

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(parsed.getDate())}/${pad(parsed.getMonth() + 1)}/${parsed.getFullYear()} ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}
