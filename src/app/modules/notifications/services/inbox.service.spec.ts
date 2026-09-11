import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';

import { InboxService } from './inbox.service';
import { InboxStateService } from './inbox-state.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { InboxEventProcessorService } from './inbox-event-processor.service';

import { User } from '../../users/interfaces/user.interface';
import { InboxMessage } from '../interfaces/inbox-message.interface';
import { NotificationType } from '../../../shared/components/notifications/models/notification.model';

// ── Funciones Fábrica fuertemente tipadas (Zero 'any', 'unknown') ─────────────

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-default',
  roles: [],
  name: 'Usuario Prueba',
  email: 'test@test.com',
  ...overrides
} as User);

const createMockInboxMessage = (overrides: Partial<InboxMessage> = {}): InboxMessage => ({
  id: 'msg-default',
  userId: 'user-default',
  type: NotificationType.INFO,
  title: 'Título por defecto',
  message: 'Cuerpo por defecto',
  date: new Date(),
  status: 'no leido',
  ...overrides
} as InboxMessage);

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('InboxService', () => {
  let service: InboxService;

  // Signals simulados para controlar la reactividad
  let mockCurrentUser: WritableSignal<User | null>;
  let mockMessagesSignal: WritableSignal<InboxMessage[]>;

  // Mocks de servicios con tipado estricto
  let mockAuthService: {
    currentUser: WritableSignal<User | null>;
  };

  let mockInboxStateService: {
    messagesSignal: WritableSignal<InboxMessage[]>;
    markAsRead: jest.Mock<void, [string]>;
    deleteMessage: jest.Mock<void, [string]>;
    clearAllMessages: jest.Mock<void, [string]>;
  };

  beforeEach(() => {
    // 🔕 Silenciar consola para mantener terminal limpia
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockCurrentUser = signal<User | null>(null);
    mockMessagesSignal = signal<InboxMessage[]>([]);

    mockAuthService = {
      currentUser: mockCurrentUser
    };

    mockInboxStateService = {
      messagesSignal: mockMessagesSignal,
      markAsRead: jest.fn(),
      deleteMessage: jest.fn(),
      clearAllMessages: jest.fn()
    };

    const mockEventProcessorService = {}; // Solo se inyecta para inicializar la suscripción global

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
    jest.restoreAllMocks(); // 🧹 Restaurar espías de consola
  });

  describe('Propiedades Computadas (messages y unreadCount)', () => {
    it('debe retornar un arreglo vacío si no hay un usuario autenticado', () => {
      // Configuramos mensajes globales, pero NO hay usuario logueado
      mockMessagesSignal.set([
        createMockInboxMessage({ id: '1', userId: 'user-a' })
      ]);
      mockCurrentUser.set(null);

      expect(service.messages()).toEqual([]);
      expect(service.unreadCount()).toBe(0);
    });

    it('debe filtrar los mensajes devolviendo solo los del usuario actual', () => {
      const activeUser = createMockUser({ id: 'user-a' });
      mockCurrentUser.set(activeUser);

      mockMessagesSignal.set([
        createMockInboxMessage({ id: '1', userId: 'user-a' }),
        createMockInboxMessage({ id: '2', userId: 'user-b' }), // Este debe filtrarse
        createMockInboxMessage({ id: '3', userId: 'user-a' })
      ]);

      const filtered = service.messages();
      expect(filtered.length).toBe(2);
      expect(filtered.every(msg => msg.userId === 'user-a')).toBe(true);
    });

    it('debe calcular correctamente el número de mensajes "no leido" del usuario actual', () => {
      const activeUser = createMockUser({ id: 'user-a' });
      mockCurrentUser.set(activeUser);

      mockMessagesSignal.set([
        createMockInboxMessage({ id: '1', userId: 'user-a', status: 'no leido' }),
        createMockInboxMessage({ id: '2', userId: 'user-a', status: 'leido' }),
        createMockInboxMessage({ id: '3', userId: 'user-a', status: 'no leido' }),
        // Este es 'no leido', pero es de OTRO usuario, el unreadCount no debe contarlo
        createMockInboxMessage({ id: '4', userId: 'user-b', status: 'no leido' })
      ]);

      expect(service.unreadCount()).toBe(2);
    });

    it('debe reaccionar dinámicamente si el usuario actual cambia (Log out / Log in)', () => {
      mockMessagesSignal.set([
        createMockInboxMessage({ id: '1', userId: 'user-a', status: 'no leido' })
      ]);

      // Al inicio no hay usuario
      expect(service.messages().length).toBe(0);

      // El usuario hace login
      mockCurrentUser.set(createMockUser({ id: 'user-a' }));
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
      expect(mockInboxStateService.markAsRead).toHaveBeenCalledWith('msg-123');
    });

    it('debe delegar deleteMessage al InboxStateService', () => {
      service.deleteMessage('msg-456');
      expect(mockInboxStateService.deleteMessage).toHaveBeenCalledWith('msg-456');
    });

    it('debe ignorar clearAllMessages si no hay un usuario autenticado', () => {
      mockCurrentUser.set(null);
      service.clearAllMessages();
      expect(mockInboxStateService.clearAllMessages).not.toHaveBeenCalled();
    });

    it('debe delegar clearAllMessages usando el id del usuario actual', () => {
      mockCurrentUser.set(createMockUser({ id: 'active-user' }));
      service.clearAllMessages();
      expect(mockInboxStateService.clearAllMessages).toHaveBeenCalledWith('active-user');
    });
  });
});
