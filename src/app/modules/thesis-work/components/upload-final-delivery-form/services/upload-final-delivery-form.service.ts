import { inject, Injectable } from '@angular/core';
import { UserService } from '../../../../users/services/user.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';

@Injectable()
export class UploadFinalDeliveryFormService {
  private readonly userService         = inject(UserService);
  private readonly notificationService = inject(NotificationService);

  getStudentNames(thesisWork: ThesisWork): string {
    return this.userService.getAuthorsNames(
      thesisWork?.preliminaryDraftData?.proposalData?.authors ?? []
    );
  }

  getMemberName(id: string | undefined): string {
    return id ? this.userService.getUserFullName(id) : '';
  }

  notifyFileAttached(fileName: string): void {
    this.notificationService.show({
      title:   'Archivo adjunto',
      message: `El documento ${fileName} se ha adjuntado correctamente.`,
      type:    NotificationType.INFO
    });
  }

  notifyMissingDocuments(): void {
    this.notificationService.show({
      title:   'Documentos faltantes',
      message: 'Debe adjuntar obligatoriamente la Monografía, el Formato_E y los Anexos para poder continuar.',
      type:    NotificationType.ERROR
    });
  }
}
