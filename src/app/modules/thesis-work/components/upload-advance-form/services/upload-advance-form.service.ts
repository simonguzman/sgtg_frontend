import { inject, Injectable } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { UserService } from '../../../../users/services/user.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';

// Scoped al componente anfitrión — mismo patrón que ProposalFormService y EvaluationProposalFormService
@Injectable()
export class UploadAdvanceFormService {
  private readonly fb                  = inject(FormBuilder);
  private readonly userService         = inject(UserService);
  private readonly notificationService = inject(NotificationService);

  readonly advanceForm = this.fb.nonNullable.group({
    title:    ['', Validators.required],
    comments: ['', Validators.required]
  });

  // ── Formateo de participantes ─────────────────────────────────────────────
  // Centralizado aquí para no duplicarlo entre UploadAdvanceForm y EvaluateAdvanceForm.

  getStudentNames(thesisWork: ThesisWork): string {
    return this.userService.getAuthorsNames(
      thesisWork?.preliminaryDraftData?.proposalData?.authors ?? []
    );
  }

  getMemberName(id: string | undefined): string {
    return id ? this.userService.getUserFullName(id) : '';
  }

  // ── Notificaciones del formulario ─────────────────────────────────────────

  notifyIncompleteForm(): void {
    this.notificationService.show({
      title:   'Formulario incompleto',
      message: 'Por favor, complete el título y los comentarios del avance.',
      type:    NotificationType.ERROR
    });
  }

  notifyMissingFiles(): void {
    this.notificationService.show({
      title:   'Archivos requeridos',
      message: 'Debe adjuntar al menos un archivo como evidencia de su avance.',
      type:    NotificationType.ERROR
    });
  }
}
