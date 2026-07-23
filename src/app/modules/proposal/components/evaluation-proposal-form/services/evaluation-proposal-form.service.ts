import { inject, Injectable } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { UserService } from '../../../../users/services/user.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
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

  /**
   * Devuelve el primer documento cargado (el original de la propuesta).
   * Se usa solo para la sección de descarga — no depende de la fecha.
   */
  resolveOriginalDocument(proposal: Proposal): FileDocument | null {
    return proposal?.documents?.[0] ?? null;
  }

  /**
   * Devuelve el documento más reciente evaluable (Propuesta o Corrección).
   * Se usa para mostrar la fecha de carga vigente en el formulario.
   * Usa enum DocumentType en vez de strings literales para type-safety.
   */
  resolveCurrentDocument(proposal: Proposal): FileDocument | null {
    const evaluable = (proposal?.documents ?? []).filter(document =>
      document.type === DocumentType.PROPUESTA || document.type === DocumentType.CORRECCION
    );
    if (evaluable.length === 0) return null;
    return [...evaluable].sort((a, b) =>
      new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
    )[0];
  }

  formatUploadDate(document: FileDocument | null): string {
    if (!document?.uploadDate) return 'Fecha no disponible';
    return document.uploadDate instanceof Date
      ? document.uploadDate.toLocaleDateString('es-ES')
      : String(document.uploadDate);
  }

  // ── Formateo de nombres ──────────────────────────────────────────────────
  // Delegan en UserService, que ya encapsula la lógica de formateo.
  // El componente original duplicaba esa lógica en getStudentNames().

  getStudentNames(authors: User[] | undefined): string {
    return this.userService.getAuthorsNames(authors);
  }

  getMemberName(userId: string | undefined): string {
    return this.userService.getUserFullName(userId);
  }

  notifyFileUploaded(): void {
    this.notificationService.show({
      title: 'Formato A adjuntado',
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
      message: 'Debe cargar el Formato A firmado para poder registrar la evaluación.',
      type: NotificationType.ERROR
    });
  }
}
