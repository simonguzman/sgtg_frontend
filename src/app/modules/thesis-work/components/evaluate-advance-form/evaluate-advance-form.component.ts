import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { NgClass, NgTemplateOutlet } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { EvaluateAdvanceFormService } from './services/evaluate-advance-form.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { Advance } from '../../interfaces/advance.interface';
import { AdvanceEvaluationResult, SubmitAdvanceEvaluationPayload } from '../../interfaces/advance-playload.interface';

@Component({
  selector: 'app-evaluate-advance-form',
  imports: [NgTemplateOutlet, NgClass, ReactiveFormsModule, ButtonComponent, FileUploadModalComponent, InfoBannerComponent],
  providers: [EvaluateAdvanceFormService],
  templateUrl: './evaluate-advance-form.component.html',
  styleUrls: ['./evaluate-advance-form.component.css']
})
export class EvaluateAdvanceFormComponent {
  protected readonly formService = inject(EvaluateAdvanceFormService);

  @Input({ required: true }) advanceData!: Advance;
  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting    = false;
  @Input() alreadyEvaluated  = false;
  @Input() isFullyEvaluated  = false;
  @Output() onBack            = new EventEmitter<void>();
  @Output() onSaveEvaluation  = new EventEmitter<SubmitAdvanceEvaluationPayload>();
  @Output() onDownloadAdvance = new EventEmitter<void>();

  // ── Estado de UI ──────────────────────────────────────────────────────────
  readonly uploadedFeedbackFiles = signal<{ fileName: string; file: File }[]>([]);
  readonly isFeedbackModalOpen   = signal(false);

  // ── Getters que exponen el servicio al template ───────────────────────────
  get evaluationForm() { return this.formService.evaluationForm; }

  // isReadOnly: depende de signals/inputs del componente → queda en el componente
  get isReadOnly(): boolean { return this.alreadyEvaluated || this.isFullyEvaluated; }

  get advanceDocuments() { return this.advanceData.documents ?? []; }

  getStudentNames(): string { return this.formService.getStudentNames(this.thesisWork); }
  getDirectorName(): string {
    const id = this.thesisWork?.preliminaryDraftData?.proposalData?.director?.id;
    return this.formService.getMemberName(id) || 'No asignado';
  }
  getCodirectorName(): string {
    return this.formService.getMemberName(
      this.thesisWork?.preliminaryDraftData?.proposalData?.codirector?.id
    );
  }
  getAdvisorName(): string {
    return this.formService.getMemberName(
      this.thesisWork?.preliminaryDraftData?.proposalData?.advisor?.id
    );
  }

  isFieldInvalid(fieldName: keyof typeof this.evaluationForm.controls): boolean {
    const control = this.evaluationForm.controls[fieldName];
    return !!(control?.invalid && control?.touched);
  }

  // ── Manejo de archivos de retroalimentación ───────────────────────────────
  handleFeedbackUploaded(event: { fileName: string; file: File }): void {
    this.uploadedFeedbackFiles.update(files => [...files, event]);
    this.isFeedbackModalOpen.set(false);
  }

  removeFeedbackFile(index: number): void {
    this.uploadedFeedbackFiles.update(files => files.filter((_, i) => i !== index));
  }

  // ── Envío ─────────────────────────────────────────────────────────────────
  submit(): void {
    if (this.evaluationForm.invalid) {
      this.evaluationForm.markAllAsTouched();
      return;
    }
    const values = this.evaluationForm.getRawValue();
    this.onSaveEvaluation.emit({
      formValues: {
        result:   values.result as AdvanceEvaluationResult,
        comments: values.comments
      },
      files: this.uploadedFeedbackFiles().map(f => f.file)
    });
  }
}
