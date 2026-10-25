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

const documentosDelTrabajo = (trabajoId: number, pestana: string) =>
  `/thesis-work/details/${trabajoId}/loaded_documents?tab=${pestana}`;

/** Detalle de la sesión de sustentación; sin sesión (notificaciones anteriores), la pestaña de sustentación. */
const detalleDeSesion = (trabajoId: number, sesion?: number | null) => sesion
  ? `/thesis-work/details/${trabajoId}/view_sustentation_details/sesion-${sesion}`
  : documentosDelTrabajo(trabajoId, 'SUSTENTACION');

/**
 * Eventos que llevan a una vista propia, sin importar la etapa a la que pasó
 * el trabajo (ej. el concepto aprobatorio del Comité lo pasa a anteproyecto,
 * que aún no tiene documento).
 */
const RUTAS_POR_EVENTO: Record<string, (trabajoId: number, sesion?: number | null) => string> = {
  DECISION_COMITE: trabajoId => `/proposal/details/${trabajoId}/evaluations_performed`,
  CONCEPTO_EVALUADOR: trabajoId => `/preliminary-draft/details/${trabajoId}/evaluations_performed`,
  DECISION_CONSEJO_ANTEPROYECTO: trabajoId => `/preliminary-draft/details/${trabajoId}/evaluations_performed`,
  // El formato C se consulta en la pestaña de presentaciones al Consejo
  ANTEPROYECTO_REMITIDO: trabajoId => `/preliminary-draft/details/${trabajoId}/loaded_documents?tab=PRESENTACIONES`,
  // La solicitud de sustentación y su paz y salvo, en la entrega final (donde el director radica una nueva)
  SUSTENTACION_SOLICITADA: trabajoId => `/thesis-work/details/${trabajoId}/loaded_documents?tab=ENTREGA_FINAL`,
  PAZ_Y_SALVO_NO_APROBADO: trabajoId => `/thesis-work/details/${trabajoId}/loaded_documents?tab=ENTREGA_FINAL`,
  PAZ_Y_SALVO_APROBADO: trabajoId => `/thesis-work/details/${trabajoId}/loaded_documents?tab=PAZ_Y_SALVO`,
  // Jurados asignados y fecha de la sesión, en la pestaña de sustentación; la nueva fecha es una solicitud especial
  SUSTENTACION_PROGRAMADA: trabajoId => documentosDelTrabajo(trabajoId, 'SUSTENTACION'),
  NUEVA_FECHA_SOLICITADA: trabajoId => documentosDelTrabajo(trabajoId, 'SOLICITUDES'),
  NUEVA_FECHA_RESUELTA: trabajoId => documentosDelTrabajo(trabajoId, 'SOLICITUDES'),
  // La calificación y la inasistencia, en el detalle de su sesión
  SUSTENTACION_CALIFICADA: detalleDeSesion,
  INASISTENCIA_REGISTRADA: detalleDeSesion,
  // Los ajustes y su verificación, en los documentos corregidos de la sustentación
  AJUSTES_RADICADOS: trabajoId => `/thesis-work/details/${trabajoId}/corrected_documents`,
  AJUSTES_VERIFICADOS: trabajoId => `/thesis-work/details/${trabajoId}/corrected_documents`
};

/**
 * Vista a la que lleva la notificación: si el hecho cerró el trabajo, el
 * historial; si no, la propia de su evento o la de la etapa del trabajo al
 * notificar.
 */
export function rutaDeNotificacion(trabajoId: number | null, etapa: ProcesoApi | null,
  evento?: string | null, sesion?: number | null): string | undefined {
  if (trabajoId === null || etapa === null) return undefined;
  if (ETAPAS_FINALES.includes(etapa)) return '/history';
  const rutaDelEvento = evento ? RUTAS_POR_EVENTO[evento] : undefined;
  if (rutaDelEvento) return rutaDelEvento(trabajoId, sesion);
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
    actionUrl: rutaDeNotificacion(notificacion.trabajoId, notificacion.etapa, notificacion.evento, notificacion.sesion)
  };
}
