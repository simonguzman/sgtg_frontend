
/** Fecha y hora de una notificación como «dd/mm/aaaa hh:mm»; vacía si la fecha no es válida. */
export function formatInboxDate(date: Date | string): string {
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(parsed.getDate())}/${pad(parsed.getMonth() + 1)}/${parsed.getFullYear()} ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}
