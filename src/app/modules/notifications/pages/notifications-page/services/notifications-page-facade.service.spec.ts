import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { NotificationsPageFacadeService } from './notifications-page-facade.service';
import { InboxService } from '../../../services/inbox.service';
import { NotificationsPageMapperService } from './notifications-page-mapper.service';

import { InboxMessage } from '../../../interfaces/inbox-message.interface';
import { InboxMessageTableRow } from '../../../models/notifications-page.model';

describe('NotificationsPageFacadeService', () => {
  let facadeService: NotificationsPageFacadeService;

  // Signal reactivo para controlar el estado base desde las pruebas
  let mockMessagesSignal: WritableSignal<InboxMessage[]>;

  // Spies de los servicios
  let markAsReadSpy: jest.Mock;
  let deleteMessageSpy: jest.Mock;
  let clearAllMessagesSpy: jest.Mock;
  let mapMessageToRowSpy: jest.Mock;

  beforeEach(() => {
    mockMessagesSignal = signal<InboxMessage[]>([]);

    markAsReadSpy = jest.fn();
    deleteMessageSpy = jest.fn();
    clearAllMessagesSpy = jest.fn();

    // Mock del InboxService (Dominio)
    const mockInboxService = {
      messages: mockMessagesSignal,
      markAsRead: markAsReadSpy,
      deleteMessage: deleteMessageSpy,
      clearAllMessages: clearAllMessagesSpy,
    };

    // Mock del Mapper (Transformación)
    mapMessageToRowSpy = jest.fn((msg: InboxMessage) => ({
      id: msg.id,
      title: msg.title,
      // Simulamos que el mapper transforma campos para la tabla
      formattedDate: 'Fecha simulada'
    } as unknown as InboxMessageTableRow));

    const mockMapperService = {
      mapMessageToRow: mapMessageToRowSpy,
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
  });

  describe('Propiedades Computadas para la UI (tableData y headerButtons)', () => {
    it('debe retornar tabla vacía y sin botones si no hay mensajes', () => {
      mockMessagesSignal.set([]);

      expect(facadeService.tableData()).toEqual([]);
      expect(facadeService.headerButtons()).toEqual([]);
      expect(mapMessageToRowSpy).not.toHaveBeenCalled();
    });

    it('debe mapear los mensajes a filas de tabla usando el MapperService', () => {
      const mockMessages = [
        { id: '1', title: 'Mensaje 1' } as InboxMessage,
        { id: '2', title: 'Mensaje 2' } as InboxMessage,
      ];
      mockMessagesSignal.set(mockMessages);

      const rows = facadeService.tableData();

      expect(rows.length).toBe(2);
      expect(rows[0].id).toBe('1');
      expect(rows[1].id).toBe('2');

      // Verificamos que el mapper se llamó una vez por cada elemento
      expect(mapMessageToRowSpy).toHaveBeenCalledTimes(2);
      expect(mapMessageToRowSpy).toHaveBeenCalledWith(mockMessages[0]);
      expect(mapMessageToRowSpy).toHaveBeenCalledWith(mockMessages[1]);
    });

    it('debe mostrar el botón "Limpiar Bandeja" cuando existen filas en la tabla', () => {
      mockMessagesSignal.set([{ id: '1', title: 'Mensaje 1' } as InboxMessage]);

      const buttons = facadeService.headerButtons();

      expect(buttons.length).toBe(1);
      expect(buttons[0]).toEqual({ label: 'Limpiar Bandeja', variant: 'primary' });
    });

    it('debe reaccionar dinámicamente: quitar el botón si la tabla se vacía', () => {
      // Estado inicial: con mensajes
      mockMessagesSignal.set([{ id: '1', title: 'Mensaje 1' } as InboxMessage]);
      expect(facadeService.headerButtons().length).toBe(1);

      // Mutación reactiva: se vacía la bandeja
      mockMessagesSignal.set([]);

      // Automáticamente desaparece el botón de la UI
      expect(facadeService.tableData().length).toBe(0);
      expect(facadeService.headerButtons().length).toBe(0);
    });
  });

  describe('Delegación de Acciones al InboxService', () => {
    it('debe delegar markAsRead correctamente', () => {
      facadeService.markAsRead('msg-123');
      expect(markAsReadSpy).toHaveBeenCalledWith('msg-123');
    });

    it('debe delegar deleteMessage correctamente', () => {
      facadeService.deleteMessage('msg-456');
      expect(deleteMessageSpy).toHaveBeenCalledWith('msg-456');
    });

    it('debe delegar clearAllMessages correctamente', () => {
      facadeService.clearAllMessages();
      expect(clearAllMessagesSpy).toHaveBeenCalled();
    });
  });
});
