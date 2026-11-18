import { Column } from "../../../shared/components/table-component/table-component.component";
import { InboxMessage } from "../interfaces/inbox-message.interface";

/** Fila de la tabla del buzón. */
export interface InboxMessageTableRow extends InboxMessage {
  stateLabel: string;
  dateFormatted: string;
  allowedActions: string[];
}

/** Acción que confirma el modal del buzón: eliminar una notificación o vaciar el buzón. */
export type ModalActionType = 'delete_single' | 'clear_all' | null;

/** Columnas de la tabla del buzón. */
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
      { action: 'ver_detalle', icon: 'visibility', tooltip: 'Ver detalle', variant: 'primary', disabled: false },
      { action: 'eliminar',    icon: 'delete',     tooltip: 'Eliminar', variant: 'primary', disabled: false }
    ],
    width: '10%'
  }
];
