import { inject, Injectable } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';

/** Máximo de caracteres de las observaciones de la revisión (igual que el backend). */
export const MAX_REVIEW_COMMENTS = 2000;

/** Datos y avisos del formulario de revisión de un informe mensual. */
@Injectable()
export class EvaluateAdvanceFormService {
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  private readonly participants = inject(ThesisParticipantsFormatterService);

  /** Observaciones del revisor (opcionales si adjunta el PDF de notas). */
  readonly evaluationForm = this.fb.nonNullable.group({
    comments: ['', Validators.maxLength(MAX_REVIEW_COMMENTS)]
  });

  /** Nombres de los estudiantes del trabajo. */
  getStudentNames(thesisWork: ThesisWork): string { return this.participants.getStudentNames(thesisWork); }
  /** Nombre del director. */
  getDirectorName(thesisWork: ThesisWork): string { return this.participants.getDirectorName(thesisWork); }
  /** Nombre del codirector, o vacío si no tiene. */
  getCodirectorName(thesisWork: ThesisWork): string { return this.participants.getCodirectorName(thesisWork); }
  /** Nombre del asesor, o vacío si no tiene. */
  getAdvisorName(thesisWork: ThesisWork): string { return this.participants.getAdvisorName(thesisWork); }

  /** Muestra el aviso «Revisión vacía». */
  notifyEmptyReview(): void {
    this.notificationService.show({
      title: 'Revisión vacía',
      message: 'Escriba sus observaciones o adjunte el PDF con sus notas.',
      type: NotificationType.ERROR
    });
  }
}
