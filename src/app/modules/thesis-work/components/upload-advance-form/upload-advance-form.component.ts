import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { ReadonlyFieldComponent } from '../../../../shared/components/readonly-field/readonly-field.component';
import { MAX_ADVANCE_COMMENTS, UploadAdvanceFormService } from './services/upload-advance-form.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { UploadAdvancePayload } from '../../interfaces/advance-playload.interface';
import { ProposalContentFieldsComponent } from '../../../../shared/components/proposal-content-fields/proposal-content-fields.component';

/** Formulario para radicar un informe mensual: el PDF del informe y observaciones opcionales. */
@Component({
  selector: 'app-upload-advance-form',
  imports: [ProposalContentFieldsComponent, NgClass, ReactiveFormsModule, ButtonComponent, FileUploadModalComponent, InfoBannerComponent, ReadonlyFieldComponent],
  providers: [UploadAdvanceFormService],
  templateUrl: './upload-advance-form.component.html',
  styleUrls: ['./upload-advance-form.component.css']
})
export class UploadAdvanceFormComponent {
  protected readonly formService = inject(UploadAdvanceFormService);
  protected readonly maxComments = MAX_ADVANCE_COMMENTS;

  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;
  @Output() onSaveAdvance = new EventEmitter<UploadAdvancePayload>();
  @Output() onGoBack = new EventEmitter<void>();

  readonly uploadedFile = signal<{ fileName: string; file: File } | null>(null);
  readonly isUploadModalOpen = signal(false);

  get advanceForm() { return this.formService.advanceForm; }
  /** Número que tendrá el informe: el siguiente al último radicado. */
  get nextReportNumber(): number { return (this.thesisWork.advances?.length ?? 0) + 1; }
  getStudentNames(): string { return this.formService.getStudentNames(this.thesisWork); }
  getDirectorName(): string { return this.formService.getDirectorName(this.thesisWork); }
  getCodirectorName(): string { return this.formService.getCodirectorName(this.thesisWork); }
  getAdvisorName(): string { return this.formService.getAdvisorName(this.thesisWork); }

  isFieldInvalid(fieldName: keyof typeof this.advanceForm.controls): boolean {
    const control = this.advanceForm.controls[fieldName];
    return !!(control?.invalid && control?.touched);
  }

  handleFileUploaded(event: { fileName: string; file: File }): void {
    this.uploadedFile.set(event);
    this.isUploadModalOpen.set(false);
  }

  removeFile(): void {
    this.uploadedFile.set(null);
  }

  submit(): void {
    if (this.advanceForm.invalid) {
      this.advanceForm.markAllAsTouched();
      this.formService.notifyIncompleteForm();
      return;
    }
    const uploaded = this.uploadedFile();
    if (!uploaded) {
      this.formService.notifyMissingFiles();
      return;
    }
    this.onSaveAdvance.emit({ comments: this.advanceForm.getRawValue().comments, file: uploaded.file });
  }
}
