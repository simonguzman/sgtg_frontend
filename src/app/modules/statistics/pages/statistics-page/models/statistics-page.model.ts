export interface ArchiveStatusOption {
  label: string;
  value: 'ACTIVE' | 'ARCHIVED' | 'ALL';
}

export const ARCHIVE_STATUS_OPTIONS: ArchiveStatusOption[] = [
  { label: 'Todos', value: 'ALL' },
  { label: 'En proceso', value: 'ACTIVE' },
  { label: 'Cerrados (historial)', value: 'ARCHIVED' }
];
