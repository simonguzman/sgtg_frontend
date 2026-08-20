/**
 * Reemplaza el tipo inline `{ loaded: number, approved: number, obs: number,
 * rejected: number }` que tenía downloadPdfReport — nombrarlo permite que
 * el componente que arma este objeto para pasárselo al servicio también
 * pueda tipar la variable explícitamente, en vez de depender de inferencia
 * estructural.
 */
export interface StatisticsReportKpis {
  loaded: number;
  approved: number;
  obs: number;
  rejected: number;
}
