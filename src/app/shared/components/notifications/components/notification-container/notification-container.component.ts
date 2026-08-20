import { Component, inject } from '@angular/core';
import { NotificationService } from '../../services/notification.service';
import { NotificationItemComponent } from '../notification-item/notification-item.component';

@Component({
  selector: 'app-notification-container',
  imports: [NotificationItemComponent],
  templateUrl: './notification-container.component.html',
  styleUrls: ['./notification-container.component.css']
})
export class NotificationContainerComponent {
  // ← readonly agregado: mismo patrón que cada servicio inyectado en el resto del proyecto.
  protected readonly notificationService = inject(NotificationService);
}
