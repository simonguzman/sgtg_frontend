import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { NotificationsPageFacadeService } from './notifications-page-facade.service';
import { InboxService } from '../../../services/inbox.service';
import { NotificationsPageMapperService } from './notifications-page-mapper.service';
import { InboxMessage, InboxStatus } from '../../../interfaces/inbox-message.interface';
import { InboxMessageTableRow } from '../../../models/notifications-page.model';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';

const createMockInboxMessage = (overrides: Partial<InboxMessage> = {}): InboxMessage => ({
  id: 'msg-default',
  userId: 'user-123',
  type: NotificationType.INFO,
  title: 'Título del mensaje',
  message: 'Cuerpo del mensaje',
  date: new Date(),
  status: 'no leido',
  ...overrides
} as InboxMessage);

const createMockInboxMessageTableRow = (overrides: Partial<InboxMessageTableRow> = {}): InboxMessageTableRow => ({
  id: 'row-default',
  title: 'Título del mensaje',
  date: new Date(),
  isRead: false,
  ...overrides
} as InboxMessageTableRow);

describe('NotificationsPageFacadeService', () => {
  let facadeService: NotificationsPageFacadeService;
  let mockMessagesSignal: WritableSignal<InboxMessage[]>;
  let mockInboxService: {
    messages: WritableSignal<InboxMessage[]>;
    markAsRead: jest.Mock<void, [string]>;
    deleteMessage: jest.Mock<void, [string]>;
    clearAllMessages: jest.Mock<void, []>;
  };
  let mockMapperService: {
    mapMessageToRow: jest.Mock<InboxMessageTableRow, [InboxMessage]>;
  };
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockMessagesSignal = signal<InboxMessage[]>([]);
    mockInboxService = {
      messages: mockMessagesSignal,
      markAsRead: jest.fn(),
      deleteMessage: jest.fn(),
      clearAllMessages: jest.fn(),
    };
    mockMapperService = {
      mapMessageToRow: jest.fn((msg: InboxMessage) => createMockInboxMessageTableRow({
        id: msg.id,
        title: msg.title,
        date: msg.date
      })),
    };
    TestBed.configureTestingModule({
      providers: [
        NotificationsPageFacadeService,
        { provide: InboxService, useValue: mockInboxService },
        { provide: NotificationsPageMapperService, useValue: mockMapperService },
      ],
    });
    facadeService = TestBed.inject(NotificationsPageFacadeService);
  });
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });
  describe('Propiedades Computadas para la UI (tableData y headerButtons)', () => {
    it('debe retornar tabla vacía y sin botones si no hay mensajes', () => {
      mockMessagesSignal.set([]);
      expect(facadeService.tableData()).toEqual([]);
      expect(facadeService.headerButtons()).toEqual([]);
      expect(mockMapperService.mapMessageToRow).not.toHaveBeenCalled();
    });
    it('debe mapear los mensajes a filas de tabla usando el MapperService', () => {
      const mockMessages: InboxMessage[] = [
        createMockInboxMessage({ id: '1', title: 'Mensaje 1' }),
        createMockInboxMessage({ id: '2', title: 'Mensaje 2' }),
      ];
      mockMessagesSignal.set(mockMessages);
      const rows = facadeService.tableData();
      expect(rows).toHaveLength(2);
      expect(rows[0].id).toBe('1');
      expect(rows[1].id).toBe('2');
      expect(mockMapperService.mapMessageToRow).toHaveBeenCalledTimes(2);
      expect(mockMapperService.mapMessageToRow).toHaveBeenCalledWith(mockMessages[0]);
      expect(mockMapperService.mapMessageToRow).toHaveBeenCalledWith(mockMessages[1]);
    });
    it('debe mostrar el botón "Limpiar Bandeja" cuando existen filas en la tabla', () => {
      mockMessagesSignal.set([
        createMockInboxMessage({ id: '1', title: 'Mensaje 1' })
      ]);
      const buttons = facadeService.headerButtons();
      expect(buttons).toHaveLength(1);
      expect(buttons[0]).toEqual({ label: 'Limpiar Bandeja', variant: 'primary' });
    });
    it('debe reaccionar dinámicamente: quitar el botón si la tabla se vacía', () => {
      mockMessagesSignal.set([
        createMockInboxMessage({ id: '1', title: 'Mensaje 1' })
      ]);
      expect(facadeService.headerButtons()).toHaveLength(1);
      mockMessagesSignal.set([]);
      expect(facadeService.tableData()).toHaveLength(0);
      expect(facadeService.headerButtons()).toHaveLength(0);
    });
  });
  describe('Delegación de Acciones al InboxService', () => {
    it('debe delegar markAsRead correctamente', () => {
      facadeService.markAsRead('msg-123');
      expect(mockInboxService.markAsRead).toHaveBeenCalledWith('msg-123');
    });
    it('debe delegar deleteMessage correctamente', () => {
      facadeService.deleteMessage('msg-456');
      expect(mockInboxService.deleteMessage).toHaveBeenCalledWith('msg-456');
    });
    it('debe delegar clearAllMessages correctamente', () => {
      facadeService.clearAllMessages();
      expect(mockInboxService.clearAllMessages).toHaveBeenCalled();
    });
  });
});
