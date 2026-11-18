import { inject, Injectable } from '@angular/core';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import {
  FinalDeliveryDocType, ThesisFinalDeliveryDocumentResolverService
} from '../../../services/thesis-final-delivery-document-resolver.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';

/** Datos y avisos del formulario de revisión del paz y salvo. */
@Injectable()
export class ReviewPazYSalvoFormService {
  private readonly notificationService = inject(NotificationService);
  private readonly participants = inject(ThesisParticipantsFormatterService);
  private readonly documentResolver = inject(ThesisFinalDeliveryDocumentResolverService);

  /** Nombres de los estudiantes del trabajo. */
  getStudentNames(thesisWork: ThesisWork): string { return this.participants.getStudentNames(thesisWork); }
  /** Nombre del director. */
  getDirectorName(thesisWork: ThesisWork): string { return this.participants.getDirectorName(thesisWork); }
  /** Nombre del codirector, o vacío si no tiene. */
  getCodirectorName(thesisWork: ThesisWork): string { return this.participants.getCodirectorName(thesisWork); }
  /** Nombre del asesor, o vacío si no tiene. */
  getAdvisorName(thesisWork: ThesisWork): string { return this.participants.getAdvisorName(thesisWork); }

  /** Documento de la solicitud de sustentación (monografía, formato E o anexos). */
  getExistingDocument(thesisWork: ThesisWork, type: FinalDeliveryDocType): FileDocument | null {
    return this.documentResolver.resolveLatestFinalDeliveryDocument(thesisWork, type);
  }

  /** Muestra el aviso «Archivo adjunto». */
  notifyFileAttached(fileName: string): void {
    this.notificationService.show({
      title: 'Archivo adjunto',
      message: `El formato de paz y salvo ${fileName} se ha adjuntado correctamente.`,
      type: NotificationType.INFO
    });
  }

  /** Muestra el aviso «Falta la decisión». */
  notifyMissingDecision(): void {
    this.notificationService.show({
      title: 'Falta la decisión',
      message: 'Debe indicar si el estudiante está o no a paz y salvo.',
      type: NotificationType.ERROR
    });
  }

  /** Muestra el aviso «Observaciones requeridas». */
  notifyMissingObservations(): void {
    this.notificationService.show({
      title: 'Observaciones requeridas',
      message: 'Si el paz y salvo no se aprueba, las observaciones son obligatorias.',
      type: NotificationType.ERROR
    });
  }

  /** Muestra el aviso «Documento faltante». */
  notifyMissingDocument(): void {
    this.notificationService.show({
      title: 'Documento faltante',
      message: 'Debe adjuntar obligatoriamente el formato F (paz y salvo), lo apruebe o no.',
      type: NotificationType.ERROR
    });
  }
}
