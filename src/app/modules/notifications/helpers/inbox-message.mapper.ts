import { InboxMessage } from '../interfaces/inbox-message.interface';
import { NotificationType } from '../../../shared/components/notifications/models/notification.model';
import { NotificacionApi, TipoNotificacionApi } from '../../../core/interfaces/api/notificacion-api.interface';
import { ETAPAS_FINALES, ProcesoApi } from '../../../core/interfaces/api/trabajo-grado-api.interface';

const TIPO: Record<TipoNotificacionApi, NotificationType> = {
  INFO: NotificationType.INFO,
  CONFIRMACION: NotificationType.CONFIRMATION,
  ALERTA: NotificationType.SECURITY,
  ERROR: NotificationType.ERROR
};

const ETAPAS_DE_ANTEPROYECTO: readonly ProcesoApi[] = ['ANTEPROYECTO', 'EVALUACION', 'APROBACION_CONSEJO'];

/**
 * Vista a la que lleva la notificación según la etapa del trabajo al
 * notificar; un trabajo cerrado lleva al historial.
 */
export function rutaDeNotificacion(trabajoId: number | null, etapa: ProcesoApi | null): string | undefined {
  if (trabajoId === null || etapa === null) return undefined;
  if (ETAPAS_FINALES.includes(etapa)) return '/history';
  if (etapa === 'PROPUESTA') return `/proposal/details/${trabajoId}`;
  if (ETAPAS_DE_ANTEPROYECTO.includes(etapa)) return `/preliminary-draft/details/${trabajoId}`;
  return `/thesis-work/details/${trabajoId}`;
}

/** Notificación del backend como mensaje del buzón. */
export function aMensajeDelBuzon(notificacion: NotificacionApi, userId: string): InboxMessage {
  return {
    id: String(notificacion.id),
    userId,
    type: TIPO[notificacion.tipo],
    title: notificacion.titulo,
    message: notificacion.mensaje,
    date: new Date(notificacion.fecha),
    status: notificacion.leida ? 'leido' : 'no leido',
    actionUrl: rutaDeNotificacion(notificacion.trabajoId, notificacion.etapa)
  };
}
