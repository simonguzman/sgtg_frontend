import { inject, Injectable } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';

/** Máximo de caracteres de las observaciones (igual que el backend). */
export const MAX_ADVANCE_COMMENTS = 2000;

/** Datos y avisos del formulario de carga del informe mensual. */
@Injectable()
export class UploadAdvanceFormService {
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  private readonly participants = inject(ThesisParticipantsFormatterService);

  /** Observaciones opcionales de quien radica el informe. */
  readonly advanceForm = this.fb.nonNullable.group({
    comments: ['', Validators.maxLength(MAX_ADVANCE_COMMENTS)]
  });

  /** Nombres de los estudiantes del trabajo. */
  getStudentNames(thesisWork: ThesisWork): string { return this.participants.getStudentNames(thesisWork); }
  /** Nombre del director. */
  getDirectorName(thesisWork: ThesisWork): string { return this.participants.getDirectorName(thesisWork); }
  /** Nombre del codirector, o vacío si no tiene. */
  getCodirectorName(thesisWork: ThesisWork): string { return this.participants.getCodirectorName(thesisWork); }
  /** Nombre del asesor, o vacío si no tiene. */
  getAdvisorName(thesisWork: ThesisWork): string { return this.participants.getAdvisorName(thesisWork); }

  /** Muestra el aviso «Formulario incompleto». */
  notifyIncompleteForm(): void {
    this.notificationService.show({
      title: 'Formulario incompleto',
      message: `Las observaciones no pueden superar los ${MAX_ADVANCE_COMMENTS} caracteres.`,
      type: NotificationType.ERROR
    });
  }

  /** Muestra el aviso «Archivo requerido». */
  notifyMissingFiles(): void {
    this.notificationService.show({
      title: 'Archivo requerido',
      message: 'Debe adjuntar el documento del informe mensual en PDF.',
      type: NotificationType.ERROR
    });
  }
}
