import { inject, Injectable } from '@angular/core';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisFinalDeliveryDocumentResolverService } from '../../../services/thesis-final-delivery-document-resolver.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SustentationRegistry } from '../../../interfaces/sustentation-registry.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';

@Injectable()
export class EvaluateSustentationFormService {
  private readonly notificationService = inject(NotificationService);
  // ← UserService eliminado: los tres métodos que lo usaban tienen
  // equivalentes exactos en el formateador compartido.
  private readonly participants        = inject(ThesisParticipantsFormatterService);
  private readonly documentResolver    = inject(ThesisFinalDeliveryDocumentResolverService);

  getStudentNames(thesisWork: ThesisWork): string   { return this.participants.getStudentNames(thesisWork); }
  getDirectorName(thesisWork: ThesisWork): string   { return this.participants.getDirectorName(thesisWork); }
  getCodirectorName(thesisWork: ThesisWork): string { return this.participants.getCodirectorName(thesisWork); }
  getAdvisorName(thesisWork: ThesisWork): string     { return this.participants.getAdvisorName(thesisWork); }
  getAssignedJurors(sustentation: SustentationRegistry | null): string {
    return this.participants.getAssignedJurors(sustentation);
  }

  getExistingDocument(thesisWork: ThesisWork, type: string): FileDocument | null {
    const targetType = type.toUpperCase().trim();
    if (targetType === 'MONOGRAFIA' || targetType === 'ANEXOS') {
      return this.documentResolver.resolveLatestFinalDeliveryDocument(thesisWork, targetType);
    }
    return null;
  }

  notifyFileAttached(fileName: string): void {
    this.notificationService.show({
      title:   'Archivo adjunto',
      message: `El acta de sustentación ${fileName} se ha adjuntado correctamente.`,
      type:    NotificationType.INFO
    });
  }

  notifyMissingVerdict(): void {
    this.notificationService.show({
      title:   'Falta calificación',
      message: 'Debe seleccionar obligatoriamente una calificación para la sustentación.',
      type:    NotificationType.ERROR
    });
  }

  notifyMissingFile(): void {
    this.notificationService.show({
      title:   'Formato faltante',
      message: 'Debe adjuntar obligatoriamente el Formato de Sustentación con los resultados firmados.',
      type:    NotificationType.ERROR
    });
  }
}
