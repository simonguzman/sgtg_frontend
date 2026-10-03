import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { InboxService } from '../services/inbox.service';
import { InboxStateService } from '../services/inbox-state.service';
import { InboxEventProcessorService } from '../services/inbox-event-processor.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';
import { InboxMessage } from '../interfaces/inbox-message.interface';
import { User } from '../../users/interfaces/user.interface';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';

if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));
}

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-default', idType: IdentificationType.CC, idNumber: 123456789,
  firstName: 'Nombre', secondName: '', lastName: 'Apellido', secondLastName: '',
  codeNumber: 1234567890, email: 'test@test.com', password: 'hash',
  state: UserState.active, roles: [], ...overrides
} as User);

describe('Integración [Notifications]: Acciones del usuario sobre su bandeja (marcar leído, eliminar, vaciar)', () => {
  let inboxService: InboxService;
  let inboxState: InboxStateService;
  let currentUserId: string;
  let messageIdCounter = 0;
  const buildMessage = (overrides: Partial<InboxMessage>): InboxMessage => ({
    id: `msg-mock-${++messageIdCounter}`,
    userId: currentUserId,
    title: 'Mensaje',
    message: 'Contenido',
    type: 'INFO' as InboxMessage['type'],
    date: new Date(),
    status: 'no leido',
    actionUrl: '/x',
    ...overrides
  });
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    currentUserId = 'user-actions-1';
    messageIdCounter = 0;
    const mockActiveUser = createMockUser({ id: currentUserId });
    TestBed.configureTestingModule({
      providers: [
        InboxService, InboxStateService, InboxEventProcessorService, EventBusService,
        { provide: AuthService, useValue: { currentUser: () => mockActiveUser } },
        { provide: NotificationService, useValue: { show: jest.fn() } }
      ]
    });
    inboxService = TestBed.inject(InboxService);
    inboxState = TestBed.inject(InboxStateService);
    localStorage.clear();
    inboxState.clearAllMessages(currentUserId);
    inboxState.clearAllMessages('otro-usuario');
  });
  it('unreadCount debe reflejar solo los mensajes NO LEÍDOS del usuario en sesión', () => {
    inboxState.addMessages([
      buildMessage({ id: 'm1', status: 'no leido' }),
      buildMessage({ id: 'm2', status: 'leido' }),
      buildMessage({ id: 'm3', userId: 'otro-usuario', status: 'no leido' })
    ]);
    expect(inboxService.unreadCount()).toBe(1);
  });
  it('markAsRead debe cambiar el estado del mensaje sin afectar a los demás', () => {
    inboxState.addMessages([
      buildMessage({ id: 'm1', status: 'no leido' }),
      buildMessage({ id: 'm2', status: 'no leido' })
    ]);
    inboxService.markAsRead('m1');
    expect(inboxState.messagesSignal().find(m => m.id === 'm1')?.status).toBe('leido');
    expect(inboxState.messagesSignal().find(m => m.id === 'm2')?.status).toBe('no leido');
    expect(inboxService.unreadCount()).toBe(1);
  });
  it('deleteMessage debe eliminar solo el mensaje indicado', () => {
    inboxState.addMessages([buildMessage({ id: 'm1' }), buildMessage({ id: 'm2' })]);
    inboxService.deleteMessage('m1');
    expect(inboxState.messagesSignal()).toHaveLength(1);
    expect(inboxState.messagesSignal()[0].id).toBe('m2');
  });
  it('clearAllMessages debe vaciar SOLO la bandeja del usuario en sesión, sin tocar la de otros', () => {
    inboxState.addMessages([
      buildMessage({ id: 'm1' }),
      buildMessage({ id: 'm2' }),
      buildMessage({ id: 'm3', userId: 'otro-usuario' })
    ]);
    inboxService.clearAllMessages();
    expect(inboxService.messages()).toHaveLength(0);
    expect(inboxState.messagesSignal()).toHaveLength(1);
    expect(inboxState.messagesSignal()[0].userId).toBe('otro-usuario');
  });
});
