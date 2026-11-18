import { Injectable, signal } from '@angular/core';
import { Notification, NotificationType } from '../models/notification.model';

/**
 * Avisos emergentes de la aplicación (confirmación, información, error y seguridad). Se cierran solos a los 5
 * segundos, o a los 10 los de error, salvo que se indique otra duración o que no se cierren.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly _notifications = signal<Notification[]>([]);
  /** Avisos visibles, del más reciente al más antiguo. */
  readonly notifications = this._notifications.asReadonly();

  private readonly DEFAULT_DURATION = 5000;
  private readonly ERROR_DURATION = 10000;

  /** Muestra un aviso y programa su cierre automático. */
  show(notification: Omit<Notification, 'id'>): void {
    const id = crypto.randomUUID();
    const newNotification: Notification = { ...notification, id };

    this._notifications.update(prev => [newNotification, ...prev]);

    if (newNotification.autoDismiss !== false) {
      const duration = this.resolveAutoDismissDuration(newNotification);
      setTimeout(() => this.dismiss(id), duration);
    }
  }

  /** Cierra un aviso. */
  dismiss(id: string): void {
    this._notifications.update(list => list.filter(n => n.id !== id));
  }

  /** Aviso de confirmación de una operación exitosa. */
  success(title: string, message: string): void {
    this.show({ type: NotificationType.CONFIRMATION, title, message, autoDismiss: true });
  }

  /** Aviso informativo. */
  info(title: string, message: string): void {
    this.show({ type: NotificationType.INFO, title, message, autoDismiss: true });
  }

  /** Aviso de error. */
  error(title: string, message: string): void {
    this.show({ type: NotificationType.ERROR, title, message, autoDismiss: true });
  }

  /** Aviso de seguridad, como el cierre de la sesión. */
  security(title: string, message: string): void {
    this.show({ type: NotificationType.SECURITY, title, message, autoDismiss: true });
  }

  private resolveAutoDismissDuration(notification: Notification): number {
    if (notification.autoDismissDelay !== undefined) {
      return notification.autoDismissDelay;
    }
    return notification.type === NotificationType.ERROR
      ? this.ERROR_DURATION
      : this.DEFAULT_DURATION;
  }
}
