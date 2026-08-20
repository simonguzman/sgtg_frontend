import { InboxMessage } from '../interfaces/inbox-message.interface';
import { NotificationType } from '../../../shared/components/notifications/models/notification.model';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { InboxEventContext } from '../pages/notifications-page/models/inbox-event-context.model';

type InboxMessageBuilder = (ctx: InboxEventContext) => Omit<InboxMessage, 'id' | 'userId'>;

function baseFields(): Pick<InboxMessage, 'date' | 'status'> {
  return { date: new Date(), status: 'no leido' };
}

/**
 * Construye la ruta de detalle de sustentación con fallback seguro.
 * Se repetía de forma idéntica en THESIS_SUSTENTATION_PROGRAMMED y
 * THESIS_VERDICT_REGISTERED en el switch original.
 */
function buildSustentationRoute(thesisId: string | undefined, sustentationId: unknown): string {
  return sustentationId
    ? `/thesis-work/details/${thesisId}/view_sustentation_details/${sustentationId}`
    : `/thesis-work/details/${thesisId}`;
}

/**
 * Mapa de "tipo de evento → constructor de mensaje de bandeja".
 * Al usar el enum AppEventType completo como tipo de clave (no
 * Partial<Record<...>>), TypeScript exige en tiempo de compilación que
 * TODOS los valores del enum estén cubiertos. Esto es lo que reveló que
 * THESIS_REACTIVATED nunca tenía un `case` en el switch original — un
 * evento real que se emite pero nunca generaba notificación al usuario.
 */
export const INBOX_MESSAGE_BUILDERS: Record<AppEventType, InboxMessageBuilder> = {

  // ==========================================
  // --- PROPUESTA ---
  // ==========================================
  [AppEventType.PROPOSAL_CREATED]: (ctx) => ({
    ...baseFields(),
    type: NotificationType.INFO,
    title: 'Nueva propuesta registrada',
    message: `El director ha registrado la propuesta: "${ctx.proposalTitle}"`,
    actionUrl: `/proposal/details/${ctx.proposalId}`
  }),

  [AppEventType.EVALUATION_ASSIGNED]: (ctx) => ({
    ...baseFields(),
    type: NotificationType.CONFIRMATION,
    title: 'Evaluación registrada',
    message: `El comité ha emitido un veredicto para la propuesta "${ctx.proposalTitle}": ${ctx.payload.veredict}`,
    actionUrl: `/proposal/details/${ctx.proposalId}/evaluations_performed`
  }),

  [AppEventType.PROPOSAL_CORRECTION_UPLOADED]: (ctx) => ({
    ...baseFields(),
    type: NotificationType.INFO,
    title: 'Correcciones de propuesta subidas',
    message: `El director ha subido un nuevo documento con correcciones para la propuesta: "${ctx.proposalTitle}"`,
    actionUrl: `/proposal/details/${ctx.proposalId}`
  }),

  [AppEventType.PROPOSAL_DEADLINE_WARNING]: (ctx) => ({
    ...baseFields(),
    type: NotificationType.SECURITY,
    title: 'Recordatorio de evaluación',
    message: `Atención: Faltan ${ctx.payload.daysLeft} días para el vencimiento del plazo de evaluación de la propuesta "${ctx.proposalTitle}".`,
    actionUrl: `/proposal/details/${ctx.proposalId}`
  }),

  [AppEventType.PROPOSAL_DEADLINE_EXPIRED]: (ctx) => ({
    ...baseFields(),
    type: NotificationType.ERROR,
    title: 'Plazo vencido',
    message: `El plazo para evaluar la propuesta "${ctx.proposalTitle}" ha expirado.`,
    actionUrl: `/proposal/details/${ctx.proposalId}`
  }),

  // ==========================================
  // --- ANTEPROYECTO ---
  // ==========================================
  [AppEventType.PRELIMINARY_DRAFT_CREATED]: (ctx) => ({
    ...baseFields(),
    type: NotificationType.INFO,
    title: 'Nuevo anteproyecto registrado',
    message: `El director ha radicado el anteproyecto: "${ctx.draftTitle}" para la asignación de evaluadores.`,
    actionUrl: `/preliminary-draft/details/${ctx.draftId}`
  }),

  [AppEventType.REVIEWERS_ASSIGNED]: (ctx) => ({
    ...baseFields(),
    type: NotificationType.INFO,
    title: 'Asignación de evaluadores',
    message: `El jefe de departamento te ha asignado como evaluador del anteproyecto: "${ctx.draftTitle}"`,
    actionUrl: `/preliminary-draft/details/${ctx.draftId}/loaded_documents`
  }),

  [AppEventType.PRELIMINARY_DRAFT_EVALUATION_REGISTERED]: (ctx) => ({
    ...baseFields(),
    type: NotificationType.CONFIRMATION,
    title: 'Evaluación de anteproyecto registrada',
    message: `Un evaluador ha registrado su evaluación para el anteproyecto "${ctx.draftTitle}". Veredicto: ${ctx.payload.veredict}`,
    actionUrl: `/preliminary-draft/details/${ctx.draftId}/evaluations_performed`
  }),

  [AppEventType.PRELIMINARY_DRAFT_CORRECTION_UPLOADED]: (ctx) => ({
    ...baseFields(),
    type: NotificationType.INFO,
    title: 'Nuevas correcciones disponibles',
    message: `El director ha subido un nuevo documento con correcciones para el anteproyecto: "${ctx.draftTitle}"`,
    actionUrl: `/preliminary-draft/details/${ctx.draftId}/loaded_documents`
  }),

  [AppEventType.PRELIMINARY_DRAFT_COUNCIL_PRESENTATION_UPLOADED]: (ctx) => ({
    ...baseFields(),
    type: NotificationType.INFO,
    title: 'Presentación al Consejo',
    message: `Se ha radicado el Formato C para presentación al Consejo del anteproyecto: "${ctx.draftTitle}"`,
    actionUrl: `/preliminary-draft/details/${ctx.draftId}/loaded_documents`
  }),

  [AppEventType.COUNCIL_RESOLUTION_UPLOADED]: (ctx) => ({
    ...baseFields(),
    type: NotificationType.CONFIRMATION,
    title: 'Resolución de Consejo registrada',
    message: `El Consejo de Facultad ha registrado la resolución para el anteproyecto "${ctx.draftTitle}". Estado final: ${ctx.payload.finalState}`,
    actionUrl: `/preliminary-draft/details/${ctx.draftId}/evaluations_performed`
  }),

  [AppEventType.PRELIMINARY_DRAFT_DEADLINE_WARNING]: (ctx) => ({
    ...baseFields(),
    type: NotificationType.SECURITY,
    title: 'Recordatorio de evaluación de anteproyecto',
    message: `Atención: Faltan ${ctx.payload.daysLeft} días para el vencimiento del plazo de evaluación del anteproyecto "${ctx.draftTitle}".`,
    actionUrl: `/preliminary-draft/details/${ctx.draftId}`
  }),

  [AppEventType.PRELIMINARY_DRAFT_DEADLINE_EXPIRED]: (ctx) => ({
    ...baseFields(),
    type: NotificationType.ERROR,
    title: 'Plazo de anteproyecto vencido',
    message: `El plazo para evaluar el anteproyecto "${ctx.draftTitle}" ha expirado.`,
    actionUrl: `/preliminary-draft/details/${ctx.draftId}`
  }),

  // ==========================================
  // --- TRABAJO DE GRADO ---
  // ==========================================
  [AppEventType.THESIS_ADVANCE_UPLOADED]: (ctx) => ({
    ...baseFields(),
    type: NotificationType.INFO,
    title: 'Nuevo Avance Recibido',
    message: `El estudiante ha subido un avance en el trabajo de grado: "${ctx.thesisTitle}"`,
    actionUrl: `/thesis-work/details/${ctx.thesisId}/loaded_documents`
  }),

  [AppEventType.THESIS_ADVANCE_EVALUATED]: (ctx) => ({
    ...baseFields(),
    type: NotificationType.CONFIRMATION,
    title: 'Avance Evaluado',
    message: `El comité ha evaluado un avance en "${ctx.thesisTitle}". Estado: ${ctx.payload.veredict}`,
    actionUrl: `/thesis-work/details/${ctx.thesisId}/evaluations_performed`
  }),

  [AppEventType.THESIS_FINAL_DELIVERY_UPLOADED]: (ctx) => ({
    ...baseFields(),
    type: NotificationType.INFO,
    title: 'Entrega Final Radicada',
    message: `El director ha subido los documentos de entrega final (Monografía, Formato E, Anexos) para: "${ctx.thesisTitle}"`,
    actionUrl: `/thesis-work/details/${ctx.thesisId}/loaded_documents`
  }),

  [AppEventType.THESIS_SUSTENTATION_PROGRAMMED]: (ctx) => ({
    // ← console.log de depuración eliminado (no debía llegar a producción)
    ...baseFields(),
    type: NotificationType.INFO,
    title: 'Sustentación Programada',
    message: `Se ha asignado fecha y jurados para la sustentación del trabajo de grado: "${ctx.thesisTitle}"`,
    actionUrl: buildSustentationRoute(ctx.thesisId, ctx.payload.sustentationId)
  }),

  [AppEventType.THESIS_VERDICT_REGISTERED]: (ctx) => ({
    ...baseFields(),
    type: NotificationType.CONFIRMATION,
    title: 'Veredicto de Sustentación',
    message: `Un jurado ha registrado su evaluación para "${ctx.thesisTitle}". Veredicto: ${ctx.payload.veredict}`,
    actionUrl: buildSustentationRoute(ctx.thesisId, ctx.payload.sustentationId)
  }),

  [AppEventType.SPECIAL_REQUEST_CREATED]: (ctx) => ({
    ...baseFields(),
    type: NotificationType.INFO,
    title: 'Nueva Solicitud Especial',
    message: `Se ha radicado una solicitud de tipo [${ctx.payload.type || 'General'}] para el trabajo de grado: "${ctx.thesisTitle}"`,
    actionUrl: `/thesis-work/details/${ctx.thesisId}`
  }),

  [AppEventType.SPECIAL_REQUEST_RESOLVED]: (ctx) => ({
    ...baseFields(),
    type: NotificationType.CONFIRMATION,
    title: 'Resolución de Solicitud Especial',
    message: `El comité ha respondido a la solicitud especial de "${ctx.thesisTitle}". Estado: ${ctx.payload.status}`,
    actionUrl: `/thesis-work/details/${ctx.thesisId}`
  }),

  [AppEventType.THESIS_PAZ_Y_SALVO_REGISTERED]: (ctx) => ({
    ...baseFields(),
    type: ctx.payload.isApproved ? NotificationType.CONFIRMATION : NotificationType.ERROR,
    title: 'Paz y Salvo Registrado',
    message: `Se ha registrado el Paz y Salvo para "${ctx.thesisTitle}". Estado: ${ctx.payload.isApproved ? 'Aprobado' : 'No Aprobado'}`,
    actionUrl: `/thesis-work/details/${ctx.thesisId}/loaded_documents`
  }),

  [AppEventType.THESIS_CORRESPONDENCE_REGISTERED]: (ctx) => ({
    ...baseFields(),
    type: NotificationType.INFO,
    title: 'Correspondencia Registrada',
    message: `Se ha radicado el documento de correspondencia final para: "${ctx.thesisTitle}"`,
    actionUrl: `/thesis-work/details/${ctx.thesisId}/loaded_documents`
  }),

  [AppEventType.THESIS_CORRECTED_DOCUMENTS_UPLOADED]: (ctx) => ({
    ...baseFields(),
    type: NotificationType.INFO,
    title: 'Nuevas Correcciones Subidas',
    message: `El director ha subido las correcciones correspondientes al trabajo de grado: "${ctx.thesisTitle}"`,
    actionUrl: `/thesis-work/details/${ctx.thesisId}/corrected_documents`
  }),

  [AppEventType.THESIS_CORRECTED_DOCUMENTS_EVALUATED]: (ctx) => ({
    ...baseFields(),
    type: NotificationType.CONFIRMATION,
    title: 'Correcciones Evaluadas',
    message: `Un jurado ha evaluado las correcciones de "${ctx.thesisTitle}". Veredicto: ${ctx.payload.veredict}`,
    actionUrl: `/thesis-work/details/${ctx.thesisId}/corrected_documents`
  }),

  // ← NUEVO: este evento se emite en ThesisWorkApiService.reactivateThesisWorkMock
  // pero no tenía ningún `case` en el switch original — el usuario nunca recibía
  // notificación de que su trabajo fue reactivado. El texto es una propuesta;
  // ajústalo si quieres un tono distinto.
  [AppEventType.THESIS_REACTIVATED]: (ctx) => ({
    ...baseFields(),
    type: NotificationType.CONFIRMATION,
    title: 'Trabajo de Grado Reactivado',
    message: `El trabajo de grado "${ctx.thesisTitle}" ha sido reactivado y puede continuar su proceso normalmente.`,
    actionUrl: `/thesis-work/details/${ctx.thesisId}`
  }),

  [AppEventType.THESIS_DEADLINE_WARNING]: (ctx) => ({
    ...baseFields(),
    type: NotificationType.SECURITY,
    title: 'Recordatorio de Entrega Final',
    message: `Faltan ${ctx.payload.daysLeft} días para la entrega final del trabajo: "${ctx.thesisTitle}".`,
    actionUrl: `/thesis-work/details/${ctx.thesisId}`
  }),

  [AppEventType.THESIS_DEADLINE_EXPIRED]: (ctx) => ({
    ...baseFields(),
    type: NotificationType.ERROR,
    title: 'Plazo de Entrega Vencido',
    message: `El plazo para la entrega final del trabajo "${ctx.thesisTitle}" ha expirado.`,
    actionUrl: `/thesis-work/details/${ctx.thesisId}`
  })
};
