import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { ReadonlyFieldComponent } from '../../../../shared/components/readonly-field/readonly-field.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { ReviewPazYSalvoFormService } from './services/review-paz-y-salvo-form.service';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { PazYSalvoReviewPayload } from '../../interfaces/paz-y-salvo-review.interface';
import { FinalDeliveryDocType } from '../../services/thesis-final-delivery-document-resolver.service';
import { ProposalContentFieldsComponent } from '../../../../shared/components/proposal-content-fields/proposal-content-fields.component';

/**
 * Revisión del paz y salvo de Decanatura: lo aprueba o no, siempre con el
 * formato F; si no lo aprueba, con observaciones.
 */
@Component({
  selector: 'app-review-paz-y-salvo-form',
  imports: [ProposalContentFieldsComponent, FileUploadModalComponent, ButtonComponent, InfoBannerComponent, ReadonlyFieldComponent],
  providers: [ReviewPazYSalvoFormService],
  templateUrl: './review-paz-y-salvo-form.component.html',
  styleUrls: ['./review-paz-y-salvo-form.component.css']
})
export class ReviewPazYSalvoFormComponent {
  protected readonly formService = inject(ReviewPazYSalvoFormService);

  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;
  @Output() onSave = new EventEmitter<{ payload: PazYSalvoReviewPayload; file: File }>();
  @Output() onGoBack = new EventEmitter<void>();
  @Output() onDownloadFile = new EventEmitter<FileDocument>();

  readonly approved = signal<boolean | null>(null);
  readonly observations = signal<string>('');
  readonly uploadedFormat = signal<{ fileName: string; file: File } | null>(null);
  readonly isModalOpen = signal(false);
  readonly isSubmitAttempted = signal(false);

  /** Si no se aprueba y no hay observaciones, después de intentar guardar */
  get isMissingObservations(): boolean {
    return this.isSubmitAttempted() && this.approved() === false && !this.observations().trim();
  }

  getStudentNames(): string { return this.formService.getStudentNames(this.thesisWork); }
  getDirectorName(): string { return this.formService.getDirectorName(this.thesisWork); }
  getCodirectorName(): string { return this.formService.getCodirectorName(this.thesisWork); }
  getAdvisorName(): string { return this.formService.getAdvisorName(this.thesisWork); }

  getExistingDocument(type: FinalDeliveryDocType): FileDocument | null {
    return this.formService.getExistingDocument(this.thesisWork, type);
  }

  downloadDocument(document: FileDocument | null): void {
    if (document) this.onDownloadFile.emit(document);
  }

  onObservationsChange(event: Event): void {
    this.observations.set((event.target as HTMLTextAreaElement).value);
  }

  handleFileUploaded(event: { fileName: string; file: File }): void {
    this.uploadedFormat.set(event);
    this.isModalOpen.set(false);
    this.formService.notifyFileAttached(event.fileName);
  }

  removeFile(): void { this.uploadedFormat.set(null); }

  submit(): void {
    this.isSubmitAttempted.set(true);
    const approved = this.approved();

    if (approved === null) {
      this.formService.notifyMissingDecision();
      return;
    }
    if (!approved && !this.observations().trim()) {
      this.formService.notifyMissingObservations();
      return;
    }
    const fileData = this.uploadedFormat();
    if (!fileData) {
      this.formService.notifyMissingDocument();
      return;
    }

    this.onSave.emit({
      payload: { approved, observations: this.observations() },
      file: fileData.file
    });
  }
}
