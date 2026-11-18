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

const evaluacionesDelTrabajo = (trabajoId: number) => `/thesis-work/details/${trabajoId}/evaluations_performed`;

const reunionesDelTrabajo = (trabajoId: number) => `/thesis-work/details/${trabajoId}/meetings`;

/** Detalle de la sesión de sustentación; sin sesión (notificaciones anteriores), la pestaña de sustentación. */
const detalleDeSesion = (trabajoId: number, sesion?: number | null) => sesion
  ? `/thesis-work/details/${trabajoId}/view_sustentation_details/sesion-${sesion}`
  : documentosDelTrabajo(trabajoId, 'SUSTENTACION');

/**
 * Eventos que llevan a una vista propia, sin importar la etapa a la que pasó
 * el trabajo (ej. el concepto aprobatorio del Comité lo pasa a anteproyecto,
 * que aún no tiene documento). Cada evento lleva a donde se atiende: lo que se
 * radica, a la pestaña de documentos cargados en la que se revisa o se evalúa;
 * los plazos, a donde se hace lo que vence; las decisiones y revisiones, a las
 * evaluaciones realizadas, y lo de la sustentación, al detalle de la sesión o a
 * los documentos corregidos.
 */
const RUTAS_POR_EVENTO: Record<string, (trabajoId: number, sesion?: number | null) => string> = {
  DECISION_COMITE: trabajoId => `/proposal/details/${trabajoId}/evaluations_performed`,
  CONCEPTO_EVALUADOR: trabajoId => `/preliminary-draft/details/${trabajoId}/evaluations_performed`,
  DECISION_CONSEJO_ANTEPROYECTO: trabajoId => `/preliminary-draft/details/${trabajoId}/evaluations_performed`,
  ANTEPROYECTO_RADICADO: trabajoId => `/preliminary-draft/details/${trabajoId}/loaded_documents?tab=ANTEPROYECTOS`,
  ANTEPROYECTO_CORREGIDO: trabajoId => `/preliminary-draft/details/${trabajoId}/loaded_documents?tab=ANTEPROYECTOS`,
  EVALUADORES_ASIGNADOS: trabajoId => `/preliminary-draft/details/${trabajoId}/loaded_documents?tab=ANTEPROYECTOS`,
  PLAZO_CORRECCIONES_POR_VENCER: trabajoId => `/preliminary-draft/details/${trabajoId}/loaded_documents?tab=ANTEPROYECTOS`,
  PLAZO_CORRECCIONES_VENCIDO: trabajoId => `/preliminary-draft/details/${trabajoId}/loaded_documents?tab=ANTEPROYECTOS`,
  ANTEPROYECTO_REMITIDO: trabajoId => `/preliminary-draft/details/${trabajoId}/loaded_documents?tab=PRESENTACIONES`,
  SUSTENTACION_SOLICITADA: trabajoId => `/thesis-work/details/${trabajoId}/loaded_documents?tab=ENTREGA_FINAL`,
  PAZ_Y_SALVO_NO_APROBADO: trabajoId => `/thesis-work/details/${trabajoId}/loaded_documents?tab=ENTREGA_FINAL`,
  SUSTENTACION_HABILITADA: trabajoId => `/thesis-work/details/${trabajoId}/loaded_documents?tab=ENTREGA_FINAL`,
  PLAZO_TRABAJO_POR_VENCER: trabajoId => `/thesis-work/details/${trabajoId}/loaded_documents?tab=ENTREGA_FINAL`,
  PLAZO_TRABAJO_ULTIMO_AVISO: trabajoId => `/thesis-work/details/${trabajoId}/loaded_documents?tab=ENTREGA_FINAL`,
  RECORDATORIO_ENTREGA: trabajoId => `/thesis-work/details/${trabajoId}/loaded_documents?tab=ENTREGA_FINAL`,
  PAZ_Y_SALVO_APROBADO: trabajoId => `/thesis-work/details/${trabajoId}/loaded_documents?tab=PAZ_Y_SALVO`,
  INFORME_RADICADO: trabajoId => documentosDelTrabajo(trabajoId, 'AVANCES'),
  INFORME_REVISADO: evaluacionesDelTrabajo,
  REUNION_AGENDADA: reunionesDelTrabajo,
  REUNION_PROXIMA: reunionesDelTrabajo,
  REUNION_SIN_INFORME: reunionesDelTrabajo,
  REUNION_POR_VENCER: reunionesDelTrabajo,
  REUNION_VENCIDA: reunionesDelTrabajo,
  CAMBIO_OBJETIVOS_SOLICITADO: trabajoId => documentosDelTrabajo(trabajoId, 'SOLICITUDES'),
  CAMBIO_OBJETIVOS_AVALADO: trabajoId => documentosDelTrabajo(trabajoId, 'SOLICITUDES'),
  CAMBIO_OBJETIVOS_NO_AVALADO: trabajoId => documentosDelTrabajo(trabajoId, 'SOLICITUDES'),
  PRORROGA_SOLICITADA: trabajoId => documentosDelTrabajo(trabajoId, 'SOLICITUDES'),
  SUSPENSION_SOLICITADA: trabajoId => documentosDelTrabajo(trabajoId, 'SOLICITUDES'),
  CANCELACION_SOLICITADA: trabajoId => documentosDelTrabajo(trabajoId, 'SOLICITUDES'),
  NUEVA_FECHA_SOLICITADA: trabajoId => documentosDelTrabajo(trabajoId, 'SOLICITUDES'),
  TRABAJO_REANUDADO: trabajoId => documentosDelTrabajo(trabajoId, 'SOLICITUDES'),
  PLAZO_CAMBIO_OBJETIVOS_POR_VENCER: trabajoId => documentosDelTrabajo(trabajoId, 'SOLICITUDES'),
  PLAZO_CAMBIO_OBJETIVOS_VENCIDO: trabajoId => documentosDelTrabajo(trabajoId, 'SOLICITUDES'),
  PLAZO_PRORROGA_POR_VENCER: trabajoId => documentosDelTrabajo(trabajoId, 'SOLICITUDES'),
  PLAZO_PRORROGA_VENCIDO: trabajoId => documentosDelTrabajo(trabajoId, 'SOLICITUDES'),
  CAMBIO_OBJETIVOS_RESUELTO: evaluacionesDelTrabajo,
  PRORROGA_RESUELTA: evaluacionesDelTrabajo,
  SUSPENSION_RESUELTA: evaluacionesDelTrabajo,
  CANCELACION_RESUELTA: evaluacionesDelTrabajo,
  NUEVA_FECHA_RESUELTA: evaluacionesDelTrabajo,
  SUSTENTACION_PROGRAMADA: trabajoId => documentosDelTrabajo(trabajoId, 'SUSTENTACION'),
  PLAZO_SEGUNDA_SESION_POR_VENCER: trabajoId => documentosDelTrabajo(trabajoId, 'SUSTENTACION'),
  SUSTENTACION_CALIFICADA: detalleDeSesion,
  INASISTENCIA_REGISTRADA: detalleDeSesion,
  AJUSTES_RADICADOS: trabajoId => `/thesis-work/details/${trabajoId}/corrected_documents`,
  AJUSTES_VERIFICADOS: trabajoId => `/thesis-work/details/${trabajoId}/corrected_documents`,
  PLAZO_AJUSTES_POR_VENCER: trabajoId => `/thesis-work/details/${trabajoId}/corrected_documents`
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
