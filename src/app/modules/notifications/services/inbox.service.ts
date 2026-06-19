import { computed, inject, Injectable } from '@angular/core';
import { InboxMessage } from '../interfaces/inbox-message.interface';
import { AuthService } from '../../../core/services/auth/auth.service';
import { InboxStateService } from './inbox-state.service';
import { InboxEventProcessorService } from './inbox-event-processor.service';

@Injectable({
  providedIn: 'root'
})
export class InboxService {
  private readonly inboxState = inject(InboxStateService);
  private readonly authService = inject(AuthService);

  // Inyectado estratégicamente para activar la escucha del Bus de eventos globales
  private readonly eventProcessor = inject(InboxEventProcessorService);

  // Selector computado reactivo filtrado para el usuario activo
  public readonly messages = computed<InboxMessage[]>(() => {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return [];
    return this.inboxState.messagesSignal().filter(msg => msg.userId === currentUser.id);
  });

  public markAsRead(id: string): void {
    this.inboxState.markAsRead(id);
  }

  public deleteMessage(id: string): void {
    this.inboxState.deleteMessage(id);
  }

  public clearAllMessages(): void {
    const currentUser = this.authService.currentUser();
    if (currentUser) {
      this.inboxState.clearAllMessages(currentUser.id);
    }
  }

  public readonly unreadCount = computed<number>(() => {
    return this.messages().filter(msg => msg.status === 'no leido').length;
  });
}
