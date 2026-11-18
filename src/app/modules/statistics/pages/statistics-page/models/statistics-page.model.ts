/** Opción del filtro por situación del trabajo. */
export interface ArchiveStatusOption {
  label: string;
  value: 'ACTIVE' | 'ARCHIVED' | 'ALL';
}

/** Opciones del filtro por situación: todos, en proceso o cerrados. */
export const ARCHIVE_STATUS_OPTIONS: ArchiveStatusOption[] = [
  { label: 'Todos', value: 'ALL' },
  { label: 'En proceso', value: 'ACTIVE' },
  { label: 'Cerrados (historial)', value: 'ARCHIVED' }
];
