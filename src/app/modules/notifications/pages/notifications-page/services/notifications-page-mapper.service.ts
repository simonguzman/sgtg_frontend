import { Injectable } from '@angular/core';
import { InboxMessage } from '../../../interfaces/inbox-message.interface';
import { InboxMessageTableRow } from '../../../models/notifications-page.model';
import { formatInboxDate } from '../../../helpers/inbox-date.helper';

@Injectable({ providedIn: 'root' })
export class NotificationsPageMapperService {
  mapMessageToRow(message: InboxMessage): InboxMessageTableRow {
    return {
      ...message,
      stateLabel: message.status === 'leido' ? 'Leído' : 'No Leído',
      dateFormatted: formatInboxDate(message.date),
      allowedActions: ['ver_detalle', 'eliminar']
    };
  }
}
