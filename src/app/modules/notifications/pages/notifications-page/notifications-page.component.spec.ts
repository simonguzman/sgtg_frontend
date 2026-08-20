import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationsPageComponent } from './notifications-page.component';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { NotificationsPageFacadeService } from './services/notifications-page-facade.service';
import { InboxMessageTableRow } from './../../models/notifications-page.model';
import { TableButton } from '../../../../shared/components/table-component/table-component.component';

describe('NotificationsPageComponent', () => {
  let component: NotificationsPageComponent;
  let fixture: ComponentFixture<NotificationsPageComponent>;
  let mockRouter: jest.Mocked<Router>;
  let mockFacade: Partial<NotificationsPageFacadeService>;

  beforeEach(async () => {
    // 1. Mock de Router
    mockRouter = {
      navigateByUrl: jest.fn(),
    } as unknown as jest.Mocked<Router>;

    // 2. Mock del Facade (usando signals reales para que la plantilla funcione)
    mockFacade = {
      tableData: signal([]),
      headerButtons: signal([]),
      markAsRead: jest.fn(),
      clearAllMessages: jest.fn(),
      deleteMessage: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [NotificationsPageComponent], // Al ser standalone importa sus dependencias
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: NotificationsPageFacadeService, useValue: mockFacade },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería crear el componente correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('Estado Inicial', () => {
    it('debería iniciar con el modal cerrado y sin acciones pendientes', () => {
      expect(component.isConfirmModalOpen()).toBeFalsy();
      expect(component.pendingAction()).toBeNull();
      expect(component.pendingNotificationId()).toBeNull();
      expect(component.modalDescription()).toBe('');
    });
  });

  describe('Propiedad Computada: modalDescription', () => {
    it('debería retornar el mensaje correcto para "clear_all"', () => {
      component.pendingAction.set('clear_all');
      expect(component.modalDescription()).toContain('vaciar por completo su bandeja');
    });

    it('debería retornar el mensaje correcto para "delete_single"', () => {
      component.pendingAction.set('delete_single');
      expect(component.modalDescription()).toContain('eliminar esta notificación');
    });
  });

  describe('Interacciones de la Tabla (handleTableAction)', () => {
    const mockRow: InboxMessageTableRow = {
      id: 'notif-123',
      actionUrl: '/some/path',
      // ... otros campos requeridos por tu interfaz
    } as InboxMessageTableRow;

    it('debería marcar como leída y navegar si la acción es "ver_detalle"', () => {
      component.handleTableAction({ action: 'ver_detalle', row: mockRow });

      expect(mockFacade.markAsRead).toHaveBeenCalledWith('notif-123');
      expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/some/path');
    });

    it('no debería navegar si la acción es "ver_detalle" pero no hay actionUrl', () => {
      const rowWithoutUrl = { ...mockRow, actionUrl: undefined };
      component.handleTableAction({ action: 'ver_detalle', row: rowWithoutUrl });

      expect(mockFacade.markAsRead).toHaveBeenCalledWith('notif-123');
      expect(mockRouter.navigateByUrl).not.toHaveBeenCalled();
    });

    it('debería abrir el modal y configurar acción al elegir "eliminar"', () => {
      component.handleTableAction({ action: 'eliminar', row: mockRow });

      expect(component.pendingAction()).toBe('delete_single');
      expect(component.pendingNotificationId()).toBe('notif-123');
      expect(component.isConfirmModalOpen()).toBeTruthy();
    });
  });

  describe('Interacciones del Header (handleHeaderButton & requestClearAll)', () => {
    it('debería solicitar limpiar bandeja al presionar el botón "Limpiar Bandeja"', () => {
      const btn: TableButton = { label: 'Limpiar Bandeja', action: 'clear', variant: 'primary' };

      component.handleHeaderButton(btn);

      expect(component.pendingAction()).toBe('clear_all');
      expect(component.isConfirmModalOpen()).toBeTruthy();
    });
  });

  describe('Gestión del Modal (ejecución y cerrado)', () => {
    it('debería resetear los signals al cerrar el modal (closeModal)', () => {
      // Configuramos un estado sucio
      component.isConfirmModalOpen.set(true);
      component.pendingAction.set('clear_all');
      component.pendingNotificationId.set('123');

      component.closeModal();

      expect(component.isConfirmModalOpen()).toBeFalsy();
      expect(component.pendingAction()).toBeNull();
      expect(component.pendingNotificationId()).toBeNull();
    });

    it('debería ejecutar la limpieza total y cerrar el modal si la acción era "clear_all"', () => {
      jest.spyOn(component, 'closeModal');
      component.pendingAction.set('clear_all');

      component.executePendingAction();

      expect(mockFacade.clearAllMessages).toHaveBeenCalled();
      expect(component.closeModal).toHaveBeenCalled();
    });

    it('debería ejecutar borrado individual y cerrar el modal si la acción era "delete_single"', () => {
      jest.spyOn(component, 'closeModal');
      component.pendingAction.set('delete_single');
      component.pendingNotificationId.set('notif-456');

      component.executePendingAction();

      expect(mockFacade.deleteMessage).toHaveBeenCalledWith('notif-456');
      expect(component.closeModal).toHaveBeenCalled();
    });
  });
});
