import { inject, Injectable } from '@angular/core';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisFinalDeliveryDocumentResolverService } from '../../../services/thesis-final-delivery-document-resolver.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';

@Injectable()
export class RegisterPazYSalvoFormService {
  private readonly notificationService = inject(NotificationService);
  private readonly participants = inject(ThesisParticipantsFormatterService);
  private readonly documentResolver = inject(ThesisFinalDeliveryDocumentResolverService);

  getStudentNames(thesisWork: ThesisWork): string { return this.participants.getStudentNames(thesisWork); }
  getDirectorName(thesisWork: ThesisWork): string { return this.participants.getDirectorName(thesisWork); }
  getCodirectorName(thesisWork: ThesisWork): string { return this.participants.getCodirectorName(thesisWork); }
  getAdvisorName(thesisWork: ThesisWork): string { return this.participants.getAdvisorName(thesisWork); }

  getExistingDocument(thesisWork: ThesisWork, type: string): FileDocument | null {
    const targetType = type.toUpperCase().trim();
    const normalizedType = targetType === 'FORMATO' ? 'FORMATO_E' : targetType;

    if (normalizedType === 'MONOGRAFIA' || normalizedType === 'FORMATO_E' || normalizedType === 'ANEXOS') {
      return this.documentResolver.resolveLatestFinalDeliveryDocument(thesisWork, normalizedType);
    }
    return null;
  }

  notifyFileAttached(fileName: string): void {
    this.notificationService.show({
      title: 'Archivo adjunto',
      message: `El documento ${fileName} se ha adjuntado correctamente.`,
      type: NotificationType.INFO
    });
  }

  notifyMissingEvaluations(): void {
    this.notificationService.show({
      title: 'Faltan evaluaciones',
      message: 'Debe marcar si cumple o no cumple en ambas revisiones (Académica y Financiera).',
      type: NotificationType.ERROR
    });
  }

  notifyMissingDocument(): void {
    this.notificationService.show({
      title: 'Documento faltante',
      message: 'Debe adjuntar obligatoriamente el Formato de Paz y Salvo firmado.',
      type: NotificationType.ERROR
    });
  }
}
