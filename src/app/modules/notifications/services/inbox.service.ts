import { computed, inject, Injectable } from '@angular/core';
import { InboxMessage } from '../interfaces/inbox-message.interface';
import { InboxStateService } from './inbox-state.service';

/** Buzón del usuario en sesión (las notificaciones las genera el backend). */
@Injectable({
  providedIn: 'root'
})
export class InboxService {
  private readonly inboxState = inject(InboxStateService);

  public readonly messages = computed<InboxMessage[]>(() => this.inboxState.messagesSignal());

  public readonly unreadCount = computed<number>(() =>
    this.messages().filter(msg => msg.status === 'no leido').length);

  public markAsRead(id: string): void {
    this.inboxState.markAsRead(id);
  }

  public deleteMessage(id: string): void {
    this.inboxState.deleteMessage(id);
  }

  public clearAllMessages(): void {
    this.inboxState.clearAllMessages();
  }
}
