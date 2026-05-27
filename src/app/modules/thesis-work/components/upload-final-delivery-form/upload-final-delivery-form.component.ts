import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { UserService } from '../../../users/services/user.service';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { FileUploadModalComponent } from "../../../../shared/components/modals/file-upload-modal/file-upload-modal.component";
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { ThesisWork } from '../../interfaces/thesis-work.interface';

@Component({
  selector: 'app-upload-final-delivery-form',
  templateUrl: './upload-final-delivery-form.component.html',
  styleUrls: ['./upload-final-delivery-form.component.css'],
  imports: [FileUploadModalComponent, ButtonComponent]
})
export class UploadFinalDeliveryFormComponent {
  private readonly notificationService = inject(NotificationService);
  public readonly userService = inject(UserService);

  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;

  @Output() onSaveDelivery = new EventEmitter<{ monograph: File, formatE: File, annexes?: File }>();
  @Output() onGoBack = new EventEmitter<void>();

  uploadedMonograph = signal<{ fileName: string; file: File } | null>(null);
  uploadedFormatE = signal<{ fileName: string; file: File } | null>(null);
  uploadedAnnexes = signal<{ fileName: string; file: File } | null>(null);

  activeModal = signal<'MONOGRAPH' | 'FORMAT_E' | 'ANNEXES' | null>(null);
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

  openModal(type: 'MONOGRAPH' | 'FORMAT_E' | 'ANNEXES'): void {
    this.activeModal.set(type);
  }

  closeModal(): void {
    this.activeModal.set(null);
  }

  handleFileUploaded(event: { fileName: string; file: File }): void {
    const type = this.activeModal();
    if (type === 'MONOGRAPH') this.uploadedMonograph.set(event);
    if (type === 'FORMAT_E') this.uploadedFormatE.set(event);
    if (type === 'ANNEXES') this.uploadedAnnexes.set(event);

    this.closeModal();
    this.notificationService.show({
      title: 'Archivo adjunto',
      message: `El documento ${event.fileName} se ha adjuntado correctamente.`,
      type: NotificationType.INFO
    });
  }

  removeFile(type: 'MONOGRAPH' | 'FORMAT_E' | 'ANNEXES'): void {
    if (type === 'MONOGRAPH') this.uploadedMonograph.set(null);
    if (type === 'FORMAT_E') this.uploadedFormatE.set(null);
    if (type === 'ANNEXES') this.uploadedAnnexes.set(null);
  }

  submit(): void {
    this.isSubmitAttempted.set(true);

    const monograph = this.uploadedMonograph();
    const formatE = this.uploadedFormatE();
    const annexes = this.uploadedAnnexes();

    if (!monograph || !formatE) {
      this.notificationService.show({
        title: 'Documentos faltantes',
        message: 'Debe adjuntar obligatoriamente la Monografía y el Formato_E para continuar.',
        type: NotificationType.ERROR
      });
      return;
    }

    this.onSaveDelivery.emit({
      monograph: monograph.file,
      formatE: formatE.file,
      annexes: annexes?.file
    });
  }
}


