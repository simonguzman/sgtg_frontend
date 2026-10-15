import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { InboxService } from './inbox.service';
import { InboxStateService } from './inbox-state.service';
import { InboxMessage } from '../interfaces/inbox-message.interface';
import { NotificationType } from '../../../shared/components/notifications/models/notification.model';

const mensaje = (overrides: Partial<InboxMessage> = {}): InboxMessage => ({
  id: '1', userId: '10', type: NotificationType.INFO, title: 'Título', message: 'Mensaje', date: new Date(),
  status: 'no leido', ...overrides
});

describe('InboxService', () => {
  let service: InboxService;
  let mensajes: WritableSignal<InboxMessage[]>;
  let state: { messagesSignal: WritableSignal<InboxMessage[]>; markAsRead: jest.Mock; deleteMessage: jest.Mock;
    clearAllMessages: jest.Mock };

  beforeEach(() => {
    mensajes = signal<InboxMessage[]>([]);
    state = { messagesSignal: mensajes, markAsRead: jest.fn(), deleteMessage: jest.fn(), clearAllMessages: jest.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: InboxStateService, useValue: state }] });
    service = TestBed.inject(InboxService);
  });

  it('expone los mensajes del buzón y cuenta los no leídos', () => {
    mensajes.set([mensaje({ id: '1' }), mensaje({ id: '2', status: 'leido' }), mensaje({ id: '3' })]);
    expect(service.messages().map(m => m.id)).toEqual(['1', '2', '3']);
    expect(service.unreadCount()).toBe(2);

    mensajes.set([]);
    expect(service.unreadCount()).toBe(0);
  });

  it('delega las acciones en el estado del buzón', () => {
    service.markAsRead('1');
    service.deleteMessage('2');
    service.clearAllMessages();
    expect(state.markAsRead).toHaveBeenCalledWith('1');
    expect(state.deleteMessage).toHaveBeenCalledWith('2');
    expect(state.clearAllMessages).toHaveBeenCalled();
  });
});
