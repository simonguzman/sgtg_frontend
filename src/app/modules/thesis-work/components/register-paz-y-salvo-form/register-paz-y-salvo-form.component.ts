import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { UserService } from '../../../users/services/user.service';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { FileUploadModalComponent } from "../../../../shared/components/modals/file-upload-modal/file-upload-modal.component";
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { PazYSalvoPayload } from '../../interfaces/paz-y-salvo-playload.interface';
import { InfoBannerComponent } from "../../../../shared/components/info-banner/info-banner.component";

@Component({
  selector: 'app-register-paz-y-salvo-form',
  templateUrl: './register-paz-y-salvo-form.component.html',
  styleUrls: ['./register-paz-y-salvo-form.component.css'],
  imports: [FileUploadModalComponent, ButtonComponent, InfoBannerComponent]
})
export class RegisterPazYSalvoFormComponent {
  private readonly notificationService = inject(NotificationService);
  public readonly userService = inject(UserService);

  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;

  @Output() onSave = new EventEmitter<{ payload: PazYSalvoPayload, file: File }>();
  @Output() onGoBack = new EventEmitter<void>();
  @Output() onDownloadFile = new EventEmitter<FileDocument>();

  academicApproved = signal<boolean | null>(null);
  academicComments = signal<string>('');
  financialApproved = signal<boolean | null>(null);
  financialComments = signal<string>('');
  uploadedFormat = signal<{ fileName: string; file: File } | null>(null);
  isModalOpen = signal(false);
  isSubmitAttempted = signal(false);

  getStudentNames(): string {
    const authors = this.thesisWork?.preliminaryDraftData?.proposalData?.authors || [];
    return this.userService.getAuthorsNames(authors);
  }

  getDirectorName(): string {
    const directorId = this.thesisWork?.preliminaryDraftData?.proposalData?.director?.id;
    return directorId ? this.userService.getUserFullName(directorId) : 'No asignado';
  }

  getCodirectorName(): string {
    const codirectorId = this.thesisWork?.preliminaryDraftData?.proposalData?.codirector?.id;
    return codirectorId ? this.userService.getUserFullName(codirectorId) : '';
  }

  getAdvisorName(): string {
    const advisorId = this.thesisWork?.preliminaryDraftData?.proposalData?.advisor?.id;
    return advisorId ? this.userService.getUserFullName(advisorId) : '';
  }

  getExistingDocument(type: string): FileDocument | null {
    const targetType = type.toUpperCase().trim();
    if (this.thesisWork?.finalDeliveries && this.thesisWork.finalDeliveries.length > 0) {
      const lastDelivery = this.thesisWork.finalDeliveries.find(finalDelivery => finalDelivery.status === 'En revisión')
                           || this.thesisWork.finalDeliveries[0];
      if (targetType === 'MONOGRAFIA' && lastDelivery.monograph) return lastDelivery.monograph;
      if ((targetType === 'FORMATO' || targetType === 'FORMATO_E') && lastDelivery.formatE) return lastDelivery.formatE;
      if (targetType === 'ANEXOS' && lastDelivery.annexes) return lastDelivery.annexes;
    }

    if (!this.thesisWork?.documents) return null;

    return this.thesisWork.documents.find((doc: FileDocument) => {
      const currentDocType = (doc.type || '').toUpperCase().trim();

      if (targetType === 'MONOGRAFIA') return currentDocType === 'MONOGRAFIA';
      if (targetType === 'FORMATO' || targetType === 'FORMATO_E') {
        return currentDocType === 'FORMATO_E' || currentDocType === 'FORMATO';
      }
      if (targetType === 'ANEXOS') return currentDocType === 'ANEXOS';

      return currentDocType === targetType;
    }) || null;
  }

  handleFileUploaded(event: { fileName: string; file: File }): void {
    this.uploadedFormat.set(event);
    this.isModalOpen.set(false);
    this.notificationService.show({
      title: 'Archivo adjunto',
      message: `El documento ${event.fileName} se ha adjuntado correctamente.`,
      type: NotificationType.INFO
    });
  }

  removeFile(): void {
    this.uploadedFormat.set(null);
  }

  downloadDocument(doc: FileDocument | null): void {
    if (doc) this.onDownloadFile.emit(doc);
  }

  submit(): void {
    this.isSubmitAttempted.set(true);

    const acApp = this.academicApproved();
    const finApp = this.financialApproved();
    const fileData = this.uploadedFormat();

    if (acApp === null || finApp === null) {
      this.notificationService.show({
        title: 'Faltan evaluaciones',
        message: 'Debe marcar si cumple o no cumple en ambas revisiones (Académica y Financiera).',
        type: NotificationType.ERROR
      });
      return;
    }

    if (!fileData) {
      this.notificationService.show({
        title: 'Documento faltante',
        message: 'Debe adjuntar obligatoriamente el Formato de Paz y Salvo firmado.',
        type: NotificationType.ERROR
      });
      return;
    }

    this.onSave.emit({
      payload: {
        academicApproved: acApp,
        academicComments: this.academicComments(),
        financialApproved: finApp,
        financialComments: this.financialComments()
      },
      file: fileData.file
    });
  }
}
