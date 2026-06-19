import { NotificationType } from "../../../shared/components/notifications/models/notification.model";

export type InboxStatus = 'leido' | 'no leido';

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
