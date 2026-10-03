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

  private resolveAutoDismissDuration(notification: Notification): number {
    if (notification.autoDismissDelay !== undefined) {
      return notification.autoDismissDelay;
    }
    return notification.type === NotificationType.ERROR
      ? this.ERROR_DURATION
      : this.DEFAULT_DURATION;
  }
}
