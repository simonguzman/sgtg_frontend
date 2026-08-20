import { Column } from "../../../shared/components/table-component/table-component.component";
import { InboxMessage } from "../interfaces/inbox-message.interface";

export interface InboxMessageTableRow extends InboxMessage {
  stateLabel: string;
  dateFormatted: string;
  allowedActions: string[];
}

export type ModalActionType = 'delete_single' | 'clear_all' | null;

export const INBOX_COLUMNS: Column[] = [
  { field: 'stateLabel',     header: 'Estado', type: 'text', width: '15%' },
  { field: 'title',          header: 'Asunto', type: 'text', width: '25%' },
  { field: 'message',        header: 'Detalle', type: 'text', width: '35%' },
  { field: 'dateFormatted',  header: 'Fecha', type: 'text', width: '15%' },
  {
    field: 'acciones',
    header: 'Acciones',
    type: 'actions',
    actions: [
      { action: 'ver_detalle', icon: 'visibility', variant: 'primary', disabled: false },
      { action: 'eliminar',    icon: 'delete',     variant: 'primary', disabled: false }
    ],
    width: '10%'
  }
];
