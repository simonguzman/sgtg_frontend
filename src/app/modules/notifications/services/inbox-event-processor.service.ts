import { inject, Injectable } from '@angular/core';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { AppEvent } from '../../../core/interfaces/app-event.interface';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { InboxMessage } from '../interfaces/inbox-message.interface';
import { NotificationType } from '../../../shared/components/notifications/models/notification.model';
import { InboxStateService } from './inbox-state.service';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';
import { AuthService } from '../../../core/services/auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class InboxEventProcessorService {
  private readonly eventBus = inject(EventBusService);
  private readonly inboxState = inject(InboxStateService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);

  constructor() {
    this.listenToSystemEvents();
  }

  private listenToSystemEvents() {
    this.eventBus.events$.subscribe(event => {
      this.processSystemEvent(event);
    });
  }

  private processSystemEvent(event: AppEvent) {
    const targets = event.targetUserIds || [];
    if (targets.length === 0) return;

    let baseMessage: Omit<InboxMessage, 'id' | 'userId'> | null = null;
    const payload = event.payload || {};

    // 💡 1. Extracción segura de Títulos (Con soporte para anidación y textos de respaldo para mejorar UX)
    const proposalTitle =
      payload?.title ||
      payload?.proposal?.title ||
      payload?.proposalTitle ||
      'Propuesta sin título';

    const draftTitle =
      payload?.preliminaryDraftTitle ||
      payload?.proposalData?.title ||
      payload?.preliminaryDraft?.proposalData?.title ||
      payload?.draftTitle ||
      (proposalTitle !== 'Propuesta sin título' ? proposalTitle : 'Anteproyecto sin título');

    const thesisTitle =
      payload?.thesisTitle ||
      payload?.preliminaryDraftData?.proposalData?.title ||
      payload?.thesisWork?.preliminaryDraftData?.proposalData?.title ||
      payload?.thesisTitle ||
      (draftTitle !== 'Anteproyecto sin título' ? draftTitle : 'Trabajo de grado sin título');

    // 💡 2. Extracción segura de IDs (Buscando en niveles anidados para evitar rutas con /undefined)
    const proposalId =
      payload?.proposalId ||
      payload?.proposal?.id ||
      payload?.id;

    const draftId =
      payload?.preliminaryDraftId ||
      payload?.preliminaryDraft?.preliminaryDraftId ||
      payload?.draftId ||
      payload?.id;

    const thesisId =
      payload?.thesisWorkId ||
      payload?.thesisWork?.thesisWorkId ||
      payload?.thesisId ||
      payload?.id;

    switch (event.type) {
      // ==========================================
      // --- EVENTOS DE PROPUESTA ---
      // ==========================================
      case AppEventType.PROPOSAL_CREATED:
        baseMessage = {
          type: NotificationType.INFO,
          title: 'Nueva propuesta registrada',
          message: `El director ha registrado la propuesta: "${proposalTitle}"`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/proposal/details/${proposalId}`
        };
        break;

      case AppEventType.EVALUATION_ASSIGNED:
        baseMessage = {
          type: NotificationType.CONFIRMATION,
          title: 'Evaluación registrada',
          message: `El comité ha emitido un veredicto para la propuesta "${proposalTitle}": ${payload?.veredict}`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/proposal/details/${proposalId}/evaluations_performed`
        };
        break;

      case AppEventType.PROPOSAL_CORRECTION_UPLOADED:
        baseMessage = {
          type: NotificationType.INFO,
          title: 'Correcciones de propuesta subidas',
          message: `El director ha subido un nuevo documento con correcciones para la propuesta: "${proposalTitle}"`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/proposal/details/${proposalId}` // Ajusta esta ruta si tienes una pestaña específica de documentos en propuestas
        };
        break;

      case AppEventType.PROPOSAL_DEADLINE_WARNING:
        baseMessage = {
          type: NotificationType.SECURITY,
          title: 'Recordatorio de evaluación',
          message: `Atención: Faltan ${payload?.daysLeft} días para el vencimiento del plazo de evaluación de la propuesta "${proposalTitle}".`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/proposal/details/${proposalId}`
        };
        break;

      case AppEventType.PROPOSAL_DEADLINE_EXPIRED:
        baseMessage = {
          type: NotificationType.ERROR,
          title: 'Plazo vencido',
          message: `El plazo para evaluar la propuesta "${proposalTitle}" ha expirado.`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/proposal/details/${proposalId}`
        };
        break;

      // ==========================================
      // --- EVENTOS DE ANTEPROYECTO ---
      // ==========================================
      case AppEventType.PRELIMINARY_DRAFT_CREATED:
        baseMessage = {
          type: NotificationType.INFO,
          title: 'Nuevo anteproyecto registrado',
          message: `El director ha radicado el anteproyecto: "${draftTitle}" para la asignación de evaluadores.`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/preliminary-draft/details/${draftId}`
        };
        break;

      case AppEventType.REVIEWERS_ASSIGNED:
        baseMessage = {
          type: NotificationType.INFO,
          title: 'Asignación de evaluadores',
          message: `El jefe de departamento te ha asignado como evaluador del anteproyecto: "${draftTitle}"`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/preliminary-draft/details/${draftId}/loaded_documents`
        };
        break;

      case AppEventType.PRELIMINARY_DRAFT_EVALUATION_REGISTERED:
        baseMessage = {
          type: NotificationType.CONFIRMATION,
          title: 'Evaluación de anteproyecto registrada',
          message: `Un evaluador ha registrado su evaluación para el anteproyecto "${draftTitle}". Veredicto: ${payload?.veredict}`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/preliminary-draft/details/${draftId}/evaluations_performed`
        };
        break;

      case AppEventType.PRELIMINARY_DRAFT_CORRECTION_UPLOADED:
        baseMessage = {
          type: NotificationType.INFO,
          title: 'Nuevas correcciones disponibles',
          message: `El director ha subido un nuevo documento con correcciones para el anteproyecto: "${draftTitle}"`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/preliminary-draft/details/${draftId}/loaded_documents`
        };
        break;

      case AppEventType.PRELIMINARY_DRAFT_COUNCIL_PRESENTATION_UPLOADED:
        baseMessage = {
          type: NotificationType.INFO,
          title: 'Presentación al Consejo',
          message: `Se ha radicado el Formato C para presentación al Consejo del anteproyecto: "${draftTitle}"`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/preliminary-draft/details/${draftId}/loaded_documents`
        };
        break;

      case AppEventType.COUNCIL_RESOLUTION_UPLOADED:
        baseMessage = {
          type: NotificationType.CONFIRMATION,
          title: 'Resolución de Consejo registrada',
          message: `El Consejo de Facultad ha registrado la resolución para el anteproyecto "${draftTitle}". Estado final: ${payload?.finalState}`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/preliminary-draft/details/${draftId}/evaluations_performed`
        };
        break;

      case AppEventType.PRELIMINARY_DRAFT_DEADLINE_WARNING:
        baseMessage = {
          type: NotificationType.SECURITY,
          title: 'Recordatorio de evaluación de anteproyecto',
          message: `Atención: Faltan ${payload?.daysLeft} días para el vencimiento del plazo de evaluación del anteproyecto "${draftTitle}".`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/preliminary-draft/details/${draftId}`
        };
        break;

      case AppEventType.PRELIMINARY_DRAFT_DEADLINE_EXPIRED:
        baseMessage = {
          type: NotificationType.ERROR,
          title: 'Plazo de anteproyecto vencido',
          message: `El plazo para evaluar el anteproyecto "${draftTitle}" ha expirado.`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/preliminary-draft/details/${draftId}`
        };
        break;

      // ==========================================
      // --- EVENTOS DE TRABAJO DE GRADO ---
      // ==========================================
      case AppEventType.THESIS_ADVANCE_UPLOADED:
        baseMessage = {
          type: NotificationType.INFO,
          title: 'Nuevo Avance Recibido',
          message: `El estudiante ha subido un avance en el trabajo de grado: "${thesisTitle}"`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/thesis-work/details/${thesisId}/loaded_documents` // Lo mantenemos en details a menos que los avances se listen en loaded_documents
        };
        break;

      case AppEventType.THESIS_ADVANCE_EVALUATED:
        baseMessage = {
          type: NotificationType.CONFIRMATION,
          title: 'Avance Evaluado',
          message: `El comité ha evaluado un avance en "${thesisTitle}". Estado: ${payload?.veredict}`,
          date: new Date(),
          status: 'no leido',
          // 🚀 Redirige a las evaluaciones realizadas
          actionUrl: `/thesis-work/details/${thesisId}/evaluations_performed`
        };
        break;

      case AppEventType.THESIS_FINAL_DELIVERY_UPLOADED:
        baseMessage = {
          type: NotificationType.INFO,
          title: 'Entrega Final Radicada',
          message: `El director ha subido los documentos de entrega final (Monografía, Formato E, Anexos) para: "${thesisTitle}"`,
          date: new Date(),
          status: 'no leido',
          // 🚀 Redirige a la pestaña de documentos
          actionUrl: `/thesis-work/details/${thesisId}/loaded_documents`
        };
        break;

      case AppEventType.THESIS_SUSTENTATION_PROGRAMMED:
        console.log('Payload de sustentación recibido:', payload);
        // 💡 Manejo seguro: Buscamos el ID de sustentación, si no existe, caemos en la vista de detalles
        const sustentationRoute = payload?.sustentationId
          ? `/thesis-work/details/${thesisId}/view_sustentation_details/${payload.sustentationId}`
          : `/thesis-work/details/${thesisId}`;

        baseMessage = {
          type: NotificationType.INFO,
          title: 'Sustentación Programada',
          message: `Se ha asignado fecha y jurados para la sustentación del trabajo de grado: "${thesisTitle}"`,
          date: new Date(),
          status: 'no leido',
          actionUrl: sustentationRoute
        };
        break;

      case AppEventType.THESIS_VERDICT_REGISTERED:
        // 💡 Manejo seguro: Buscamos el ID de sustentación para ir a la vista detallada
        const verdictRoute = payload?.sustentationId
          ? `/thesis-work/details/${thesisId}/view_sustentation_details/${payload.sustentationId}`
          : `/thesis-work/details/${thesisId}`;

        baseMessage = {
          type: NotificationType.CONFIRMATION,
          title: 'Veredicto de Sustentación',
          message: `Un jurado ha registrado su evaluación para "${thesisTitle}". Veredicto: ${payload?.veredict}`,
          date: new Date(),
          status: 'no leido',
          // 🚀 Redirige directamente a la página exclusiva de detalles de sustentación
          actionUrl: verdictRoute
        };
        break;

      case AppEventType.SPECIAL_REQUEST_CREATED:
        baseMessage = {
          type: NotificationType.INFO,
          title: 'Nueva Solicitud Especial',
          message: `Se ha radicado una solicitud de tipo [${payload?.type || 'General'}] para el trabajo de grado: "${thesisTitle}"`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/thesis-work/details/${thesisId}`
        };
        break;

      case AppEventType.SPECIAL_REQUEST_RESOLVED:
        baseMessage = {
          type: NotificationType.CONFIRMATION,
          title: 'Resolución de Solicitud Especial',
          message: `El comité ha respondido a la solicitud especial de "${thesisTitle}". Estado: ${payload?.status}`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/thesis-work/details/${thesisId}`
        };
        break;

      case AppEventType.THESIS_PAZ_Y_SALVO_REGISTERED:
        baseMessage = {
          type: payload?.isApproved ? NotificationType.CONFIRMATION : NotificationType.ERROR,
          title: 'Paz y Salvo Registrado',
          message: `Se ha registrado el Paz y Salvo para "${thesisTitle}". Estado: ${payload?.isApproved ? 'Aprobado' : 'No Aprobado'}`,
          date: new Date(),
          status: 'no leido',
          // 🚀 Suele revisarse en los documentos cargados
          actionUrl: `/thesis-work/details/${thesisId}/loaded_documents`
        };
        break;

      case AppEventType.THESIS_CORRESPONDENCE_REGISTERED:
        baseMessage = {
          type: NotificationType.INFO,
          title: 'Correspondencia Registrada',
          message: `Se ha radicado el documento de correspondencia final para: "${thesisTitle}"`,
          date: new Date(),
          status: 'no leido',
          // 🚀 Redirige a la pestaña de documentos
          actionUrl: `/thesis-work/details/${thesisId}/loaded_documents`
        };
        break;

      case AppEventType.THESIS_CORRECTED_DOCUMENTS_UPLOADED:
        baseMessage = {
          type: NotificationType.INFO,
          title: 'Nuevas Correcciones Subidas',
          message: `El director ha subido las correcciones correspondientes al trabajo de grado: "${thesisTitle}"`,
          date: new Date(),
          status: 'no leido',
          // 🚀 Redirige a tu ruta aplanada de correcciones
          actionUrl: `/thesis-work/details/${thesisId}/corrected_documents`
        };
        break;

      case AppEventType.THESIS_CORRECTED_DOCUMENTS_EVALUATED:
        baseMessage = {
          type: NotificationType.CONFIRMATION,
          title: 'Correcciones Evaluadas',
          message: `Un jurado ha evaluado las correcciones de "${thesisTitle}". Veredicto: ${payload?.veredict}`,
          date: new Date(),
          status: 'no leido',
          // 🚀 Redirige a las correcciones para ver los comentarios
          actionUrl: `/thesis-work/details/${thesisId}/corrected_documents`
        };
        break;

      case AppEventType.THESIS_DEADLINE_WARNING:
        baseMessage = {
          type: NotificationType.SECURITY,
          title: 'Recordatorio de Entrega Final',
          message: `Faltan ${payload?.daysLeft} días para la entrega final del trabajo: "${thesisTitle}".`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/thesis-work/details/${thesisId}`
        };
        break;

      case AppEventType.THESIS_DEADLINE_EXPIRED:
        baseMessage = {
          type: NotificationType.ERROR,
          title: 'Plazo de Entrega Vencido',
          message: `El plazo para la entrega final del trabajo "${thesisTitle}" ha expirado.`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/thesis-work/details/${thesisId}`
        };
        break;
    }

    if (baseMessage) {
      const newMessages: InboxMessage[] = targets.map((userId: string) => ({
        ...baseMessage!,
        id: crypto.randomUUID(),
        userId: userId
      }));
      this.inboxState.addMessages(newMessages);

      const currentUser = this.authService.currentUser();
      if (currentUser && targets.includes(currentUser.id)) {
        this.notificationService.show({
          type: baseMessage.type as NotificationType,
          title: baseMessage.title,
          message: baseMessage.message,
          autoDismiss: true
        });
      }
    }
  }
}
