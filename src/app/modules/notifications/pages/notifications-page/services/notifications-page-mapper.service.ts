import { Injectable } from '@angular/core';
import { InboxMessage } from '../../../interfaces/inbox-message.interface';
import { InboxMessageTableRow } from '../../../models/notifications-page.model';
import { formatInboxDate } from '../../../helpers/inbox-date.helper';

/** Convierte las notificaciones en filas de la tabla del buzón. */
@Injectable({ providedIn: 'root' })
export class NotificationsPageMapperService {
  /** Fila con el estado de lectura, la fecha con formato y las acciones de ver y eliminar. */
  mapMessageToRow(message: InboxMessage): InboxMessageTableRow {
    return {
      ...message,
      stateLabel: message.status === 'leido' ? 'Leído' : 'No Leído',
      dateFormatted: formatInboxDate(message.date),
      allowedActions: ['ver_detalle', 'eliminar']
    };
  }
}
