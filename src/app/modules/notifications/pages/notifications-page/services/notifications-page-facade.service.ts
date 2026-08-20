import { computed, inject, Injectable } from '@angular/core';
import { InboxService } from '../../../services/inbox.service';
import { NotificationsPageMapperService } from './notifications-page-mapper.service';
import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { InboxMessageTableRow } from '../../../models/notifications-page.model';

@Injectable({ providedIn: 'root' })
export class NotificationsPageFacadeService {
  private readonly inboxService = inject(InboxService);
  private readonly mapper = inject(NotificationsPageMapperService);

  readonly tableData = computed<InboxMessageTableRow[]>(() =>
    this.inboxService.messages().map(message => this.mapper.mapMessageToRow(message))
  );

  readonly headerButtons = computed<TableButton[]>(() =>
    this.tableData().length > 0
      ? [{ label: 'Limpiar Bandeja', variant: 'primary' }]
      : []
  );

  markAsRead(id: string): void {
    this.inboxService.markAsRead(id);
  }

  deleteMessage(id: string): void {
    this.inboxService.deleteMessage(id);
  }

  clearAllMessages(): void {
    this.inboxService.clearAllMessages();
  }
}
