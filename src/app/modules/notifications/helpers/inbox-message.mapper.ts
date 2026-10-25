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
 * Eventos que llevan a una vista propia, sin importar la etapa a la que pasó
 * el trabajo (ej. el concepto aprobatorio del Comité lo pasa a anteproyecto,
 * que aún no tiene documento).
 */
const RUTAS_POR_EVENTO: Record<string, (trabajoId: number) => string> = {
  DECISION_COMITE: trabajoId => `/proposal/details/${trabajoId}/evaluations_performed`,
  CONCEPTO_EVALUADOR: trabajoId => `/preliminary-draft/details/${trabajoId}/evaluations_performed`,
  DECISION_CONSEJO_ANTEPROYECTO: trabajoId => `/preliminary-draft/details/${trabajoId}/evaluations_performed`,
  // El formato C se consulta en la pestaña de presentaciones al Consejo
  ANTEPROYECTO_REMITIDO: trabajoId => `/preliminary-draft/details/${trabajoId}/loaded_documents?tab=PRESENTACIONES`
};

/**
 * Vista a la que lleva la notificación: la propia de su evento o, si no
 * tiene, la de la etapa del trabajo al notificar; un trabajo cerrado lleva al
 * historial.
 */
export function rutaDeNotificacion(trabajoId: number | null, etapa: ProcesoApi | null,
  evento?: string | null): string | undefined {
  if (trabajoId === null || etapa === null) return undefined;
  const rutaDelEvento = evento ? RUTAS_POR_EVENTO[evento] : undefined;
  if (rutaDelEvento) return rutaDelEvento(trabajoId);
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
    actionUrl: rutaDeNotificacion(notificacion.trabajoId, notificacion.etapa, notificacion.evento)
  };
}
