import { Component, EventEmitter, inject, Input, OnChanges, Output, signal, SimpleChanges } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { ReadonlyFieldComponent } from '../../../../shared/components/readonly-field/readonly-field.component';
import { EvaluateAdvanceFormService, MAX_REVIEW_COMMENTS } from './services/evaluate-advance-form.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { Advance } from '../../interfaces/advance.interface';
import { SubmitAdvanceEvaluationPayload } from '../../interfaces/advance-playload.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { FormattedDocument } from '../../../../core/interfaces/formatted-document.interface';
import { Evaluation } from '../../../../core/interfaces/evaluation.interface';
import { ProposalContentFieldsComponent } from '../../../../shared/components/proposal-content-fields/proposal-content-fields.component';

/**
 * Revisión de un informe mensual: muestra el informe y las revisiones ya
 * registradas, y permite al revisor dejar sus observaciones y/o un PDF de notas.
 * La revisión no cambia el estado del trabajo (es una formalidad).
 */
@Component({
  selector: 'app-evaluate-advance-form',
  imports: [ProposalContentFieldsComponent, DatePipe, NgClass, ReactiveFormsModule, ButtonComponent, FileUploadModalComponent, InfoBannerComponent, ReadonlyFieldComponent],
  providers: [EvaluateAdvanceFormService],
  templateUrl: './evaluate-advance-form.component.html',
  styleUrls: ['./evaluate-advance-form.component.css']
})
export class EvaluateAdvanceFormComponent implements OnChanges {
  protected readonly formService = inject(EvaluateAdvanceFormService);
  protected readonly maxComments = MAX_REVIEW_COMMENTS;

  @Input({ required: true }) advanceData!: Advance;
  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;
  /** true si el usuario ya revisó este informe (solo una revisión por revisor) */
  @Input() alreadyEvaluated = false;
  @Output() onBack = new EventEmitter<void>();
  @Output() onSaveEvaluation  = new EventEmitter<SubmitAdvanceEvaluationPayload>();
  @Output() onDownloadAdvance = new EventEmitter<FileDocument>();
  @Output() onDownloadNotes = new EventEmitter<FormattedDocument>();

  readonly notesFile = signal<{ fileName: string; file: File } | null>(null);
  readonly isFeedbackModalOpen = signal(false);

  get evaluationForm() { return this.formService.evaluationForm; }
  get isReadOnly(): boolean { return this.alreadyEvaluated; }
  get advanceDocuments() { return this.advanceData.documents ?? []; }
  /** Revisiones ya registradas de este informe. */
  get reviews(): Evaluation[] {
    return (this.thesisWork.evaluations ?? []).filter(evaluation => evaluation.advanceId === this.advanceData.id);
  }

  getStudentNames(): string { return this.formService.getStudentNames(this.thesisWork); }
  getDirectorName(): string { return this.formService.getDirectorName(this.thesisWork); }
  getCodirectorName(): string { return this.formService.getCodirectorName(this.thesisWork); }
  getAdvisorName(): string { return this.formService.getAdvisorName(this.thesisWork); }

  isFieldInvalid(fieldName: keyof typeof this.evaluationForm.controls): boolean {
    const control = this.evaluationForm.controls[fieldName];
    return !!(control?.invalid && control?.touched);
  }

  handleFeedbackUploaded(event: { fileName: string; file: File }): void {
    this.notesFile.set(event);
    this.isFeedbackModalOpen.set(false);
  }

  removeFeedbackFile(): void {
    this.notesFile.set(null);
  }

  submit(): void {
    if (this.evaluationForm.invalid) {
      this.evaluationForm.markAllAsTouched();
      return;
    }
    const comments = this.evaluationForm.getRawValue().comments;
    const notes = this.notesFile()?.file ?? null;
    if (!comments.trim() && !notes) {
      this.formService.notifyEmptyReview();
      return;
    }
    this.onSaveEvaluation.emit({ comments, notes });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['alreadyEvaluated']) {
      this.isReadOnly ? this.evaluationForm.disable() : this.evaluationForm.enable();
    }
  }
}
