import { inject, Injectable } from '@angular/core';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';

@Injectable()
export class UploadFinalDeliveryFormService {
  private readonly notificationService = inject(NotificationService);
  private readonly participants = inject(ThesisParticipantsFormatterService);

  getStudentNames(thesisWork: ThesisWork): string {
    return this.participants.getStudentNames(thesisWork);
  }

  getDirectorName(thesisWork: ThesisWork): string {
    return this.participants.getDirectorName(thesisWork);
  }

  getCodirectorName(thesisWork: ThesisWork): string {
    return this.participants.getCodirectorName(thesisWork);
  }

  getAdvisorName(thesisWork: ThesisWork): string {
    return this.participants.getAdvisorName(thesisWork);
  }

  notifyFileAttached(fileName: string): void {
    this.notificationService.show({
      title: 'Archivo adjunto',
      message: `El documento ${fileName} se ha adjuntado correctamente.`,
      type: NotificationType.INFO
    });
  }

  notifyMissingDocuments(): void {
    this.notificationService.show({
      title: 'Documentos faltantes',
      message: 'Debe adjuntar obligatoriamente la Monografía, el Formato_E y los Anexos para poder continuar.',
      type: NotificationType.ERROR
    });
  }
}
