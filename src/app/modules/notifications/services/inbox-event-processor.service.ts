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

  // Suscripción de por vida al bus de eventos: este servicio es un singleton
  // de raíz (providedIn: 'root') que vive durante toda la sesión de la app,
  // así que NO necesita unsubscribe/takeUntilDestroyed — nunca se destruye
  // antes que la propia aplicación. Añadir first()/take(1) aquí rompería la
  // funcionalidad: solo procesaría el primer evento del sistema y luego se
  // quedaría sordo para siempre.
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

    // const (no let) permite que TS estreche el tipo correctamente dentro
    // del closure de abajo, evitando el operador `!` de aserción no nula
    // que el original necesitaba por la reasignación con `let`.
    const messageToSend = baseMessage;

    const newMessages: InboxMessage[] = targets.map((userId: string) => ({
      ...messageToSend,
      id: crypto.randomUUID(),
      userId
    }));

    this.inboxState.addMessages(newMessages);

    const currentUser = this.authService.currentUser();
    if (currentUser && targets.includes(currentUser.id)) {
      // ← Cast `as NotificationType` eliminado: messageToSend.type ya es
      // NotificationType (así lo declara cada builder), no hace falta forzarlo.
      this.notificationService.show({
        type: messageToSend.type,
        title: messageToSend.title,
        message: messageToSend.message,
        autoDismiss: true
      });
    }
  }
}
