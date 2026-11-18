import { computed, inject, Injectable } from '@angular/core';
import { InboxMessage } from '../interfaces/inbox-message.interface';
import { InboxStateService } from './inbox-state.service';

/** Buzón del usuario en sesión (las notificaciones las genera el backend). */
@Injectable({
  providedIn: 'root'
})
export class InboxService {
  private readonly inboxState = inject(InboxStateService);

  /** Notificaciones del buzón. */
  public readonly messages = computed<InboxMessage[]>(() => this.inboxState.messagesSignal());

  /** Cantidad de notificaciones sin leer, para el indicador del encabezado. */
  public readonly unreadCount = computed<number>(() =>
    this.messages().filter(msg => msg.status === 'no leido').length);

  /** Marca una notificación como leída. */
  public markAsRead(id: string): void {
    this.inboxState.markAsRead(id);
  }

  /** Elimina una notificación. */
  public deleteMessage(id: string): void {
    this.inboxState.deleteMessage(id);
  }

  /** Vacía el buzón. */
  public clearAllMessages(): void {
    this.inboxState.clearAllMessages();
  }
}
