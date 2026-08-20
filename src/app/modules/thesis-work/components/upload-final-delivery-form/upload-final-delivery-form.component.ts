import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { UploadFinalDeliveryFormService } from './services/upload-final-delivery-form.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';

export type FileSlot = 'MONOGRAPH' | 'FORMAT_E' | 'ANNEXES';
export type UploadedFile = { fileName: string; file: File };

@Component({
  selector: 'app-upload-final-delivery-form',
  imports: [FileUploadModalComponent, ButtonComponent, InfoBannerComponent],
  providers: [UploadFinalDeliveryFormService],
  templateUrl: './upload-final-delivery-form.component.html',
  styleUrls: ['./upload-final-delivery-form.component.css']
})
export class UploadFinalDeliveryFormComponent {
  protected readonly formService = inject(UploadFinalDeliveryFormService);

  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;
  @Output() onSaveDelivery = new EventEmitter<{ monograph: File; formatE: File; annexes: File }>();

  readonly uploadedMonograph = signal<UploadedFile | null>(null);
  readonly uploadedFormatE = signal<UploadedFile | null>(null);
  readonly uploadedAnnexes = signal<UploadedFile | null>(null);
  readonly activeModal = signal<FileSlot | null>(null);
  readonly isSubmitAttempted = signal(false);

  getStudentNames(): string { return this.formService.getStudentNames(this.thesisWork); }
  getDirectorName(): string { return this.formService.getDirectorName(this.thesisWork); }
  getCodirectorName(): string { return this.formService.getCodirectorName(this.thesisWork); }
  getAdvisorName(): string { return this.formService.getAdvisorName(this.thesisWork); }

  openModal(type: FileSlot): void { this.activeModal.set(type); }
  closeModal(): void { this.activeModal.set(null); }

  handleFileUploaded(event: UploadedFile): void {
    const type = this.activeModal();
    if (type === 'MONOGRAPH') this.uploadedMonograph.set(event);
    if (type === 'FORMAT_E') this.uploadedFormatE.set(event);
    if (type === 'ANNEXES') this.uploadedAnnexes.set(event);
    this.closeModal();
    this.formService.notifyFileAttached(event.fileName);
  }

  removeFile(type: FileSlot): void {
    if (type === 'MONOGRAPH') this.uploadedMonograph.set(null);
    if (type === 'FORMAT_E') this.uploadedFormatE.set(null);
    if (type === 'ANNEXES') this.uploadedAnnexes.set(null);
  }

  submit(): void {
    this.isSubmitAttempted.set(true);
    const monograph = this.uploadedMonograph();
    const formatE = this.uploadedFormatE();
    const annexes = this.uploadedAnnexes();

    if (!monograph || !formatE || !annexes) {
      this.formService.notifyMissingDocuments();
      return;
    }
    this.onSaveDelivery.emit({ monograph: monograph.file, formatE: formatE.file, annexes: annexes.file });
  }
}
