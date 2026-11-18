/** Tipo de aviso, que define su color e icono. */
export enum NotificationType {
  CONFIRMATION = 'confirmation',
  INFO = 'info',
  ERROR = 'error',
  SECURITY = 'security'
}

/**
 * Aviso emergente. `autoDismiss: false` lo deja abierto hasta que el usuario lo cierre; `autoDismissDelay`
 * cambia su duración en milisegundos.
 */
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  dismissible?: boolean;
  autoDismiss?: boolean;
  autoDismissDelay ?: number;
}
