import { computed, inject, Injectable } from '@angular/core';
import { InboxService } from '../../../services/inbox.service';
import { NotificationsPageMapperService } from './notifications-page-mapper.service';
import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { InboxMessageTableRow } from '../../../models/notifications-page.model';

/** Fachada de la bandeja de entrada. */
@Injectable({ providedIn: 'root' })
export class NotificationsPageFacadeService {
  private readonly inboxService = inject(InboxService);
  private readonly mapper = inject(NotificationsPageMapperService);

  /** Notificaciones como filas de la tabla. */
  readonly tableData = computed<InboxMessageTableRow[]>(() =>
    this.inboxService.messages().map(message => this.mapper.mapMessageToRow(message))
  );

  /** Botón para vaciar el buzón, solo si tiene notificaciones. */
  readonly headerButtons = computed<TableButton[]>(() =>
    this.tableData().length > 0
      ? [{ label: 'Limpiar Bandeja', variant: 'primary' }]
      : []
  );

  /** Marca una notificación como leída. */
  markAsRead(id: string): void {
    this.inboxService.markAsRead(id);
  }

  /** Elimina una notificación. */
  deleteMessage(id: string): void {
    this.inboxService.deleteMessage(id);
  }

  /** Vacía el buzón. */
  clearAllMessages(): void {
    this.inboxService.clearAllMessages();
  }
}
