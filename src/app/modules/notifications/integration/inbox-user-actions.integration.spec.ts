// src/app/modules/notifications/integration/inbox-user-actions.integration.spec.ts
import { TestBed } from '@angular/core/testing';
import { InboxService } from '../services/inbox.service';
import { InboxStateService } from '../services/inbox-state.service';
import { InboxEventProcessorService } from '../services/inbox-event-processor.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';
import { InboxMessage } from '../interfaces/inbox-message.interface';

describe('Integración [Notifications]: Acciones del usuario sobre su bandeja (marcar leído, eliminar, vaciar)', () => {
  let inboxService: InboxService;
  let inboxState: InboxStateService;
  let currentUserId: string;

  const buildMessage = (overrides: Partial<InboxMessage>): InboxMessage => ({
    id: crypto.randomUUID(), userId: currentUserId, title: 'Mensaje', message: 'Contenido',
    type: 'INFO' as InboxMessage['type'], date: new Date(), status: 'no leido', actionUrl: '/x',
    ...overrides
  });

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    currentUserId = 'user-actions-1';

    TestBed.configureTestingModule({
      providers: [
        InboxService, InboxStateService, InboxEventProcessorService, EventBusService,
        { provide: AuthService, useValue: { currentUser: () => ({ id: currentUserId }) } },
        { provide: NotificationService, useValue: { show: jest.fn() } }
      ]
    });

    inboxService = TestBed.inject(InboxService);
    inboxState = TestBed.inject(InboxStateService);
    inboxState['_messages'].set([]);
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
