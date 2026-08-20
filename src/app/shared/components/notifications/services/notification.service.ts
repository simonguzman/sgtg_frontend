import { Injectable, signal } from '@angular/core';
import { Notification, NotificationType } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly _notifications = signal<Notification[]>([]);
  readonly notifications = this._notifications.asReadonly();

  private readonly DEFAULT_DURATION = 5000;
  private readonly ERROR_DURATION = 10000;

  show(notification: Omit<Notification, 'id'>): void {
    const id = crypto.randomUUID();
    const newNotification: Notification = { ...notification, id };

    this._notifications.update(prev => [newNotification, ...prev]);

    // ← FIX: antes era `if (newNotification.type)`, siempre true.
    // Se usa `!== false` (no `=== true`) a propósito: casi ninguna llamada
    // a show() en el proyecto pasa `autoDismiss` explícitamente, y todas
    // dependen del comportamiento actual de auto-cierre. Con `!== false`
    // el default (ausente → se cierra solo) se preserva exactamente igual,
    // y ahora sí es posible pedir una notificación persistente con
    // `autoDismiss: false`.
    if (newNotification.autoDismiss !== false) {
      const duration = this.resolveAutoDismissDuration(newNotification);
      setTimeout(() => this.dismiss(id), duration);
    }
  }

  dismiss(id: string): void {
    this._notifications.update(list => list.filter(n => n.id !== id));
  }

  success(title: string, message: string): void {
    this.show({ type: NotificationType.CONFIRMATION, title, message, autoDismiss: true });
  }

  info(title: string, message: string): void {
    this.show({ type: NotificationType.INFO, title, message, autoDismiss: true });
  }

  error(title: string, message: string): void {
    this.show({ type: NotificationType.ERROR, title, message, autoDismiss: true });
  }

  security(title: string, message: string): void {
    this.show({ type: NotificationType.SECURITY, title, message, autoDismiss: true });
  }

  // ← NUEVO: antes autoDismissDelay estaba declarado pero nunca se leía —
  // un caller no tenía forma real de pedir una duración personalizada.
  // Ahora se respeta, con fallback al comportamiento anterior según el tipo.
  private resolveAutoDismissDuration(notification: Notification): number {
    if (notification.autoDismissDelay !== undefined) {
      return notification.autoDismissDelay;
    }
    return notification.type === NotificationType.ERROR
      ? this.ERROR_DURATION
      : this.DEFAULT_DURATION;
  }
}
