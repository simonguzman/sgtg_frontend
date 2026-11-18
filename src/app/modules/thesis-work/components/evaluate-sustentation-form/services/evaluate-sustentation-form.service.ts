import { inject, Injectable } from '@angular/core';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisFinalDeliveryDocumentResolverService } from '../../../services/thesis-final-delivery-document-resolver.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SustentationRegistry } from '../../../interfaces/sustentation-registry.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';

/** Datos y avisos del formulario de calificación de la sustentación. */
@Injectable()
export class EvaluateSustentationFormService {
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
  /** Jurados asignados a la sesión de sustentación actual. */
  getAssignedJurors(sustentation: SustentationRegistry | null): string {
    return this.participants.getAssignedJurors(sustentation);
  }

  /** Documento del trabajo del tipo indicado, o null. */
  getExistingDocument(thesisWork: ThesisWork, type: string): FileDocument | null {
    const targetType = type.toUpperCase().trim();
    if (targetType === 'MONOGRAFIA' || targetType === 'ANEXOS') {
      return this.documentResolver.resolveLatestFinalDeliveryDocument(thesisWork, targetType);
    }
    return null;
  }

  /** Muestra el aviso «Archivo adjunto». */
  notifyFileAttached(fileName: string): void {
    this.notificationService.show({
      title: 'Archivo adjunto',
      message: `El acta de sustentación ${fileName} se ha adjuntado correctamente.`,
      type: NotificationType.INFO
    });
  }

  /** Muestra el aviso «Falta calificación». */
  notifyMissingVerdict(): void {
    this.notificationService.show({
      title: 'Falta calificación',
      message: 'Debe seleccionar obligatoriamente una calificación para la sustentación.',
      type: NotificationType.ERROR
    });
  }

  /** Muestra el aviso «Observaciones requeridas». */
  notifyMissingObservations(): void {
    this.notificationService.show({
      title: 'Observaciones requeridas',
      message: 'Las observaciones son obligatorias si la sustentación no se aprueba o se registra la inasistencia.',
      type: NotificationType.ERROR
    });
  }

  /** Muestra el aviso «Formato faltante». */
  notifyMissingFile(): void {
    this.notificationService.show({
      title: 'Formato faltante',
      message: 'Debe adjuntar obligatoriamente el Formato de Sustentación con los resultados firmados.',
      type: NotificationType.ERROR
    });
  }
}
