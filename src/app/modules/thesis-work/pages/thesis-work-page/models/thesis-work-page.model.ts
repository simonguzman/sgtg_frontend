import { Column, TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { stateList } from '../../../../../core/enums/state.enum';

export interface ThesisWorkTableRow {
  id: string;
  title: string;
  modality: string;
  description: string;
  state: stateList | string;
  maxDeliveryDate: string;
  hiddenParticipants: string;
  allowedActions: string[];
}

export const THESIS_WORK_COLUMNS: Column[] = [
  { field: 'title', header: 'Título', type: 'text', width: '25%', filterable: true },
  { field: 'modality', header: 'Modalidad', type: 'text', width: '15%', filterable: true },
  {
    field: 'description',
    header: 'Descripción',
    type: 'actions',
    actions: [{ action: 'ver descripción', label: 'Ver descripción', variant: 'primary', disabled: false }],
    width: '15%'
  },
  { field: 'state', header: 'Estado', type: 'state', width: '15%', filterable: true },
  { field: 'maxDeliveryDate', header: 'Plazo Máximo', type: 'text', width: '15%', filterable: true },
  {
    field: 'actions',
    header: 'Acciones',
    type: 'actions',
    actions: [
      { action: 'ver', icon: 'visibility', variant: 'primary', disabled: false },
      { action: 'editar', icon: 'edit', variant: 'primary', disabled: false },
      { action: 'reactivar', icon: 'play_circle', variant: 'secondary', disabled: false },
    ],
    width: '15%'
  },
];

export const THESIS_WORK_HEADER_BUTTONS: TableButton[] = [
  { label: 'Formatos descargables', variant: 'primary' }
];
