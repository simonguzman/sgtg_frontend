import { Column, TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { stateList } from '../../../../../core/enums/state.enum';

export interface ProposalTableRow {
  id?: string;
  title: string;
  modality: string;
  description: string;
  state: stateList;
  deadlineStatus: string;
  hiddenParticipants: string;
  allowedActions: string[];
}

export const PROPOSAL_COLUMNS: Column[] = [
  { field: 'title',          header: 'Título',           type: 'text',    width: '25%', filterable: true },
  { field: 'modality',       header: 'Modalidad',        type: 'text',    width: '15%', filterable: true },
  {
    field: 'description',
    header: 'Descripción',
    type: 'actions',
    actions: [{ action: 'ver descripcion', label: 'Ver descripcion', variant: 'primary', disabled: false }],
    width: '15%'
  },
  { field: 'state',          header: 'Estado',           type: 'state',   width: '15%', filterable: true },
  { field: 'deadlineStatus', header: 'Plazo Evaluación', type: 'text',    width: '15%', filterable: true },
  {
    field: 'acciones',
    header: 'Acciones',
    type: 'actions',
    actions: [
      { action: 'ver',      icon: 'visibility', variant: 'primary', disabled: false },
      { action: 'editar',   icon: 'edit',       variant: 'primary', disabled: false },
      { action: 'anular',   icon: 'block',      variant: 'primary', disabled: false }
    ],
    width: '15%'
  }
];

export const PROPOSAL_HEADER_BUTTONS: TableButton[] = [
  { label: 'Formatos descargables', variant: 'primary' },
  { label: 'Registrar propuesta',   variant: 'primary' }
];
