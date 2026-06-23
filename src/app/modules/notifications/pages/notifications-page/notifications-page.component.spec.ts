/* tslint:disable:no-unused-variable */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';

import { NotificationsPageComponent } from './notifications-page.component';
import { InboxService } from '../../services/inbox.service';
import { InboxMessage } from '../../interfaces/inbox-message.interface';

import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { TableButton } from '../../../../shared/components/table-component/table-component.component';

// Definición estricta de Mocks
interface MockRouter {
  navigateByUrl: jest.Mock;
}

interface MockDatePipe {
  transform: jest.Mock;
}

interface MockInboxService {
  messages: WritableSignal<InboxMessage[]>;
  markAsRead: jest.Mock;
  clearAllMessages: jest.Mock;
  deleteMessage: jest.Mock;
}

describe('NotificationsPageComponent', () => {
  let component: NotificationsPageComponent;
  let fixture: ComponentFixture<NotificationsPageComponent>;

  let mockRouter: MockRouter;
  let mockDatePipe: MockDatePipe;
  let mockInboxService: MockInboxService;

  // Datos de prueba reutilizables
  const mockMessages: InboxMessage[] = [
    {
      id: 'notif-1',
      userId: 'user-1',
      type: NotificationType.INFO,
      title: 'Mensaje 1',
      message: 'Detalle 1',
      date: new Date('2026-06-19T10:00:00'),
      status: 'no leido',
      actionUrl: '/some/path'
    },
    {
      id: 'notif-2',
      userId: 'user-1',
      type: NotificationType.CONFIRMATION,
      title: 'Mensaje 2',
      message: 'Detalle 2',
      date: new Date('2026-06-18T15:30:00'),
      status: 'leido'
    }
  ];

  beforeEach(async () => {
    mockRouter = {
      navigateByUrl: jest.fn()
    };

    mockDatePipe = {
      transform: jest.fn().mockReturnValue('19/06/2026 10:00')
    };

    mockInboxService = {
      messages: signal([...mockMessages]),
      markAsRead: jest.fn(),
      clearAllMessages: jest.fn(),
      deleteMessage: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [NotificationsPageComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: DatePipe, useValue: mockDatePipe },
        { provide: InboxService, useValue: mockInboxService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsPageComponent);
    component = fixture.componentInstance;
  });

  it('Debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('Debe transformar los mensajes correctamente para la tabla', () => {
    fixture.detectChanges(); // Dispara los computed signals

    const transformed = component['inboxMessagesTransformed']();

    expect(transformed.length).toBe(2);
    expect(transformed[0].stateLabel).toBe('No Leído');
    expect(transformed[1].stateLabel).toBe('Leído');
    expect(transformed[0].dateFormatted).toBe('19/06/2026 10:00'); // Validando el mock del DatePipe
    expect(transformed[0].allowedActions).toEqual(['ver_detalle', 'eliminar']);
  });

  it('Debe mostrar el botón de "Limpiar Bandeja" si hay mensajes', () => {
    fixture.detectChanges();

    const buttons = component['headerButtons']();
    expect(buttons.length).toBe(1);
    expect(buttons[0].label).toBe('Limpiar Bandeja');
  });

  it('NO debe mostrar el botón de "Limpiar Bandeja" si la bandeja está vacía', () => {
    mockInboxService.messages.set([]); // Vaciamos los mensajes
    fixture.detectChanges();

    const buttons = component['headerButtons']();
    expect(buttons.length).toBe(0);
  });

  it('Debe manejar la acción "ver_detalle" marcando como leído y navegando si tiene URL', () => {
    const rowData = { id: 'notif-1', actionUrl: '/some/path' };

    component.handleTableAction({ action: 'ver_detalle', row: rowData });

    expect(mockInboxService.markAsRead).toHaveBeenCalledWith('notif-1');
    expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/some/path');
  });

  it('Debe manejar la acción "eliminar" preparando el estado del modal', () => {
    const rowData = { id: 'notif-2' };

    component.handleTableAction({ action: 'eliminar', row: rowData });

    expect(component.pendingAction()).toBe('delete_single');
    expect(component.pendingNotificationId()).toBe('notif-2');
    expect(component.isConfirmModalOpen()).toBe(true);
  });

  it('Debe manejar el clic del botón de cabecera para "Limpiar Bandeja"', () => {
    const btnMock: TableButton = { label: 'Limpiar Bandeja', variant: 'primary' };

    component.handleHeaderButton(btnMock);

    expect(component.pendingAction()).toBe('clear_all');
    expect(component.isConfirmModalOpen()).toBe(true);
  });

  it('Debe ejecutar la limpieza de bandeja al confirmar en el modal', () => {
    // 1. Act: Simulamos que el estado estaba preparado para limpiar todo
    component.pendingAction.set('clear_all');

    // 2. Ejecutamos la acción
    component.executePendingAction();

    // 3. Assert
    expect(mockInboxService.clearAllMessages).toHaveBeenCalled();
    expect(component.isConfirmModalOpen()).toBe(false);
    expect(component.pendingAction()).toBeNull();
  });

  it('Debe ejecutar la eliminación individual al confirmar en el modal', () => {
    // 1. Act: Simulamos el estado preparado para eliminar uno
    component.pendingAction.set('delete_single');
    component.pendingNotificationId.set('notif-99');

    // 2. Ejecutamos la acción
    component.executePendingAction();

    // 3. Assert
    expect(mockInboxService.deleteMessage).toHaveBeenCalledWith('notif-99');
    expect(component.isConfirmModalOpen()).toBe(false);
    expect(component.pendingNotificationId()).toBeNull();
  });

  it('Debe resetear el estado al cerrar el modal manualmente', () => {
    component.isConfirmModalOpen.set(true);
    component.pendingAction.set('delete_single');
    component.pendingNotificationId.set('123');

    component.closeModal();

    expect(component.isConfirmModalOpen()).toBe(false);
    expect(component.pendingAction()).toBeNull();
    expect(component.pendingNotificationId()).toBeNull();
  });
});
