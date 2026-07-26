import { inject, Injectable } from '@angular/core';
import { UserService } from '../../../../users/services/user.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';

@Injectable()
export class RegisterPazYSalvoFormService {
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

  notifyMissingEvaluations(): void {
    this.notificationService.show({
      title:   'Faltan evaluaciones',
      message: 'Debe marcar si cumple o no cumple en ambas revisiones (Académica y Financiera).',
      type:    NotificationType.ERROR
    });
  }

  notifyMissingDocument(): void {
    this.notificationService.show({
      title:   'Documento faltante',
      message: 'Debe adjuntar obligatoriamente el Formato de Paz y Salvo firmado.',
      type:    NotificationType.ERROR
    });
  }
}
