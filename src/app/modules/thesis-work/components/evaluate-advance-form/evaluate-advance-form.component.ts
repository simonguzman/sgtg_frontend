import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { UserService } from '../../../users/services/user.service';
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { FileUploadModalComponent } from "../../../../shared/components/modals/file-upload-modal/file-upload-modal.component";
import { InfoBannerComponent } from "../../../../shared/components/info-banner/info-banner.component";
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { Advance } from '../../interfaces/advance.interface';
import { AdvanceEvaluationResult, SubmitAdvanceEvaluationPayload } from '../../interfaces/advance-playload.interface';

@Component({
  selector: 'app-evaluate-advance-form',
  templateUrl: './evaluate-advance-form.component.html',
  styleUrls: ['./evaluate-advance-form.component.css'],
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, FileUploadModalComponent, InfoBannerComponent]
})
export class EvaluateAdvanceFormComponent {
  private readonly fb = inject(FormBuilder);
  public readonly userService = inject(UserService);

  @Input({ required: true }) advanceData!: Advance;
  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;
  @Input() alreadyEvaluated = false;
  @Input() isFullyEvaluated = false;

  @Output() onBack = new EventEmitter<void>();
  @Output() onSaveEvaluation = new EventEmitter<SubmitAdvanceEvaluationPayload>();
  @Output() onDownloadAdvance = new EventEmitter<void>();

  // Cambiado a array para permitir múltiples archivos
  uploadedFeedbackFiles = signal<{ fileName: string; file: File }[]>([]);
  isFeedbackModalOpen = signal(false);

  readonly evaluationForm = this.fb.nonNullable.group({
    result: this.fb.control(AdvanceEvaluationResult.EN_REVISION, Validators.required),
    comments: this.fb.control('', Validators.required)
  });

  get isReadOnly(): boolean {
    return this.alreadyEvaluated || this.isFullyEvaluated;
  }

  get advanceDocuments() {
    return this.advanceData.documents || [];
  }

  // --- Helpers ---
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

  // --- Lógica de Archivos ---
  handleFeedbackUploaded(event: { fileName: string; file: File }): void {
    this.uploadedFeedbackFiles.update(files => [...files, event]); // Agrega al array
    this.isFeedbackModalOpen.set(false);
  }

  removeFeedbackFile(index: number): void {
    this.uploadedFeedbackFiles.update(files => files.filter((_, i) => i !== index)); // Elimina por índice
  }

  isFieldInvalid(fieldName: keyof typeof this.evaluationForm.controls): boolean {
    const control = this.evaluationForm.controls[fieldName];
    return !!(control?.invalid && control?.touched);
  }

  submit(): void {
    if (this.evaluationForm.invalid) {
      this.evaluationForm.markAllAsTouched();
      return;
    }
    const feedbackFiles = this.uploadedFeedbackFiles();
    const values = this.evaluationForm.getRawValue();
    this.onSaveEvaluation.emit({
      formValues: {
        result: values.result as AdvanceEvaluationResult,
        comments: values.comments as string
      },
      files: feedbackFiles.map(f => f.file) // Envía array de archivos
    });
  }
}
