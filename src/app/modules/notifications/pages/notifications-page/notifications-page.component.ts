import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';

// 💡 Importamos TableButton desde el componente compartido
import { TableComponent, Column, TableButton } from '../../../../shared/components/table-component/table-component.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { InboxService } from '../../services/inbox.service';

const INBOX_COLUMNS: Column[] = [
  { field: 'stateLabel', header: 'Estado', type: 'text', width: '15%' },
  { field: 'title', header: 'Asunto', type: 'text', width: '25%' },
  { field: 'message', header: 'Detalle', type: 'text', width: '35%' },
  { field: 'dateFormatted', header: 'Fecha', type: 'text', width: '15%' },
  {
    field: 'acciones',
    header: 'Acciones',
    type: 'actions',
    actions: [
      { action: 'ver_detalle', icon: 'visibility', variant: 'primary', disabled: false },
      { action: 'eliminar', icon: 'delete', variant: 'primary', disabled: false }
    ],
    width: '10%'
  }
];

type ModalActionType = 'delete_single' | 'clear_all' | null;

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [TableComponent, ConfirmationActionModalComponent],
  providers: [DatePipe],
  templateUrl: './notifications-page.component.html',
  styleUrl: './notifications-page.component.css',
})
export class NotificationsPageComponent {
  private readonly router = inject(Router);
  private readonly datePipe = inject(DatePipe);
  protected readonly inboxService = inject(InboxService);

  protected columns: Column[] = INBOX_COLUMNS;

  isConfirmModalOpen = signal(false);
  pendingAction = signal<ModalActionType>(null);
  pendingNotificationId = signal<string | null>(null);

  modalDescription = computed(() => {
    const action = this.pendingAction();
    if (action === 'clear_all') {
      return '¿Está seguro de que desea vaciar por completo su bandeja de notificaciones? Esta acción eliminará el registro visual de sus alertas y no se puede deshacer.';
    }
    if (action === 'delete_single') {
      return '¿Está seguro de que desea eliminar esta notificación de su bandeja?';
    }
    return '';
  });

  protected inboxMessagesTransformed = computed(() => {
    return this.inboxService.messages().map(notification => ({
      ...notification,
      stateLabel: notification.status === 'leido' ? 'Leído' : 'No Leído',
      dateFormatted: this.datePipe.transform(notification.date, 'dd/MM/yyyy HH:mm') || '',
      allowedActions: ['ver_detalle', 'eliminar']
    }));
  });

  // 💡 Botón dinámico controlado por Signal Computado según el estado de la bandeja
  protected headerButtons = computed<TableButton[]>(() => {
    return this.inboxMessagesTransformed().length > 0
      ? [{ label: 'Limpiar Bandeja', variant: 'primary' }] // Usa 'danger' si tu tabla soporta el estilo rojo, sino 'primary'
      : [];
  });

  handleTableAction(event: { action: string, row: any }): void {
    if (event.action === 'ver_detalle') {
      this.inboxService.markAsRead(event.row.id);
      if (event.row.actionUrl) {
        this.router.navigateByUrl(event.row.actionUrl);
      }
    } else if (event.action === 'eliminar') {
      this.pendingAction.set('delete_single');
      this.pendingNotificationId.set(event.row.id);
      this.isConfirmModalOpen.set(true);
    }
  }

  // 💡 Captura el evento del botón de la cabecera de la tabla
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
      this.inboxService.clearAllMessages();
    } else if (action === 'delete_single') {
      const id = this.pendingNotificationId();
      if (id) {
        this.inboxService.deleteMessage(id);
      }
    }
    this.closeModal();
  }
}
