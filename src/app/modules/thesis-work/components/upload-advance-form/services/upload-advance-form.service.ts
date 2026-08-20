import { inject, Injectable } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';

@Injectable()
export class UploadAdvanceFormService {
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  private readonly participants = inject(ThesisParticipantsFormatterService);

  readonly advanceForm = this.fb.nonNullable.group({
    title:    ['', Validators.required],
    comments: ['', Validators.required]
  });

  getStudentNames(thesisWork: ThesisWork): string { return this.participants.getStudentNames(thesisWork); }
  getDirectorName(thesisWork: ThesisWork): string { return this.participants.getDirectorName(thesisWork); }
  getCodirectorName(thesisWork: ThesisWork): string { return this.participants.getCodirectorName(thesisWork); }
  getAdvisorName(thesisWork: ThesisWork): string { return this.participants.getAdvisorName(thesisWork); }

  notifyIncompleteForm(): void {
    this.notificationService.show({
      title: 'Formulario incompleto',
      message: 'Por favor, complete el título y los comentarios del avance.',
      type: NotificationType.ERROR
    });
  }

  notifyMissingFiles(): void {
    this.notificationService.show({
      title: 'Archivos requeridos',
      message: 'Debe adjuntar al menos un archivo como evidencia de su avance.',
      type: NotificationType.ERROR
    });
  }
}
