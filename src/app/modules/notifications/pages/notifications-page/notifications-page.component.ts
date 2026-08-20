import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TableComponent, TableButton } from '../../../../shared/components/table-component/table-component.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { NotificationsPageFacadeService } from './services/notifications-page-facade.service';
import { INBOX_COLUMNS, InboxMessageTableRow, ModalActionType } from './../../models/notifications-page.model';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  // ← providers: [DatePipe] eliminado: ya no se inyecta, formatInboxDate
  // es una función pura importada directamente por el mapper.
  imports: [TableComponent, ConfirmationActionModalComponent],
  templateUrl: './notifications-page.component.html',
  styleUrl: './notifications-page.component.css',
})
export class NotificationsPageComponent {
  private readonly router = inject(Router);
  protected readonly facade = inject(NotificationsPageFacadeService);

  protected readonly columns = INBOX_COLUMNS;

  readonly isConfirmModalOpen = signal(false);
  readonly pendingAction = signal<ModalActionType | null>(null);
  readonly pendingNotificationId = signal<string | null>(null);

  readonly modalDescription = computed(() => {
    const action = this.pendingAction();
    if (action === 'clear_all') {
      return '¿Está seguro de que desea vaciar por completo su bandeja de notificaciones? Esta acción eliminará el registro visual de sus alertas y no se puede deshacer.';
    }
    if (action === 'delete_single') {
      return '¿Está seguro de que desea eliminar esta notificación de su bandeja?';
    }
    return '';
  });

  // ← Fix: row: any → InboxMessageTableRow
  handleTableAction(event: { action: string; row: InboxMessageTableRow }): void {
    if (event.action === 'ver_detalle') {
      this.facade.markAsRead(event.row.id);
      if (event.row.actionUrl) {
        this.router.navigateByUrl(event.row.actionUrl);
      }
    } else if (event.action === 'eliminar') {
      this.pendingAction.set('delete_single');
      this.pendingNotificationId.set(event.row.id);
      this.isConfirmModalOpen.set(true);
    }
  }

  handleHeaderButton(button: TableButton): void {
    if (button.label === 'Limpiar Bandeja') {
      this.requestClearAll();
    }
  }

  requestClearAll(): void {
    this.pendingAction.set('clear_all');
    this.isConfirmModalOpen.set(true);
  }

  closeModal(): void {
    this.isConfirmModalOpen.set(false);
    this.pendingAction.set(null);
    this.pendingNotificationId.set(null);
  }

  executePendingAction(): void {
    const action = this.pendingAction();
    if (action === 'clear_all') {
      this.facade.clearAllMessages();
    } else if (action === 'delete_single') {
      const id = this.pendingNotificationId();
      if (id) this.facade.deleteMessage(id);
    }
    this.closeModal();
  }
}
