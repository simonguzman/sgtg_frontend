import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { RegisterCorrectedDocumentFormService } from './services/register-corrected-document-form.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';

type FileSlot = 'MONOGRAPH' | 'ANNEXES';

@Component({
  selector: 'app-register-corrected-document-form',
  templateUrl: './register-corrected-document-form.component.html',
  styleUrls: ['./register-corrected-document-form.component.css'],
  imports: [FileUploadModalComponent, ButtonComponent, InfoBannerComponent],
  providers: [RegisterCorrectedDocumentFormService]
})
export class RegisterCorrectedDocumentFormComponent {
  protected readonly formService = inject(RegisterCorrectedDocumentFormService);

  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;
  @Output() onSaveDocuments = new EventEmitter<{ monograph: File; annexes: File }>();
  @Output() onGoBack        = new EventEmitter<void>();

  readonly uploadedMonograph = signal<{ fileName: string; file: File } | null>(null);
  readonly uploadedAnnexes   = signal<{ fileName: string; file: File } | null>(null);
  readonly activeModal       = signal<FileSlot | null>(null);
  readonly isSubmitAttempted = signal(false);

  getStudentNames(): string   { return this.formService.getStudentNames(this.thesisWork); }
  getDirectorName(): string   { return this.formService.getDirectorName(this.thesisWork); }
  getCodirectorName(): string { return this.formService.getCodirectorName(this.thesisWork); }
  getAdvisorName(): string    { return this.formService.getAdvisorName(this.thesisWork); }

  openModal(type: FileSlot): void { this.activeModal.set(type); }
  closeModal(): void              { this.activeModal.set(null); }

  handleFileUploaded(event: { fileName: string; file: File }): void {
    const type = this.activeModal();
    if (type === 'MONOGRAPH') this.uploadedMonograph.set(event);
    if (type === 'ANNEXES')   this.uploadedAnnexes.set(event);
    this.closeModal();
    this.formService.notifyFileAttached(event.fileName);
  }

  removeFile(type: FileSlot): void {
    if (type === 'MONOGRAPH') this.uploadedMonograph.set(null);
    if (type === 'ANNEXES')   this.uploadedAnnexes.set(null);
  }

  submit(): void {
    this.isSubmitAttempted.set(true);
    const monograph = this.uploadedMonograph();
    const annexes   = this.uploadedAnnexes();

    if (!monograph || !annexes) {
      this.formService.notifyMissingDocuments();
      return;
    }
    this.onSaveDocuments.emit({ monograph: monograph.file, annexes: annexes.file });
  }
}
