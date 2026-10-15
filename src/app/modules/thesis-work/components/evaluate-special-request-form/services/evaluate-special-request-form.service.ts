import { inject, Injectable } from '@angular/core';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';

@Injectable()
export class EvaluateSpecialRequestFormService {
  private readonly notificationService = inject(NotificationService);
  private readonly participants = inject(ThesisParticipantsFormatterService);

  getStudentNames(thesisWork: ThesisWork): string { return this.participants.getStudentNames(thesisWork); }
  getDirectorName(thesisWork: ThesisWork): string { return this.participants.getDirectorName(thesisWork); }
  getCodirectorName(thesisWork: ThesisWork): string { return this.participants.getCodirectorName(thesisWork); }
  getAdvisorName(thesisWork: ThesisWork): string { return this.participants.getAdvisorName(thesisWork); }

  notifyMissingVerdict(): void {
    this.notificationService.show({
      title: 'Falta la decisión',
      message: 'Debe seleccionar si la solicitud se aprueba o no se aprueba.',
      type: NotificationType.ERROR
    });
  }

  notifyMissingNewDate(): void {
    this.notificationService.show({
      title: 'Nueva fecha requerida',
      message: 'Para aprobar la solicitud indique la nueva fecha y hora de la sesión de sustentación.',
      type: NotificationType.ERROR
    });
  }

  notifyMissingResolution(): void {
    this.notificationService.show({
      title: 'Resolución requerida',
      message: 'Debe adjuntar la resolución del Consejo de Facultad en PDF.',
      type: NotificationType.ERROR
    });
  }
}
