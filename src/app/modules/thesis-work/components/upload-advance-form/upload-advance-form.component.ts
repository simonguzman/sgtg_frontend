import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { NgClass, NgTemplateOutlet } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { UploadAdvanceFormService } from './services/upload-advance-form.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { UploadAdvancePayload } from '../../interfaces/advance-playload.interface';

@Component({
  selector: 'app-upload-advance-form',
  imports: [NgTemplateOutlet, NgClass, ReactiveFormsModule, ButtonComponent, FileUploadModalComponent, InfoBannerComponent],
  providers: [UploadAdvanceFormService],
  templateUrl: './upload-advance-form.component.html',
  styleUrls: ['./upload-advance-form.component.css']
})
export class UploadAdvanceFormComponent {
  protected readonly formService = inject(UploadAdvanceFormService);

  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;
  @Output() onSaveAdvance = new EventEmitter<UploadAdvancePayload>();
  @Output() onGoBack = new EventEmitter<void>();

  readonly uploadedFiles = signal<{ fileName: string; file: File }[]>([]);
  readonly isUploadModalOpen = signal(false);

  get advanceForm() { return this.formService.advanceForm; }
  getStudentNames(): string { return this.formService.getStudentNames(this.thesisWork); }
  getDirectorName(): string { return this.formService.getDirectorName(this.thesisWork); }
  getCodirectorName(): string { return this.formService.getCodirectorName(this.thesisWork); }
  getAdvisorName(): string { return this.formService.getAdvisorName(this.thesisWork); }

  isFieldInvalid(fieldName: keyof typeof this.advanceForm.controls): boolean {
    const control = this.advanceForm.controls[fieldName];
    return !!(control?.invalid && control?.touched);
  }

  handleFileUploaded(event: { fileName: string; file: File }): void {
    this.uploadedFiles.update(files => [...files, event]);
    this.isUploadModalOpen.set(false);
  }

  removeFile(index: number): void {
    this.uploadedFiles.update(files => files.filter((_, indexFile) => indexFile !== index));
  }

  submit(): void {
    if (this.advanceForm.invalid) {
      this.advanceForm.markAllAsTouched();
      this.formService.notifyIncompleteForm();
      return;
    }
    if (this.uploadedFiles().length === 0) {
      this.formService.notifyMissingFiles();
      return;
    }
    const { title, comments } = this.advanceForm.getRawValue();
    this.onSaveAdvance.emit({
      formValues: { title, comments },
      files: this.uploadedFiles().map(item => item.file)
    });
  }
}
