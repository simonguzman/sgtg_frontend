/**
 * Formatea una fecha al estilo DD - MM - YYYY usado en todos los documentos del módulo.
 * Centralizado porque el mismo bloque de 3 líneas se repite en cada sub-servicio.
 */
export function formatThesisDate(date: Date = new Date()): string {
  return date
    .toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .replaceAll('/', ' - ');
}
