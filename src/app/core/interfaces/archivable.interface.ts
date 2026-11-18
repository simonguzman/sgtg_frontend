/** Registro que pasa al historial cuando el trabajo termina. */
export interface Archivable {
  isArchived?: boolean;
  archivedAt?: Date | string;
}
