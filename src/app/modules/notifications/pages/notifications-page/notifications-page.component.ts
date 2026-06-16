import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';

// Importa tus componentes reutilizables (ajusta las rutas según tu estructura)
import { TableComponent, Column } from '../../../../shared/components/table-component/table-component.component';
import { RegisterInformationModalComponent } from '../../../../shared/components/modals/register-information-modal/register-information-modal.component';
import { InboxService } from '../../services/inbox.service';

// Interfaz estrictamente para los datos de la bandeja en el frontend
export interface InboxMessage {
  id: string;
  title: string;
  message: string;
  date: Date;
  isRead: boolean;
  actionUrl?: string;
}

const INBOX_COLUMNS: Column[] = [
  { field: 'stateLabel', header: 'Estado', type: 'state', width: '15%' },
  { field: 'title', header: 'Asunto', type: 'text', width: '25%' },
  { field: 'message', header: 'Detalle', type: 'text', width: '35%' },
  { field: 'dateFormatted', header: 'Fecha', type: 'text', width: '15%' },
  {
    field: 'acciones',
    header: 'Acciones',
    type: 'actions',
    actions: [{ action: 'ver_detalle', icon: 'visibility', variant: 'primary', disabled: false }],
    width: '10%'
  }
];

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [TableComponent, RegisterInformationModalComponent],
  providers: [DatePipe], // Inyectamos DatePipe para transformar las fechas en el computed
  templateUrl: './notifications-page.component.html',
  styleUrl: './notifications-page.component.css',
})
export class NotificationsPageComponent {
  private readonly router = inject(Router);
  private readonly datePipe = inject(DatePipe);
  private readonly inboxService = inject(InboxService);

  protected columns: Column[] = INBOX_COLUMNS;

  protected inboxMessagesTransformed = computed(() => {
    return this.inboxService.messages().map(notification => ({
      ...notification,
      stateLabel: notification.status === 'leido' ? 'Leído' : 'No Leído',
      dateFormatted: this.datePipe.transform(notification.date, 'dd/MM/yyyy HH:mm') || '',
      allowedActions: ['ver_detalle']
    }));
  });

  protected modalState = signal({
    isOpen: false,
    title: '',
    comments: '',
    chargeDate: new Date(),
    actionUrl: '' as string | undefined
  });

  handleTableAction(event: { action: string, row: any }): void {
    if (event.action === 'ver_detalle') {
      this.inboxService.markAsRead(event.row.id);

      this.modalState.set({
        isOpen: true,
        title: event.row.title,
        comments: event.row.message,
        chargeDate: event.row.date,
        actionUrl: event.row.actionUrl
      });
    }
  }
  closeModal(): void {
    this.modalState.update(state => ({ ...state, isOpen: false }));
  }
}
