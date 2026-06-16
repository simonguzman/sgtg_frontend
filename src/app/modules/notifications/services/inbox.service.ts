import { inject, Injectable, signal } from '@angular/core';
import { AppEvent, AppEventType, EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { InboxMessage } from '../interfaces/inbox-message.interface';
import { NotificationType } from '../../../shared/components/notifications/models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class InboxService {
  private readonly eventBus = inject(EventBusService);

  private readonly _messages = signal<InboxMessage[]>([]);
  public readonly messages = this._messages.asReadonly();

  constructor(){
    this.listenToSystemEvents();
  }

  private listenToSystemEvents(){
    this.eventBus.events$.subscribe(event => {
      this.processSystemEvent(event);
    });
  }

  private processSystemEvent(event: AppEvent){
    let newMessage: InboxMessage | null = null;
    switch(event.type){
      // --- Eventos de Propuesta ---
      case AppEventType.PROPOSAL_CREATED:
        newMessage = {
          id: crypto.randomUUID(),
          type: NotificationType.INFO,
          title: 'Nueva Propuesta Registrada',
          message: `El estudiante ha registrado la propuesta: ${event.payload.title}`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/proposal/details/${event.payload.id}`
        };
      break;
      case AppEventType.EVALUATION_ASSIGNED:
        newMessage = {
          id: crypto.randomUUID(),
          type: NotificationType.CONFIRMATION,
          title: 'Evaluación registrada',
          message: `El comité ha emitido un veredicto: ${event.payload.veredict}`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/proposal/details/${event.payload.proposalId}`
        };
      break;

      // --- Eventos de Anteproyecto ---
      case AppEventType.PRELIMINARY_DRAFT_CREATED:
        newMessage = {
          id: crypto.randomUUID(),
          type: NotificationType.INFO,
          title: 'Nuevo Anteproyecto Registrado',
          message: 'Se ha radicado un nuevo anteproyecto en el sistema para revisión.',
          date: new Date(),
          status: 'no leido',
          actionUrl: `/preliminary-draft/details/${event.payload.id}`
        };
      break;
      case AppEventType.REVIEWERS_ASSIGNED:
        newMessage = {
          id: crypto.randomUUID(),
          type: NotificationType.INFO,
          title: 'Asignación de Jurados',
          message: 'El comité te ha asignado como evaluador de un nuevo anteproyecto.',
          date: new Date(),
          status: 'no leido',
          actionUrl: `/preliminary-draft/details/${event.payload.draftId}`
        };
      break;
      case AppEventType.DOCUMENT_CORRECTION_UPLOADED:
        newMessage = {
          id: crypto.randomUUID(),
          type: NotificationType.INFO,
          title: 'Nuevas Correcciones Disponibles',
          message: 'El estudiante ha subido un nuevo documento de correcciones para su anteproyecto.',
          date: new Date(),
          status: 'no leido',
          actionUrl: `/preliminary-draft/details/${event.payload.draftId}`
        };
      break;
      case AppEventType.COUNCIL_RESOLUTION_UPLOADED:
        newMessage = {
          id: crypto.randomUUID(),
          type: NotificationType.CONFIRMATION,
          title: 'Resolución de Consejo Emitida',
          message: `El Consejo de Facultad ha emitido el veredicto final: ${event.payload.finalState}`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/preliminary-draft/details/${event.payload.draftId}`
        };
      break;

      // --- Eventos de Trabajo de Grado ---
      case AppEventType.THESIS_ADVANCE_UPLOADED:
        newMessage = {
          id: crypto.randomUUID(),
          type: NotificationType.INFO,
          title: 'Nuevo Avance Recibido',
          message: `Se ha subido el avance: ${event.payload.title}`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/thesis-work/details/${event.payload.thesisId}`
        };
      break;
      case AppEventType.THESIS_ADVANCE_EVALUATED:
        newMessage = {
          id: crypto.randomUUID(),
          type: NotificationType.CONFIRMATION,
          title: 'Avance Evaluado',
          message: `El comité ha evaluado un avance. Estado: ${event.payload.veredict}`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/thesis-work/details/${event.payload.thesisId}`
        };
      break;
      case AppEventType.THESIS_FINAL_DELIVERY_UPLOADED:
        newMessage = {
          id: crypto.randomUUID(),
          type: NotificationType.INFO,
          title: 'Entrega Final Radicada',
          message: 'El estudiante ha subido los documentos de entrega final (Monografía, Formato E, Anexos).',
          date: new Date(),
          status: 'no leido',
          actionUrl: `/thesis-work/details/${event.payload.thesisId}`
        };
      break;
      case AppEventType.THESIS_SUSTENTATION_PROGRAMMED:
        newMessage = {
          id: crypto.randomUUID(),
          type: NotificationType.INFO,
          title: 'Sustentación Programada',
          message: 'Se ha asignado fecha y jurados para la sustentación del Trabajo de Grado.',
          date: new Date(),
          status: 'no leido',
          actionUrl: `/thesis-work/details/${event.payload.thesisId}`
        };
      break;
      case AppEventType.THESIS_VERDICT_REGISTERED:
        newMessage = {
          id: crypto.randomUUID(),
          type: NotificationType.CONFIRMATION,
          title: 'Veredicto de Sustentación',
          message: `Un jurado ha registrado su evaluación (Formato G). Veredicto: ${event.payload.veredict}`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/thesis-work/details/${event.payload.thesisId}`
        };
      break;
      case AppEventType.SPECIAL_REQUEST_CREATED:
        newMessage = {
          id: crypto.randomUUID(),
          type: NotificationType.INFO,
          title: 'Nueva Solicitud Especial',
          message: `Se ha radicado una solicitud de tipo: ${event.payload.type}`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/thesis-work/details/${event.payload.thesisId}`
        };
      break;
      case AppEventType.SPECIAL_REQUEST_RESOLVED:
        newMessage = {
          id: crypto.randomUUID(),
          type: NotificationType.CONFIRMATION,
          title: 'Resolución de Solicitud Especial',
          message: `El comité ha respondido a la solicitud especial. Estado: ${event.payload.status}`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/thesis-work/details/${event.payload.thesisId}`
        };
      break;

      // --- Nuevos Eventos de Cierre y Correcciones ---
      case AppEventType.THESIS_PAZ_Y_SALVO_REGISTERED:
        newMessage = {
          id: crypto.randomUUID(),
          type: event.payload.isApproved ? NotificationType.CONFIRMATION : NotificationType.ERROR ,
          title: 'Paz y Salvo Registrado',
          message: `Se ha registrado el Paz y Salvo. Estado: ${event.payload.isApproved ? 'Aprobado' : 'No Aprobado'}`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/thesis-work/details/${event.payload.thesisId}`
        };
      break;
      case AppEventType.THESIS_CORRESPONDENCE_REGISTERED:
        newMessage = {
          id: crypto.randomUUID(),
          type: NotificationType.INFO,
          title: 'Correspondencia Registrada',
          message: 'Se ha radicado el documento de correspondencia final.',
          date: new Date(),
          status: 'no leido',
          actionUrl: `/thesis-work/details/${event.payload.thesisId}`
        };
      break;
      case AppEventType.THESIS_CORRECTED_DOCUMENTS_UPLOADED:
        newMessage = {
          id: crypto.randomUUID(),
          type: NotificationType.INFO,
          title: 'Nuevas Correcciones Subidas',
          message: 'El estudiante ha subido las correcciones correspondientes a su trabajo de grado.',
          date: new Date(),
          status: 'no leido',
          actionUrl: `/thesis-work/details/${event.payload.thesisId}`
        };
      break;
      case AppEventType.THESIS_CORRECTED_DOCUMENTS_EVALUATED:
        newMessage = {
          id: crypto.randomUUID(),
          type: NotificationType.CONFIRMATION,
          title: 'Correcciones Evaluadas',
          message: `Un jurado ha evaluado las correcciones subidas. Veredicto: ${event.payload.veredict}`,
          date: new Date(),
          status: 'no leido',
          actionUrl: `/thesis-work/details/${event.payload.thesisId}`
        };
      break;
    }
    if (newMessage) {
      this._messages.update(previousMessage => [newMessage!, ...previousMessage]);
    }
  }

  public markAsRead(id: string): void{
    this._messages.update(messages =>
      messages.map(message =>
        message.id === id ? {...message, status: 'leido'} : message
      )
    );
  }
}
