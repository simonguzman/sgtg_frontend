import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { InboxService } from './inbox.service';
import { InboxStateService } from './inbox-state.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { InboxEventProcessorService } from './inbox-event-processor.service';

import { User } from '../../users/interfaces/user.interface';
import { InboxMessage } from '../interfaces/inbox-message.interface';

describe('InboxService', () => {
  let service: InboxService;

  // Signals simulados para controlar la reactividad
  let mockCurrentUser: WritableSignal<User | null>;
  let mockMessagesSignal: WritableSignal<InboxMessage[]>;

  // Spies para verificar la delegación
  let markAsReadSpy: jest.Mock;
  let deleteMessageSpy: jest.Mock;
  let clearAllMessagesSpy: jest.Mock;

  beforeEach(() => {
    mockCurrentUser = signal<User | null>(null);
    mockMessagesSignal = signal<InboxMessage[]>([]);

    markAsReadSpy = jest.fn();
    deleteMessageSpy = jest.fn();
    clearAllMessagesSpy = jest.fn();

    const mockAuthService = {
      currentUser: mockCurrentUser
    };

    const mockInboxStateService = {
      messagesSignal: mockMessagesSignal,
      markAsRead: markAsReadSpy,
      deleteMessage: deleteMessageSpy,
      clearAllMessages: clearAllMessagesSpy
    };

    const mockEventProcessorService = {}; // Solo se inyecta para inicializar

    TestBed.configureTestingModule({
      providers: [
        InboxService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: InboxStateService, useValue: mockInboxStateService },
        { provide: InboxEventProcessorService, useValue: mockEventProcessorService }
      ]
    });

    service = TestBed.inject(InboxService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Propiedades Computadas (messages y unreadCount)', () => {
    it('debe retornar un arreglo vacío si no hay un usuario autenticado', () => {
      // Configuramos mensajes globales, pero NO hay usuario
      mockMessagesSignal.set([
        { id: '1', userId: 'user-a' } as InboxMessage
      ]);
      mockCurrentUser.set(null);

      expect(service.messages()).toEqual([]);
      expect(service.unreadCount()).toBe(0);
    });

    it('debe filtrar los mensajes devolviendo solo los del usuario actual', () => {
      const activeUser = { id: 'user-a' } as unknown as User;
      mockCurrentUser.set(activeUser);

      mockMessagesSignal.set([
        { id: '1', userId: 'user-a' } as InboxMessage,
        { id: '2', userId: 'user-b' } as InboxMessage, // Este debe filtrarse
        { id: '3', userId: 'user-a' } as InboxMessage
      ]);

      const filtered = service.messages();
      expect(filtered.length).toBe(2);
      expect(filtered.every(msg => msg.userId === 'user-a')).toBe(true);
    });

    it('debe calcular correctamente el número de mensajes "no leido" del usuario actual', () => {
      const activeUser = { id: 'user-a' } as unknown as User;
      mockCurrentUser.set(activeUser);

      mockMessagesSignal.set([
        { id: '1', userId: 'user-a', status: 'no leido' } as InboxMessage,
        { id: '2', userId: 'user-a', status: 'leido' } as InboxMessage,
        { id: '3', userId: 'user-a', status: 'no leido' } as InboxMessage,
        // Este es 'no leido', pero es de OTRO usuario, el unreadCount no debe contarlo
        { id: '4', userId: 'user-b', status: 'no leido' } as InboxMessage
      ]);

      expect(service.unreadCount()).toBe(2);
    });

    it('debe reaccionar dinámicamente si el usuario actual cambia (Log out / Log in)', () => {
      mockMessagesSignal.set([
        { id: '1', userId: 'user-a', status: 'no leido' } as InboxMessage
      ]);

      // Al inicio no hay usuario
      expect(service.messages().length).toBe(0);

      // El usuario hace login
      mockCurrentUser.set({ id: 'user-a' } as unknown as User);
      expect(service.messages().length).toBe(1);
      expect(service.unreadCount()).toBe(1);

      // El usuario hace logout
      mockCurrentUser.set(null);
      expect(service.messages().length).toBe(0);
      expect(service.unreadCount()).toBe(0);
    });
  });

  describe('Delegación de Acciones (Write methods)', () => {
    it('debe delegar markAsRead al InboxStateService', () => {
      service.markAsRead('msg-123');
      expect(markAsReadSpy).toHaveBeenCalledWith('msg-123');
    });

    it('debe delegar deleteMessage al InboxStateService', () => {
      service.deleteMessage('msg-456');
      expect(deleteMessageSpy).toHaveBeenCalledWith('msg-456');
    });

    it('debe ignorar clearAllMessages si no hay un usuario autenticado', () => {
      mockCurrentUser.set(null);
      service.clearAllMessages();
      expect(clearAllMessagesSpy).not.toHaveBeenCalled();
    });

    it('debe delegar clearAllMessages usando el id del usuario actual', () => {
      mockCurrentUser.set({ id: 'active-user' } as unknown as User);
      service.clearAllMessages();
      expect(clearAllMessagesSpy).toHaveBeenCalledWith('active-user');
    });
  });
});
