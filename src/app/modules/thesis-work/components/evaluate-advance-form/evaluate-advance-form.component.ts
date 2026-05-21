import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { stateList } from '../../../../core/enums/state.enum';
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { FileUploadModalComponent } from "../../../../shared/components/modals/file-upload-modal/file-upload-modal.component";
import { Advance } from '../../interfaces/thesis-work.interface';

// Importaciones de tus interfaces reales

@Component({
  selector: 'app-evaluate-advance-form',
  templateUrl: './evaluate-advance-form.component.html',
  styleUrls: ['./evaluate-advance-form.component.css'],
  imports: [ReactiveFormsModule, ButtonComponent, FileUploadModalComponent]
})
export class EvaluateAdvanceFormComponent {
  private readonly fb = inject(FormBuilder);

  // Usamos tus interfaces nativas directas
  @Input({ required: true }) advanceData!: Advance;
  @Input({ required: true }) thesisWorkTitle!: string;
  @Input() isSubmitting = false;

  @Output() onBack = new EventEmitter<void>();
  @Output() onSaveEvaluation = new EventEmitter<{ formValues: any, file?: File }>();
  @Output() onDownloadAdvance = new EventEmitter<void>();

  // Manejo de archivo opcional de correcciones/anotaciones
  uploadedFeedbackFile = signal<{ fileName: string; file: File } | null>(null);
  isFeedbackModalOpen = signal(false);

  readonly evaluationForm = this.fb.group({
    result: ['', Validators.required],
    comments: ['', Validators.required]
  });

  get isReadOnly(): boolean {
    return this.advanceData.status === stateList.EVALUADO;
  }

  // Obtiene el documento principal cargado por el estudiante usando la interfaz genérica
  get currentDocument() {
    const docs = this.advanceData.documents || [];
    if (docs.length === 0) return null;
    return docs[0];
  }

  get advanceDocuments() {
    return this.advanceData.documents || [];
  }

  handleFeedbackUploaded(event: { fileName: string; file: File }): void {
    this.uploadedFeedbackFile.set(event);
    this.isFeedbackModalOpen.set(false);
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.evaluationForm.get(fieldName);
    return !!(control?.invalid && control?.touched);
  }

  submit(): void {
    if (this.evaluationForm.invalid) {
      this.evaluationForm.markAllAsTouched();
      return;
    }

    const feedbackData = this.uploadedFeedbackFile();

    this.onSaveEvaluation.emit({
      formValues: this.evaluationForm.value,
      file: feedbackData ? feedbackData.file : undefined // Opcional
    });
  }
}
