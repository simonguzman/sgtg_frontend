import { inject, Injectable } from '@angular/core';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';

/** Datos y avisos del formulario de decisión de una solicitud especial. */
@Injectable()
export class EvaluateSpecialRequestFormService {
  private readonly notificationService = inject(NotificationService);
  private readonly participants = inject(ThesisParticipantsFormatterService);

  /** Nombres de los estudiantes del trabajo. */
  getStudentNames(thesisWork: ThesisWork): string { return this.participants.getStudentNames(thesisWork); }
  /** Nombre del director. */
  getDirectorName(thesisWork: ThesisWork): string { return this.participants.getDirectorName(thesisWork); }
  /** Nombre del codirector, o vacío si no tiene. */
  getCodirectorName(thesisWork: ThesisWork): string { return this.participants.getCodirectorName(thesisWork); }
  /** Nombre del asesor, o vacío si no tiene. */
  getAdvisorName(thesisWork: ThesisWork): string { return this.participants.getAdvisorName(thesisWork); }

  /** Muestra el aviso «Falta la decisión». */
  notifyMissingVerdict(): void {
    this.notificationService.show({
      title: 'Falta la decisión',
      message: 'Debe seleccionar si la solicitud se aprueba o no se aprueba.',
      type: NotificationType.ERROR
    });
  }

  /** Muestra el aviso «Nueva fecha requerida». */
  notifyMissingNewDate(): void {
    this.notificationService.show({
      title: 'Nueva fecha requerida',
      message: 'Para aprobar la solicitud indique la nueva fecha y hora de la sesión de sustentación.',
      type: NotificationType.ERROR
    });
  }

  /** Muestra el aviso «Observaciones requeridas». */
  notifyMissingObservations(): void {
    this.notificationService.show({
      title: 'Observaciones requeridas',
      message: 'Si el Comité considera no pertinente el cambio de título y objetivos, las observaciones son obligatorias.',
      type: NotificationType.ERROR
    });
  }

  /** Muestra el aviso «Resolución requerida». */
  notifyMissingResolution(): void {
    this.notificationService.show({
      title: 'Resolución requerida',
      message: 'Debe adjuntar la resolución del Consejo de Facultad en PDF.',
      type: NotificationType.ERROR
    });
  }
}
