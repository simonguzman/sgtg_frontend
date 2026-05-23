import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { UserService } from '../../../users/services/user.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { FileUploadModalComponent } from "../../../../shared/components/modals/file-upload-modal/file-upload-modal.component";
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";

@Component({
  selector: 'app-register-corrected-document-form',
  templateUrl: './register-corrected-document-form.component.html',
  styleUrls: ['./register-corrected-document-form.component.css'],
  imports: [FileUploadModalComponent, ButtonComponent]
})
export class RegisterCorrectedDocumentFormComponent {
  private readonly notificationService = inject(NotificationService);
  public readonly userService = inject(UserService);

  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;

  @Output() onSaveDocuments = new EventEmitter<{ monograph: File, annexes?: File }>();
  @Output() onGoBack = new EventEmitter<void>();

  // Señales para los archivos (Sin Formato_E)
  uploadedMonograph = signal<{ fileName: string; file: File } | null>(null);
  uploadedAnnexes = signal<{ fileName: string; file: File } | null>(null);

  // Estados de los modales de carga
  activeModal = signal<'MONOGRAPH' | 'ANNEXES' | null>(null);
  isSubmitAttempted = signal(false);

  // --- Getters de Información ---
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

  // --- Handlers de Archivos ---
  openModal(type: 'MONOGRAPH' | 'ANNEXES'): void {
    this.activeModal.set(type);
  }

  closeModal(): void {
    this.activeModal.set(null);
  }

  handleFileUploaded(event: { fileName: string; file: File }): void {
    const type = this.activeModal();
    if (type === 'MONOGRAPH') this.uploadedMonograph.set(event);
    if (type === 'ANNEXES') this.uploadedAnnexes.set(event);

    this.closeModal();
    this.notificationService.show({
      title: 'Archivo adjunto',
      message: `El documento ${event.fileName} se ha adjuntado correctamente.`,
      type: NotificationType.INFO
    });
  }

  removeFile(type: 'MONOGRAPH' | 'ANNEXES'): void {
    if (type === 'MONOGRAPH') this.uploadedMonograph.set(null);
    if (type === 'ANNEXES') this.uploadedAnnexes.set(null);
  }

  submit(): void {
    this.isSubmitAttempted.set(true);

    const monograph = this.uploadedMonograph();
    const annexes = this.uploadedAnnexes();

    // Validación de obligatorios (Solo Monografía)
    if (!monograph) {
      this.notificationService.show({
        title: 'Documento faltante',
        message: 'Debe adjuntar obligatoriamente la Monografía corregida para continuar.',
        type: NotificationType.ERROR
      });
      return;
    }

    this.onSaveDocuments.emit({
      monograph: monograph.file,
      annexes: annexes?.file
    });
  }
}
