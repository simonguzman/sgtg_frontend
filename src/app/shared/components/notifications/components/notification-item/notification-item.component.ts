import { Component, computed, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { Notification, NotificationType } from '../../models/notification.model';
import { NOTIFICATION_CONFIG, NotificationConfig } from './models/notification-item.model';

@Component({
  selector: 'app-notification-item',
  imports: [NgClass],
  templateUrl: './notification-item.component.html',
  styleUrls: ['./notification-item.component.css']
})
export class NotificationItemComponent {
  notification = input.required<Notification>();
  dismissed = output<string>();

  protected readonly config = computed<NotificationConfig>(() => {
    const type = this.notification().type;
    return NOTIFICATION_CONFIG[type] ?? NOTIFICATION_CONFIG[NotificationType.INFO];
  });
}
