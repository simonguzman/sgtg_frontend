import { inject, Injectable } from '@angular/core';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';

@Injectable()
export class EvaluateSpecialRequestFormService {
  private readonly notificationService = inject(NotificationService);
  private readonly participants        = inject(ThesisParticipantsFormatterService);

  getStudentNames(thesisWork: ThesisWork): string   { return this.participants.getStudentNames(thesisWork); }
  getDirectorName(thesisWork: ThesisWork): string   { return this.participants.getDirectorName(thesisWork); }
  getCodirectorName(thesisWork: ThesisWork): string { return this.participants.getCodirectorName(thesisWork); }
  getAdvisorName(thesisWork: ThesisWork): string     { return this.participants.getAdvisorName(thesisWork); }

  notifyMissingVerdict(): void {
    this.notificationService.show({
      title:   'Falta calificación',
      message: 'Debe seleccionar si la solicitud cumple o no con los requisitos.',
      type:    NotificationType.ERROR
    });
  }

  notifyMissingDeadline(): void {
    this.notificationService.show({
      title:   'Fecha requerida',
      message: 'Debe asignar la nueva fecha límite de entrega para autorizar la solicitud.',
      type:    NotificationType.ERROR
    });
  }
}
