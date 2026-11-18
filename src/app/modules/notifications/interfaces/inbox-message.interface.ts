import { NotificationType } from "../../../shared/components/notifications/models/notification.model";

/** Estado de lectura de una notificación. */
export type InboxStatus = 'leido' | 'no leido';

/** Notificación del buzón, con la ruta a la que lleva su evento. */
export interface InboxMessage {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  date: Date;
  status: InboxStatus;
  actionUrl?: string;
}
