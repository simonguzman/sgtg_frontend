import { inject, Injectable } from '@angular/core';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { AppEvent } from '../../../core/interfaces/app-event.interface';
import { InboxMessage } from '../interfaces/inbox-message.interface';
import { InboxStateService } from './inbox-state.service';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { InboxEventPayload } from '../pages/notifications-page/models/inbox-event-context.model';
import { extractInboxEventContext } from '../helpers/inbox-event-context.helper';
import { INBOX_MESSAGE_BUILDERS } from './inbox-message-builders';

@Injectable({
  providedIn: 'root'
})
export class InboxEventProcessorService {
  private readonly eventBus = inject(EventBusService);
  private readonly inboxState = inject(InboxStateService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);

  constructor() {
    this.listenToSystemEvents();
  }

  private listenToSystemEvents(): void {
    this.eventBus.events$.subscribe(event => this.processSystemEvent(event));
  }

  private processSystemEvent(event: AppEvent): void {
    const targets = event.targetUserIds || [];
    if (targets.length === 0) return;

    const context = extractInboxEventContext((event.payload || {}) as InboxEventPayload);
    const buildMessage = INBOX_MESSAGE_BUILDERS[event.type];
    const baseMessage = buildMessage ? buildMessage(context) : null;

    if (!baseMessage) return;

    const messageToSend = baseMessage;

    const newMessages: InboxMessage[] = targets.map((userId: string) => ({
      ...messageToSend,
      id: crypto.randomUUID(),
      userId
    }));

    this.inboxState.addMessages(newMessages);

    const currentUser = this.authService.currentUser();
    if (currentUser && targets.includes(currentUser.id)) {
      this.notificationService.show({
        type: messageToSend.type,
        title: messageToSend.title,
        message: messageToSend.message,
        autoDismiss: true
      });
    }
  }
}
