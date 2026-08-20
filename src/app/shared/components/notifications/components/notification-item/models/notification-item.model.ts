import { NotificationType } from '../../../models/notification.model';

export interface NotificationConfig {
  containerClass: string;
  titleClass: string;
  messageClass: string;
  iconClass: string;
  icon: string;
  closeClass: string;
}

export const NOTIFICATION_CONFIG: Record<NotificationType, NotificationConfig> = {
  [NotificationType.CONFIRMATION]: {
    containerClass: 'notification--confirmation',
    titleClass:     'notification__title--confirmation',
    messageClass:   'notification__message--confirmation',
    iconClass:      'text-green-600',
    icon:           'pi-check-circle',
    closeClass:     'notification__close--confirmation'
  },
  [NotificationType.INFO]: {
    containerClass: 'notification--info',
    titleClass:     'notification__title--info',
    messageClass:   'notification__message--info',
    iconClass:      'text-blue-600',
    icon:           'pi-info-circle',
    closeClass:     'notification__close--info'
  },
  [NotificationType.ERROR]: {
    containerClass: 'notification--error',
    titleClass:     'notification__title--error',
    messageClass:   'notification__message--error',
    iconClass:      'text-red-500',
    icon:           'pi-times-circle',
    closeClass:     'notification__close--error'
  },
  [NotificationType.SECURITY]: {
    containerClass: 'notification--security',
    titleClass:     'notification__title--security',
    messageClass:   'notification__message--security',
    iconClass:      'text-orange-500',
    icon:           'pi-shield',
    closeClass:     'notification__close--security'
  }
};
