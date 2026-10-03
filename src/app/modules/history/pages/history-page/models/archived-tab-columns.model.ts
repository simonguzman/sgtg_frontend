import { Column } from "../../../../../shared/components/table-component/table-component.component";

export const ARCHIVED_ALLOWED_ACTIONS = ['ver descripcion', 'ver'];

export function buildArchivedTableColumns(deadlineField: string, deadlineHeader: string): Column[] {
  return [
    { field: 'title', header: 'Titulo', type: 'text', width: '25%' },
    { field: 'modality', header: 'Modalidad', type: 'text', width: '15%' },
    { field: 'authors', header: 'Estudiantes', type: 'text', width: '20%' },
    {
      field: 'description',
      header: 'Descripción',
      type: 'actions',
      actions: [{ action: 'ver descripcion', label: 'Ver descripcion', variant: 'primary', disabled: false }],
      width: '10%'
    },
    { field: 'state', header: 'Estado', type: 'state', width: '10%' },
    { field: deadlineField, header: deadlineHeader, type: 'text', width: '10%' },
    {
      field: 'acciones',
      header: 'Acciones',
      type: 'actions',
      width: '10%',
      actions: [
        { action: 'ver', icon: 'visibility', variant: 'primary', disabled: false }
      ]
    }
  ];
}
