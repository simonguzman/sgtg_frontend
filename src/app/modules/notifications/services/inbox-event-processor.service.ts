import { inject, Injectable } from '@angular/core';
import { AppEvent, AppEventType, EventBusService } from '../../../core/services/eventbus/event-bus.service';
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
    const payload = event.payload;

    // Extracción segura y jerárquica de títulos según el modelo de datos provisto
    const proposalTitle = payload?.title || payload?.proposalTitle || '';
    const draftTitle = payload?.proposalData?.title || payload?.draftTitle || proposalTitle;
    const thesisTitle = payload?.preliminaryDraftData?.proposalData?.title || payload?.thesisTitle || draftTitle;

    switch (event.type) {
      // ==========================================
      // --- EVENTOS DE PROPUESTA ---
      // ==========================================
      case AppEventType.PROPOSAL_CREATED:
        baseMessage = {
          type: NotificationType.INFO,
          title: 'Nueva Propuesta Registrada',
          message: `El director ha registrado la propuesta: "${proposalTitle}"`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/proposal/details/${payload.id}`
        };
        break;

      case AppEventType.EVALUATION_ASSIGNED:
        baseMessage = {
          type: NotificationType.CONFIRMATION,
          title: 'Evaluación Registrada',
          message: `El comité ha emitido un veredicto para la propuesta "${proposalTitle}": ${payload.veredict}`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/proposal/details/${payload.proposalId}/evaluations_performed`
        };
        break;

      case AppEventType.PROPOSAL_DEADLINE_WARNING:
        baseMessage = {
          type: NotificationType.SECURITY, // Naranja/Advertencia
          title: 'Recordatorio de Evaluación',
          message: `Atención: Faltan ${payload.daysLeft} días para el cierre de evaluación de la propuesta "${proposalTitle}".`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/proposal/details/${payload.proposalId}`
        };
        break;

      case AppEventType.PROPOSAL_DEADLINE_EXPIRED:
        baseMessage = {
          type: NotificationType.ERROR, // Rojo/Vencido
          title: 'Plazo Vencido',
          message: `El plazo para evaluar la propuesta "${proposalTitle}" ha expirado.`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/proposal/details/${payload.proposalId}`
        };
        break;

      // ==========================================
      // --- EVENTOS DE ANTEPROYECTO ---
      // ==========================================
      case AppEventType.PRELIMINARY_DRAFT_CREATED:
        baseMessage = {
          type: NotificationType.INFO,
          title: 'Nuevo Anteproyecto Registrado',
          message: `El director ha radicado el anteproyecto: "${draftTitle}" para revisión del comité.`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/preliminary-draft/details/${payload.id}`
        };
        break;

      case AppEventType.REVIEWERS_ASSIGNED:
        baseMessage = {
          type: NotificationType.INFO,
          title: 'Asignación de Jurados',
          message: `El comité te ha asignado como evaluador del anteproyecto: "${draftTitle}"`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/preliminary-draft/details/${payload.draftId}/loaded_documents/review_preliminary_draft`
        };
        break;

      case AppEventType.DOCUMENT_CORRECTION_UPLOADED:
        baseMessage = {
          type: NotificationType.INFO,
          title: 'Nuevas Correcciones Disponibles',
          message: `El director ha subido un nuevo documento de correcciones para el anteproyecto: "${draftTitle}"`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/preliminary-draft/details/${payload.draftId}/loaded_documents`
        };
        break;

      case AppEventType.COUNCIL_RESOLUTION_UPLOADED:
        baseMessage = {
          type: NotificationType.CONFIRMATION,
          title: 'Resolución de Consejo Emitida',
          message: `El Consejo de Facultad ha emitido el veredicto final para "${draftTitle}": ${payload.finalState}`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/preliminary-draft/details/${payload.draftId}/evaluations_performed`
        };
        break;

      case AppEventType.PRELIMINARY_DRAFT_DEADLINE_WARNING:
        baseMessage = {
          type: NotificationType.SECURITY, // Naranja/Advertencia
          title: 'Recordatorio de Evaluación de Anteproyecto',
          message: `Atención: Faltan ${payload.daysLeft} días para el cierre de evaluación del anteproyecto "${payload.preliminaryDraftTitle}".`,
          date: new Date(),
          status: 'no leido',
          // Ajusta esta ruta a donde vean el detalle del anteproyecto
          actionUrl: `/preliminary-draft/details/${payload.preliminaryDraftId}`
        };
        break;

      case AppEventType.PRELIMINARY_DRAFT_DEADLINE_EXPIRED:
        baseMessage = {
          type: NotificationType.ERROR, // Rojo/Vencido
          title: 'Plazo de Anteproyecto Vencido',
          message: `El plazo para evaluar el anteproyecto "${payload.preliminaryDraftTitle}" ha expirado.`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/preliminary-draft/details/${payload.preliminaryDraftId}`
        };
        break;

      // ==========================================
      // --- EVENTOS DE TRABAJO DE GRADO ---
      // ==========================================
      case AppEventType.THESIS_ADVANCE_UPLOADED:
        baseMessage = {
          type: NotificationType.INFO,
          title: 'Nuevo Avance Recibido',
          message: `El estudiante ha subido el avance "${payload.title}" en el trabajo de grado: "${thesisTitle}"`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/thesis-work/details/${payload.thesisId}/loaded_documents`
        };
        break;

      case AppEventType.THESIS_ADVANCE_EVALUATED:
        baseMessage = {
          type: NotificationType.CONFIRMATION,
          title: 'Avance Evaluado',
          message: `El comité ha evaluado un avance en "${thesisTitle}". Estado: ${payload.veredict}`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/thesis-work/details/${payload.thesisId}/evaluations_performed`
        };
        break;

      case AppEventType.THESIS_FINAL_DELIVERY_UPLOADED:
        baseMessage = {
          type: NotificationType.INFO,
          title: 'Entrega Final Radicada',
          message: `El director ha subido los documentos de entrega final (Monografía, Formato E, Anexos) para: "${thesisTitle}"`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/thesis-work/details/${payload.thesisId}/loaded_documents`
        };
        break;

      case AppEventType.THESIS_SUSTENTATION_PROGRAMMED:
        baseMessage = {
          type: NotificationType.INFO,
          title: 'Sustentación Programada',
          message: `Se ha asignado fecha y jurados para la sustentación del trabajo de grado: "${thesisTitle}"`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/thesis-work/details/${payload.thesisId}/view_sustentation_details/${payload.sustentationId}`
        };
        break;

      case AppEventType.THESIS_VERDICT_REGISTERED:
        baseMessage = {
          type: NotificationType.CONFIRMATION,
          title: 'Veredicto de Sustentación',
          message: `Un jurado ha registrado su evaluación (Formato G) para "${thesisTitle}". Veredicto: ${payload.veredict}`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/thesis-work/details/${payload.thesisId}/evaluations_performed`
        };
        break;

      case AppEventType.SPECIAL_REQUEST_CREATED:
        baseMessage = {
          type: NotificationType.INFO,
          title: 'Nueva Solicitud Especial',
          message: `Se ha radicado una solicitud de tipo [${payload.type}] para el trabajo de grado: "${thesisTitle}"`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/thesis-work/details/${payload.thesisWorkId}/evaluate_special_request/${payload.requestId}`
        };
        break;

      case AppEventType.SPECIAL_REQUEST_RESOLVED:
        baseMessage = {
          type: NotificationType.CONFIRMATION,
          title: 'Resolución de Solicitud Especial',
          message: `El comité ha respondido a la solicitud especial de "${thesisTitle}". Estado: ${payload.status}`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/thesis-work/details/${payload.thesisWorkId}`
        };
        break;

      case AppEventType.THESIS_PAZ_Y_SALVO_REGISTERED:
        baseMessage = {
          type: payload.isApproved ? NotificationType.CONFIRMATION : NotificationType.ERROR,
          title: 'Paz y Salvo Registrado',
          message: `Se ha registrado el Paz y Salvo para "${thesisTitle}". Estado: ${payload.isApproved ? 'Aprobado' : 'No Aprobado'}`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/thesis-work/details/${payload.thesisId}/loaded_documents`
        };
        break;

      case AppEventType.THESIS_CORRESPONDENCE_REGISTERED:
        baseMessage = {
          type: NotificationType.INFO,
          title: 'Correspondencia Registrada',
          message: `Se ha radicado el documento de correspondencia final para: "${thesisTitle}"`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/thesis-work/details/${payload.thesisId}/loaded_documents`
        };
        break;

      case AppEventType.THESIS_CORRECTED_DOCUMENTS_UPLOADED:
        baseMessage = {
          type: NotificationType.INFO,
          title: 'Nuevas Correcciones Subidas',
          message: `El director ha subido las correcciones correspondientes al trabajo de grado: "${thesisTitle}"`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/thesis-work/details/${payload.thesisId}/corrected_documents`
        };
        break;

      case AppEventType.THESIS_CORRECTED_DOCUMENTS_EVALUATED:
        baseMessage = {
          type: NotificationType.CONFIRMATION,
          title: 'Correcciones Evaluadas',
          message: `Un jurado ha evaluado las correcciones de "${thesisTitle}". Veredicto: ${payload.veredict}`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/thesis-work/details/${payload.thesisId}/evaluations_performed`
        };
        break;
      case AppEventType.THESIS_DEADLINE_WARNING:
        baseMessage = {
          type: NotificationType.SECURITY,
          title: 'Recordatorio de Entrega Final',
          message: `Faltan ${payload.daysLeft} días para la entrega final del trabajo: "${payload.thesisTitle}".`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/thesis-work/details/${payload.thesisId}`
        };
        break;

      case AppEventType.THESIS_DEADLINE_EXPIRED:
        baseMessage = {
          type: NotificationType.ERROR,
          title: 'Plazo de Entrega Vencido',
          message: `El plazo para la entrega final del trabajo "${payload.thesisTitle}" ha expirado.`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/thesis-work/details/${payload.thesisId}`
        };
        break;
    }

    if (baseMessage) {
      const newMessages: InboxMessage[] = targets.map(userId => ({
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
