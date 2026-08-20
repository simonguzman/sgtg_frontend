export interface ArchiveStatusOption {
  label: string;
  value: 'ACTIVE' | 'ARCHIVED' | 'ALL';
}

export const ARCHIVE_STATUS_OPTIONS: ArchiveStatusOption[] = [
  { label: 'Activos en proceso', value: 'ACTIVE' },
  { label: 'Historial Archivados', value: 'ARCHIVED' },
  { label: 'Todos', value: 'ALL' }
];
