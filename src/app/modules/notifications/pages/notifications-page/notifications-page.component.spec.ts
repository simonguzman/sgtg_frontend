import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal, WritableSignal, Component, Input, Output, EventEmitter } from '@angular/core';

import { NotificationsPageComponent } from './notifications-page.component';
import { NotificationsPageFacadeService } from './services/notifications-page-facade.service';

import { InboxMessageTableRow, ModalActionType } from './../../models/notifications-page.model';
import { TableButton } from '../../../../shared/components/table-component/table-component.component';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';

// ── Componentes Originales a Remover (Shallow Testing) ───────────────────────
import { TableComponent } from '../../../../shared/components/table-component/table-component.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

// ── Funciones Fábrica fuertemente tipadas (Zero 'any', 'unknown') ─────────────

const createMockInboxMessageTableRow = (overrides: Partial<InboxMessageTableRow> = {}): InboxMessageTableRow => ({
  id: 'row-default',
  userId: 'user-123',
  type: NotificationType.INFO,
  title: 'Título del mensaje',
  message: 'Cuerpo del mensaje',
  date: new Date(),
  status: 'no leido', // FIX: Usamos la propiedad estricta del modelo base
  stateLabel: 'No Leído',
  dateFormatted: 'Hace un momento', // FIX: Agregado según tu nueva interfaz
  allowedActions: ['ver_detalle', 'eliminar'],
  ...overrides
} as InboxMessageTableRow);

// ── Mocks de Componentes Hijos (Shallow Testing) ─────────────────────────────

@Component({ selector: 'app-table-component', standalone: true, template: '' })
class MockTableComponent {
  @Input() value!: unknown[];
  @Input() headerButtons!: unknown[];
  @Input() columns!: unknown[];
  @Input() paginator!: boolean;
  @Input() rows!: number;
  @Input() emptyMessage!: string;
  @Output() actionClick = new EventEmitter<{ action: string; row: InboxMessageTableRow }>();
  @Output() headerButtonClick = new EventEmitter<TableButton>();
}

@Component({ selector: 'app-confirmation-action-modal', standalone: true, template: '' })
class MockConfirmationActionModalComponent {
  @Input() isOpen!: boolean;
  @Input() description!: string;
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('NotificationsPageComponent', () => {
  let component: NotificationsPageComponent;
  let fixture: ComponentFixture<NotificationsPageComponent>;

  // Mocks tipados estrictamente (Zero 'unknown')
  let mockRouter: {
    navigateByUrl: jest.Mock<Promise<boolean>, [string]>;
  };

  let mockFacade: {
    tableData: WritableSignal<InboxMessageTableRow[]>;
    headerButtons: WritableSignal<TableButton[]>;
    markAsRead: jest.Mock<void, [string]>;
    clearAllMessages: jest.Mock<void, []>;
    deleteMessage: jest.Mock<void, [string]>;
  };

  beforeEach(async () => {
    // 🔕 Silenciar consola para mantener terminal limpia de advertencias de UI
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // 1. Inicialización de Mocks
    mockRouter = {
      navigateByUrl: jest.fn().mockResolvedValue(true),
    };

    mockFacade = {
      tableData: signal<InboxMessageTableRow[]>([]),
      headerButtons: signal<TableButton[]>([]),
      markAsRead: jest.fn(),
      clearAllMessages: jest.fn(),
      deleteMessage: jest.fn(),
    };

    // 2. Configuración del TestBed
    await TestBed.configureTestingModule({
      imports: [NotificationsPageComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: NotificationsPageFacadeService, useValue: mockFacade },
      ],
    })
    .overrideComponent(NotificationsPageComponent, {
      // Reemplazamos los componentes pesados de presentación por mocks ligeros
      remove: { imports: [TableComponent, ConfirmationActionModalComponent] },
      add: { imports: [MockTableComponent, MockConfirmationActionModalComponent] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificationsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar espías de consola
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

    it('debería retornar un string vacío si la acción no coincide', () => {
      component.pendingAction.set(null);
      expect(component.modalDescription()).toBe('');
    });
  });

  describe('Interacciones de la Tabla (handleTableAction)', () => {
    // Usamos la fábrica para garantizar que el objeto cumple toda la interfaz
    const mockRow = createMockInboxMessageTableRow({
      id: 'notif-123',
      actionUrl: '/some/path',
    });

    it('debería marcar como leída y navegar si la acción es "ver_detalle"', () => {
      component.handleTableAction({ action: 'ver_detalle', row: mockRow });

      expect(mockFacade.markAsRead).toHaveBeenCalledWith('notif-123');
      expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/some/path');
    });

    it('no debería navegar si la acción es "ver_detalle" pero no hay actionUrl', () => {
      const rowWithoutUrl = createMockInboxMessageTableRow({
        id: 'notif-123',
        actionUrl: undefined
      });

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

    it('no debería hacer nada si el botón no es el esperado', () => {
      const btn: TableButton = { label: 'Otro Botón', action: 'other', variant: 'secondary' };

      component.handleHeaderButton(btn);

      expect(component.pendingAction()).toBeNull();
      expect(component.isConfirmModalOpen()).toBeFalsy();
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

    it('no debería ejecutar borrado individual si no hay pendingNotificationId', () => {
      jest.spyOn(component, 'closeModal');
      component.pendingAction.set('delete_single');
      component.pendingNotificationId.set(null); // Sin ID asignado

      component.executePendingAction();

      expect(mockFacade.deleteMessage).not.toHaveBeenCalled();
      expect(component.closeModal).toHaveBeenCalled();
    });
  });
});
