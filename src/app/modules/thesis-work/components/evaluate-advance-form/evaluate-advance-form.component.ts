import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { FileUploadModalComponent } from "../../../../shared/components/modals/file-upload-modal/file-upload-modal.component";
import { Advance } from '../../interfaces/thesis-work.interface';
import { AdvanceEvaluationResult, SubmitAdvanceEvaluationPayload } from '../../interfaces/advance-playload.interface';

@Component({
  selector: 'app-evaluate-advance-form',
  templateUrl: './evaluate-advance-form.component.html',
  styleUrls: ['./evaluate-advance-form.component.css'],
  imports: [ReactiveFormsModule, ButtonComponent, FileUploadModalComponent]
})
export class EvaluateAdvanceFormComponent {
  private readonly fb = inject(FormBuilder);

  @Input({ required: true }) advanceData!: Advance;
  @Input({ required: true }) thesisWorkTitle!: string;
  @Input() isSubmitting = false;
  @Input() alreadyEvaluated = false;
  @Input() isFullyEvaluated = false;

  @Output() onBack = new EventEmitter<void>();
  @Output() onSaveEvaluation = new EventEmitter<SubmitAdvanceEvaluationPayload>();
  @Output() onDownloadAdvance = new EventEmitter<void>();

  uploadedFeedbackFile = signal<{ fileName: string; file: File } | null>(null);
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

  handleFeedbackUploaded(event: { fileName: string; file: File }): void {
    this.uploadedFeedbackFile.set(event);
    this.isFeedbackModalOpen.set(false);
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
    const feedbackData = this.uploadedFeedbackFile();
    const values = this.evaluationForm.getRawValue();
    this.onSaveEvaluation.emit({
      formValues: {
        result: values.result as AdvanceEvaluationResult,
        comments: values.comments as string
      },
      file: feedbackData ? feedbackData.file : undefined
    });
  }
}
