import { Column, TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { stateList } from '../../../../../core/enums/state.enum';

export interface PreliminaryDraftTableRow {
  id: string;
  title: string;
  modality: string;
  description: string;
  state: stateList | string;
  remainingTime: string;
  hiddenParticipants: string;
  allowedActions: string[];
}

export const PRELIMINARY_DRAFT_COLUMNS: Column[] = [
  { field: 'title', header: 'Titulo', type: 'text', width: '25%', filterable: true },
  { field: 'modality', header: 'Modalidad', type: 'text', width: '15%', filterable: true },
  {
    field: 'description',
    header: 'Descripción',
    type: 'actions',
    actions: [{ action: 'ver descripción', label: 'Ver descripción', variant: 'primary', disabled: false }],
    width: '15%'
  },
  { field: 'state', header: 'Estado', type: 'state', width: '15%', filterable: true },
  { field: 'remainingTime', header: 'Plazo Evaluación', type: 'text', width: '15%', filterable: true },
  {
    field: 'actions',
    header: 'Acciones',
    type: 'actions',
    actions: [
      { action: 'ver', icon: 'visibility', variant: 'primary', disabled: false },
      { action: 'editar', icon: 'edit', variant: 'primary', disabled: false },
      { action: 'eliminar', icon: 'delete', variant: 'primary', disabled: false }
    ],
    width: '15%'
  }
];

export const PRELIMINARY_DRAFT_HEADER_BUTTONS: TableButton[] = [
  { label: 'Formatos descargables', variant: 'primary' },
  { label: 'Registrar anteproyecto', variant: 'primary' }
];
