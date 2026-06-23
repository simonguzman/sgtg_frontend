import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { InboxService } from './inbox.service';
import { InboxStateService } from './inbox-state.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { InboxEventProcessorService } from './inbox-event-processor.service';
import { NotificationType } from '../../../shared/components/notifications/models/notification.model';

// --- INTERFACES ESTRICTAS PARA MOCKS ---
interface TestUser {
  id: string;
  username: string;
}

interface TestInboxMessage {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  date: Date;
  status: 'leido' | 'no leido';
  actionUrl?: string;
}

interface MockAuthService {
  currentUser: jest.Mock<TestUser | null>;
}

interface MockInboxStateService {
  messagesSignal: WritableSignal<TestInboxMessage[]>;
  markAsRead: jest.Mock<void, [string]>;
  deleteMessage: jest.Mock<void, [string]>;
  clearAllMessages: jest.Mock<void, [string]>;
}

describe('Service: Inbox', () => {
  let service: InboxService;
  let authServiceMock: MockAuthService;
  let inboxStateMock: MockInboxStateService;

  beforeEach(() => {
    // 1. Mock de AuthService con control estricto de retornos
    authServiceMock = {
      currentUser: jest.fn(() => null)
    };

    // 2. Mock de InboxStateService exponiendo un Signal reactivo real para alimentar los computed
    inboxStateMock = {
      messagesSignal: signal<TestInboxMessage[]>([]),
      markAsRead: jest.fn(),
      deleteMessage: jest.fn(),
      clearAllMessages: jest.fn()
    };

    // 3. Configuración del TestBed
    TestBed.configureTestingModule({
      providers: [
        InboxService,
        { provide: AuthService, useValue: authServiceMock },
        { provide: InboxStateService, useValue: inboxStateMock },
        // Se inyecta un objeto vacío para el procesador de eventos ya que en este servicio solo se invoca su inyección
        { provide: InboxEventProcessorService, useValue: {} }
      ]
    });

    service = TestBed.inject(InboxService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Debe instanciar el servicio correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('Propiedades Computadas Reactivas (messages y unreadCount)', () => {
    it('Debe devolver un arreglo vacío y contador en 0 si NO hay usuario en sesión', () => {
      authServiceMock.currentUser.mockReturnValue(null);

      inboxStateMock.messagesSignal.set([
        { id: '1', userId: 'user-a', type: NotificationType.INFO, title: 'T1', message: 'M1', date: new Date(), status: 'no leido' }
      ]);

      expect(service.messages()).toEqual([]);
      expect(service.unreadCount()).toBe(0);
    });

    it('Debe filtrar y devolver únicamente los mensajes pertenecientes al usuario activo', () => {
      authServiceMock.currentUser.mockReturnValue({ id: 'user-1', username: 'simon.guzman' });

      const mixedMessages: TestInboxMessage[] = [
        { id: 'msg-1', userId: 'user-1', type: NotificationType.INFO, title: 'T1', message: 'M1', date: new Date(), status: 'leido' },
        { id: 'msg-2', userId: 'user-2', type: NotificationType.INFO, title: 'T2', message: 'M2', date: new Date(), status: 'no leido' },
        { id: 'msg-3', userId: 'user-1', type: NotificationType.CONFIRMATION, title: 'T3', message: 'M3', date: new Date(), status: 'no leido' }
      ];

      inboxStateMock.messagesSignal.set(mixedMessages);

      const userMessages = service.messages();
      expect(userMessages.length).toBe(2);
      expect(userMessages.every(msg => msg.userId === 'user-1')).toBeTruthy();
      expect(userMessages.map(m => m.id)).toEqual(['msg-1', 'msg-3']);
    });

    it('Debe recalcular correctamente la cantidad de mensajes "no leido" del usuario', () => {
      authServiceMock.currentUser.mockReturnValue({ id: 'user-beta', username: 'estudiante' });

      const stateMessages: TestInboxMessage[] = [
        { id: '1', userId: 'user-beta', type: NotificationType.INFO, title: 'A', message: 'B', date: new Date(), status: 'no leido' },
        { id: '2', userId: 'user-beta', type: NotificationType.INFO, title: 'C', message: 'D', date: new Date(), status: 'leido' },
        { id: '3', userId: 'user-beta', type: NotificationType.ERROR, title: 'E', message: 'F', date: new Date(), status: 'no leido' },
        { id: '4', userId: 'otro-user', type: NotificationType.INFO, title: 'G', message: 'H', date: new Date(), status: 'no leido' } // No debe contarlo
      ];

      inboxStateMock.messagesSignal.set(stateMessages);

      expect(service.unreadCount()).toBe(2); // Solo debe contar el msg 1 y 3
    });
  });

  describe('Delegación de Acciones al Estado Global', () => {
    it('Debe delegar "markAsRead" al servicio de estado', () => {
      const targetId = 'noti-123';
      service.markAsRead(targetId);
      expect(inboxStateMock.markAsRead).toHaveBeenCalledWith(targetId);
      expect(inboxStateMock.markAsRead).toHaveBeenCalledTimes(1);
    });

    it('Debe delegar "deleteMessage" al servicio de estado', () => {
      const targetId = 'noti-456';
      service.deleteMessage(targetId);
      expect(inboxStateMock.deleteMessage).toHaveBeenCalledWith(targetId);
      expect(inboxStateMock.deleteMessage).toHaveBeenCalledTimes(1);
    });

    describe('clearAllMessages', () => {
      it('Debe invocar a clearAllMessages del estado con el ID del usuario si hay sesión activa', () => {
        authServiceMock.currentUser.mockReturnValue({ id: 'usr-999', username: 'profesor' });

        service.clearAllMessages();

        expect(inboxStateMock.clearAllMessages).toHaveBeenCalledWith('usr-999');
        expect(inboxStateMock.clearAllMessages).toHaveBeenCalledTimes(1);
      });

      it('NO debe invocar a clearAllMessages del estado si NO hay sesión activa', () => {
        authServiceMock.currentUser.mockReturnValue(null);

        service.clearAllMessages();

        expect(inboxStateMock.clearAllMessages).not.toHaveBeenCalled();
      });
    });
  });
});
