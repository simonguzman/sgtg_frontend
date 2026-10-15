import { inject, Injectable } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { UserService } from '../../../../users/services/user.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { versionActual, versionEnRevision } from '../../../services/proposal-rules.service';
import { Proposal } from '../../../interfaces/proposal.interface';
import { User } from '../../../../users/interfaces/user.interface';

@Injectable()
export class EvaluationProposalFormService {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly notificationService = inject(NotificationService);

  readonly evaluationForm = this.fb.group({
    result:   ['', Validators.required],
    comments: ['', Validators.required]
  });

  /** Versión del formato A que el Comité evalúa: la que está En revisión. */
  resolveOriginalDocument(proposal: Proposal): FileDocument | null {
    return versionEnRevision(proposal);
  }

  /** Última versión radicada (por número de versión). */
  resolveCurrentDocument(proposal: Proposal): FileDocument | null {
    return versionActual(proposal);
  }

  formatUploadDate(document: FileDocument | null): string {
    if (!document?.uploadDate) return 'Fecha no disponible';
    return document.uploadDate instanceof Date
      ? document.uploadDate.toLocaleDateString('es-ES')
      : String(document.uploadDate);
  }

  getStudentNames(authors: User[] | undefined): string {
    return this.userService.getAuthorsNames(authors);
  }

  getMemberName(userId: string | undefined): string {
    return this.userService.getUserFullName(userId);
  }

  notifyFileUploaded(): void {
    this.notificationService.show({
      title: 'Documento de respuesta adjuntado',
      message: 'El documento firmado se ha vinculado correctamente a esta evaluación.',
      type: NotificationType.CONFIRMATION
    });
  }

  notifyFileRemoved(): void {
    this.notificationService.show({
      title: 'Documento removido',
      message: 'Se ha quitado el formato firmado. Recuerde que es obligatorio para finalizar.',
      type: NotificationType.INFO
    });
  }

  notifyInvalidForm(): void {
    this.notificationService.show({
      title: 'Formulario incompleto',
      message: 'Por favor, asegúrese de seleccionar un veredicto y escribir sus observaciones.',
      type: NotificationType.ERROR
    });
  }

  notifyMissingFile(): void {
    this.notificationService.show({
      title: 'Documento requerido',
      message: 'Debe cargar el documento de respuesta del Comité para poder registrar la evaluación.',
      type: NotificationType.ERROR
    });
  }
}
